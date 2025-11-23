import { FormEvent, useState, useRef, useEffect } from 'react';
import { Input as TextInput } from "keep-react";
import axios from 'axios';
import { endpoints } from '../../utils/endpoints/endpoints';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { IVideoGenerated, setInteraction, setVideo } from '../../redux/handlerVideoSlice/handlerVideoSlice';
import { backendRequestRepeat } from '../MyIqBot/MyIqBot';
import Markdown from 'react-markdown'


// Interfaces 
interface Message {
  id: number;
  name: string;
  message: string;
  image: string;
  is_video?: boolean;
  is_error?: boolean;
}

export interface IResponseChatbot {
  role: string;
  content: IResponseChatbotMessage[]
}

interface IResponseChatbotMessage {
  role: string;
  text: {
    value: string;
  }
}

interface IRequestGetMessages {
  thread_id: string;
  option: string;
  is_chatting: boolean;
}

type ChatbotOption = 'texto' | 'video' | 'real-time-video' | null;

// async function checkIfIsRequestScheduled(message: string) {
//   try {
//     const mw = [
//       'Especialista-Cardiología',
//       'Especialista-Neurología',
//       'Especialista-Pediatría',
//       'Especialista-Endocrinología',
//       'Especialista-Dermatología'
//     ]
//     const message_normalized = normalizeText(message);
//     const match_words = mw.map(normalizeText);
//     let is_request = false;
//     const response = match_words.find((word) => message_normalized.toLowerCase().includes(word.toLowerCase()));
//     if (response) {
//       is_request = true;
//     }
//     return is_request;
//   } catch (error) {
//     console.error('[ checkIfIsRequestScheduled | error ] => ', error);
//   }
// }

// function normalizeText(text: string): string {
//   return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// }

const TempChatbot = ({ globalCurrentText }: { globalCurrentText: any }) => {

  const [hasExecuted, setHasExecuted] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false); // Estado para mostrar/ocultar el chat
  // console.log('globalCurrentText => ', globalCurrentText);

  useEffect(() => {
    if (!hasExecuted && globalCurrentText && globalCurrentText != '') {
      console.log('se corre la funcion');
      setHasExecuted(true);
      setMessage(globalCurrentText);
      sendMessage(undefined, true, globalCurrentText);
    }
  }, [globalCurrentText]);

  // Custom Request 
  const name_chatbot = 'AvatarIQ';
  const default_initial_message = `Hola, soy ${name_chatbot}, ¿En qué puedo ayudarte hoy?`;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { name: name_chatbot, message: default_initial_message } as Message
  ]);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [option] = useState<ChatbotOption>('texto');
  const tempRunId = useRef<string | null>(null);
  const tempThreadId = useRef<string | null>(null);
  const intervalId = useRef<NodeJS.Timeout | number | null>(null);
  const intervalCounter = useRef<NodeJS.Timeout | number>(0);
  const [counterWaiting, setCounterWaiting] = useState(0);

  const dispatch = useDispatch();
  const video_generated: IVideoGenerated = useSelector((state: RootState) => state.handler_video);
  const session_id = useSelector((state: RootState) => state.handler_video.live_session_id);

  // console.log('SID => ', session_id);


  useEffect(() => {
    if (video_generated.url != null && video_generated.interaction_status == true) {
      setIsThinking(false);
      stopCounterInterval();
      setMessages((prev) => {
        const temp: Message[] = [...prev];
        temp.pop(); // This remove the last message seneded for "waiting" the response
        temp.push({
          name: name_chatbot,
          message: video_generated.url,
          is_video: true,
          is_error: video_generated.is_error
        } as Message);
        return temp;
      });
      dispatch(setVideo({ url: null, interaction_status: false }));
    }
  }, [video_generated.url, video_generated.interaction_status])


  // Function to check Telegram messages 
  const checkTelegramMessages = async () => {
    try {
      const device_id = localStorage.getItem('mayiq-device-id');
      if (device_id) {
        const payload = { device_id: device_id };
        const response = await axios.post(endpoints.getTelegramMessages, payload);
        if (response.status == 200) {
          if (response.data.message == null) return;
          if (response.data.message.content) {
            console.log('Session actual => ', session_id);
            const telegram_content = response.data.message.content;
            if (!session_id) return console.log('No existe sesion, sesion actual');
            console.log('Transmitiendo mensaje por voz a la session => ', session_id);
            backendRequestRepeat({
              session_id: session_id,
              text: 'El mensaje de telegram dice : ' + telegram_content
            });
            console.log('mensaje => ', telegram_content);
            const msg = '[ TELEGRAM ] : ' + telegram_content;
            // This is gonna be the new messages
            setMessages((prev) => {
              const temp: Message[] = [...prev];
              temp.push({ name: name_chatbot, message: msg } as Message);
              return temp;
            });
            console.log('nuevos messages => ', messages);
          }
        }
      }
    } catch (error) {
      console.error('Error on get telegram messages for this tablet => ', error);
    }
  }

  useEffect(() => {
    setInterval(() => {
      checkTelegramMessages();
    }, 5000);
  }, []);


  // scroll effect
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e?: FormEvent<HTMLFormElement>, isVoice?: boolean, voiceMSG?: string) => {
    if (e) {
      e.preventDefault();
    }

    if (!option) return alert('selecciona la opcion de texto o video');
    const temp: Message[] = [...messages];
    if (isVoice && voiceMSG) {
      temp.push({ name: 'yo', message: voiceMSG } as Message);
    } else {
      temp.push({ name: 'yo', message: message } as Message);
    }
    setMessage('');
    const msg: HTMLElement | null = document.getElementById('input-cognitus-chatbot');
    if (msg) {
      (msg as HTMLInputElement).value = '';
    }
    setIsThinking(true);
    temp.push({ name: name_chatbot, message: '...' } as Message); // pensando
    setMessages(temp);
    const user_id = localStorage.getItem('user_id');
    // to the request to the backend
    if (!tempThreadId.current) {
      const thread_id = await createNewThread();
      const payload = {
        message: (isVoice) ? voiceMSG : message,
        thread_id: thread_id,
        option: option,
        user_id: user_id
      }
      const response = await axios.post(endpoints.question, payload);
      const run_id = response.data.response.id;
      tempRunId.current = run_id;
    } else {
      const payload = {
        message: (isVoice) ? voiceMSG : message,
        thread_id: tempThreadId.current,
        option: option,
        user_id: user_id
      }
      const response = await axios.post(endpoints.question, payload);
      const run_id = response.data.response.id;
      tempRunId.current = run_id;

    }
    startCounterInterval();
    startInterval();
    dispatch(setInteraction({ url: '', interaction_status: true }));
  }

  const checkStatusThread = async () => {
    try {
      if (tempThreadId.current && tempRunId.current) {
        const payload = {
          run_id: tempRunId.current,
          thread_id: tempThreadId.current
        }
        const response = await axios.get(endpoints.checkThread, { params: payload });
        const status_thread = response.data.message.status;
        if (status_thread === 'completed') {
          stopInterval();
          getMessages();
          if (option == 'texto' || option == 'real-time-video') {
            setIsThinking(false);
            stopCounterInterval();
          }
          tempRunId.current = null; // this is for waiting a new run id
        }
      }
    } catch (error) {
      console.error('[ messages chatbot ] => ', error);
    }
  }

  const getMessages = async () => {
    try {
      if (tempThreadId.current) {
        const payload: IRequestGetMessages = {
          thread_id: tempThreadId.current,
          option: (option as string),
          is_chatting: true
        }
        const response = await axios.get(endpoints.getThreadMessages, { params: payload });
        const data = response.data.message.data;
        const assistant_messages: IResponseChatbotMessage[] = [];
        data.forEach((element: IResponseChatbot) => {
          if (element.role === 'assistant') {
            assistant_messages.push(element.content[0]);
          }
        });

        const last_message = assistant_messages[assistant_messages.length - 1];
        if (last_message.text.value == 'generando-video') {
          return;
        }

        // let message_to_render: string;
        // const r = await checkIfIsRequestScheduled(assistant_messages[0].text.value); // current last message from assistant
        // if (r) {
        //   message_to_render = 'Se ha enviado una solicitud correctamente a un especialista verifica en tus agendados el estado de la solicitud.';
        //   setIsThinking(true);
        // } else {
        //   message_to_render = assistant_messages[0].text.value;
        //   await (window as any).MAIQ({ message: message_to_render });
        // }

        const message_to_render = assistant_messages[0].text.value;
        await (window as any).MAIQ({ message: message_to_render });

        console.log('Opcion actual => ', option);

        // TODO : Temporal
        if (option === 'real-time-video') {
          if (!session_id) return alert('Asegurate de que iniciaste el streaming');
          backendRequestRepeat({ session_id: session_id, text: message_to_render.slice(0, 950).replace(/\*\*/g, '') });
        }

        // This is gonna be the new messages
        setMessages((prev) => {
          const temp: Message[] = [...prev];
          temp.pop();
          if (assistant_messages) {
            temp.push({ name: name_chatbot, message: message_to_render } as Message);
            // Testing 
            setHasExecuted(false);
          }
          return temp;
        });

      }
    } catch (error) {
      console.error('[ messages chatbot ] => ', error);
    }
  }

  const createNewThread = async () => {
    try {
      const response = await axios.post(endpoints.createThread, {});
      if (response.status == 200) {
        tempThreadId.current = response.data.thread_id;
        return response.data.thread_id;
      }
    } catch (error) {
      console.error(error);
    }
  }

  const startCounterInterval = () => {
    if (!intervalCounter.current) {
      const id_counter_interval = setInterval(() => setCounterWaiting((prev) => prev + 1), 1000);
      intervalCounter.current = id_counter_interval;
    }
  }

  const stopCounterInterval = () => {
    if (intervalCounter.current && typeof intervalCounter.current === 'number') {
      clearInterval(intervalCounter.current);
      intervalCounter.current = 0;
      setCounterWaiting(0);
    }
  }

  const startInterval = () => {
    if (!intervalId.current) {
      const id = setInterval(checkStatusThread, 1000);
      intervalId.current = id;
    }
  }

  const stopInterval = () => {
    if (intervalId.current && typeof intervalId.current === 'number') {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
  }

  const renderContador = () => {
    return (
      <div className='bg-black text-white p-2 inline-block rounded text-sm'>
        {(counterWaiting) ? 'pensando ... ' + counterWaiting + 's' : null}
      </div>
    )
  }

  const renderMessages = () => {
    if (messages.length == 0) return;
    return messages.map((cont: Message, index: number) => {
      if (cont.is_video && !cont.is_error) {
        return (
          <div className="flex" key={index}>
            <div className="p-2 m-5 rounded bg-white shadow-lg space-y-2">
              <p className="text-sm font-bold italic"> {cont.name} </p>
              <video src={cont.message} controls></video>
            </div>
          </div>
        );
      } else {
        let style_output_msg = 'bg-gray-100 text-black';
        let msg_pos = 'w-full';
        if (cont.name.toLowerCase() == 'yo') {
          style_output_msg = 'bg-blue-500 text-white';
          msg_pos = 'float-end';
        }
        return (
          <div className={`flex items-center ${msg_pos}`} key={index}>
            {cont.name.toLowerCase() == 'microbiobot' ? (
              <img src="/image/logo_chatbot.png" className="w-[70px] h-[80px]" />
            ) : null}
            <div className={`px-5 py-2 m-5 rounded shadow-lg space-y-2 ${style_output_msg}`}>
              <p className="text-sm font-bold italic"> {cont.name} </p>
              <p>
                {new Array(cont.message).map((mensaje, index) => (
                  <Markdown key={index}>{mensaje}</Markdown>
                ))}
              </p>
              {index === messages.length - 1 && counterWaiting ? renderContador() : null}
            </div>
          </div>
        );
      }
    });
  };

  return (
    <div className="fixed bottom-8 right-4">
      {/* Botón para mostrar/ocultar el chat */}
      <button
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full text-xl shadow-lg mb-2"
        onClick={() => setIsChatVisible(!isChatVisible)}
      >
        {isChatVisible ? 'X' :
          (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </>
          )}
      </button>

      {/* Contenedor del chat */}
      {isChatVisible && (
        <div className="w-96 bg-white rounded-lg shadow-lg">
          <div className="p-4">
            <h1 className="text-lg font-bold mb-4">Chat</h1>
            <div className="h-64 overflow-y-auto mb-4" ref={containerRef}>
              {renderMessages()}
            </div>
            <form onSubmit={sendMessage}>
              <div className="flex space-x-2">
                <TextInput
                  id="input-cognitus-chatbot"
                  placeholder="Mensaje a enviar ..."
                  color="gray"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isThinking}
                  className="w-full"
                />
                <button
                  type="submit"
                  disabled={isThinking}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                >
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


export default TempChatbot;

