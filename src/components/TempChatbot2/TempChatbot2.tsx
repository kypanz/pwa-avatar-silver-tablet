import { FormEvent, useState, useRef, useEffect } from 'react';
import { Input as TextInput } from "keep-react";
import axios, { AxiosResponse } from 'axios';
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

interface IResponseScheduledTask {
  _id: string;
  user_id: string;
  device_id: string;
  name: string;
  description: string;
  message: string;
  country: 'Argentina'; // o podrías usar un enum si hay más países
  scheduled_time: Date; // Representa la fecha UTC que viene de MongoDB
  is_repetitive: boolean;
  createdAt: Date;
  updatedAt: Date;
}


type ChatbotOption = 'texto' | 'video' | 'real-time-video' | null;

// function normalizeText(text: string): string {
//   return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// }

const TempChatbot2 = ({ globalCurrentText }: { globalCurrentText: any }) => {

  const [hasExecuted, setHasExecuted] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);

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
          runTelegramMessage(response);
        }
      }
    } catch (error) {
      console.error('Error on get telegram messages for this tablet => ', error);
    }
  }

  const runTelegramMessage = async (response: AxiosResponse) => {
    try {

      // Verification 
      if (response.data.message == null) return;
      const telegram_content = response.data.message.content;
      if (!telegram_content) return;
      const telegram_username = response.data.message.name;

      // Setting the payload to create the audio
      const mention = telegram_username + ' dice que : ' + telegram_content;
      const audio_payload = {
        message: mention,
      }

      const audioResponse = await axios.post(endpoints.createAudio, audio_payload, { responseType: 'blob' });
      const audioBlob = new Blob([audioResponse.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioElement = document.getElementById("voice") as HTMLAudioElement;

      if (audioElement) {
        audioElement.src = audioUrl;
        localStorage.setItem('ky-to-say', audioUrl);
      }

      // Updating the chat messages
      setMessages((prev) => {
        const temp: Message[] = [...prev];
        temp.push({ name: name_chatbot, message: mention } as Message);
        return temp;
      });

    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    setInterval(() => {
      checkTelegramMessages();
    }, 5000);
  }, []);


  const [globalTasks, setGlobalTasks] = useState<IResponseScheduledTask[]>([]);
  let test_global_task: IResponseScheduledTask[] = [];

  console.log('globalTask => ', globalTasks); // TODO : use this global task later to render the tasks on the avatar screen

  // Create the storage to handle tasks
  if (!localStorage.getItem('isSpeakingTask')) {
    localStorage.setItem('isSpeakingTask', 'false');
    const test = localStorage.getItem('isSpeakingTask');
    console.log('renderizando => ', test);
  }

  // Function to check Telegram messages 
  const checkSchedulesMessages = async () => {
    try {
      const device_id = localStorage.getItem('mayiq-device-id');
      if (device_id) {
        const payload = { device_id: device_id };
        const response = await axios.get(endpoints.getDeviceScheduleTask, { params: payload });
        if (response.status == 200) {
          test_global_task = response.data.message;
          setGlobalTasks(response.data.message);
        }
      }
    } catch (error) {
      console.error('Error on get telegram messages for this tablet => ', error);
    }
  }

  const removeScheduledTask = async ({ task_id }: { task_id: string }) => {
    try {
      const payload = { scheduled_task_id: task_id }
      const response = await axios.post(endpoints.deleteDeviceScheduleTask, payload);
      if (response.status == 200) {
        console.log(response.data.message);
      }
    } catch (error) {
      console.error(error);
    }
  }

  const prepareScheduledTimes = async () => {
    try {

      if (test_global_task.length == 0) {
        await new Promise((resolve, reject) => {
          try {
            setTimeout(() => { resolve(true) }, 1000);
          } catch (error) {
            console.error(error);
            reject(true);
          }
        });
        console.log('Sin datos por ahora ...');
        await prepareScheduledTimes();
      }

      test_global_task.sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
      const nextTask = test_global_task[0];

      if (nextTask) {
        const scheduledTime = new Date(nextTask.scheduled_time);
        const currentTimeInArgentina = getCurrentTimeInTimeZone('America/Argentina/Buenos_Aires');

        if (currentTimeInArgentina.getTime() >= scheduledTime.getTime()) {

          const isSpeakingTask = localStorage.getItem('isSpeakingTask');
          if (isSpeakingTask == 'true') {
            console.log('El personaje aún está hablando!');
          } else {
            console.log('🛎️ ¡Hora de lanzar la alarma!');
            localStorage.setItem('isSpeakingTask', 'true');
            test_global_task.shift();
            await removeScheduledTask({ task_id: nextTask._id });
            await runScheduledMessage({ message: nextTask.message });
          }
        }
      }
      await new Promise((resolve, reject) => {
        try {
          setTimeout(() => { resolve(true) }, 1000);
        } catch (error) {
          console.error(error);
          reject(true);
        }
      });
      await prepareScheduledTimes();
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    prepareScheduledTimes();
  }, []);

  const getCurrentTimeInTimeZone = (timeZone: string): Date => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(new Date());
    const lookup: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== 'literal') {
        lookup[part.type] = part.value;
      }
    }

    // construye string en formato ISO compatible
    const localISOString = `${lookup.year}-${lookup.month}-${lookup.day}T${lookup.hour}:${lookup.minute}:${lookup.second}`;
    return new Date(localISOString);
  };

  // const convertToTimeSelected = ({ date_utc }: { date_utc: Date }) => {
  //   try {
  //
  //     const utcDate = new Date(date_utc);
  //
  //     const countryToTimezone = {
  //       Argentina: 'America/Argentina/Buenos_Aires',
  //       España: 'Europe/Madrid',
  //       México: 'America/Mexico_City',
  //       // agrega más según necesidad
  //     };
  //
  //     const userSelectedCountry = 'Argentina';
  //     const timeZone = countryToTimezone[userSelectedCountry];
  //     const localTime = new Date(utcDate.toLocaleString('en-US', { timeZone }));
  //     return localTime;
  //
  //   } catch (error) {
  //     console.error(error);
  //   }
  // }

  const runScheduledMessage = async ({ message }: { message: string }) => {
    try {

      // Verification 
      if (message == null) return;
      if (!message) return;

      // Setting the payload to create the audio
      const mention = 'Hey! recuerda que tienes una tarea programada, la tarea es : ' + message;
      const audio_payload = {
        message: mention,
      }

      const audioResponse = await axios.post(endpoints.createAudio, audio_payload, { responseType: 'blob' });
      const audioBlob = new Blob([audioResponse.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioElement = document.getElementById("voice") as HTMLAudioElement;

      if (audioElement) {
        audioElement.src = audioUrl;
        localStorage.setItem('ky-to-say', audioUrl);
      }

      // Updating the chat messages
      const msg = '[ Tarea programada ] : ' + mention;
      setMessages((prev) => {
        const temp: Message[] = [...prev];
        temp.push({ name: name_chatbot, message: msg } as Message);
        return temp;
      });

    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    setInterval(() => {
      checkSchedulesMessages();
    }, 1000 * 60);
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

    try {

      if (e) {
        e.preventDefault();
      }

      // Verification
      if (!option) return alert('selecciona la opcion de texto o video');

      // Set Messages
      const temp: Message[] = [...messages];
      temp.push({ name: 'yo', message: (isVoice) ? voiceMSG : message } as Message);
      setMessage('');
      const msg: HTMLElement | null = document.getElementById('input-cognitus-chatbot');
      // if (!msg) return console.error('No se encuetnra input-cognitus-chatbot');
      if (msg) {
        (msg as HTMLInputElement).value = '';
      }
      setIsThinking(true);
      temp.push({
        name: name_chatbot,
        message: '...'
      } as Message);
      setMessages(temp);

      // Request to the backend
      const user_id = localStorage.getItem('user_id');

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

    } catch (error) {

      console.error('Error on sendMessage => ', error);

    }

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
        if (status_thread === 'failed') {
          stopInterval();
          // Send message saying "cant say it again plase"
          setIsThinking(false);
          stopCounterInterval();


          // Adding the request to say it
          const audio_payload = {
            message: 'Me lo puedes repetir por favor ? ...',
          }
          const audioResponse = await axios.post(endpoints.createAudio, audio_payload, { responseType: 'blob' });
          const audioBlob = new Blob([audioResponse.data], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(audioBlob);
          const audioElement = document.getElementById("voice") as HTMLAudioElement;
          if (audioElement) {
            console.log('nuevo mensaje de audio para el avatar !')
            audioElement.src = audioUrl;
            localStorage.setItem('ky-to-say', audioUrl);
            console.log('Window despues de obtener la respuesta => ', window);
            // audioElement.play();
          }


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

        const message_to_render = assistant_messages[0].text.value;
        console.log('Window status => ', window);
        // await (window as any).MAIQ({ message: message_to_render });

        // TODO : Temporal
        if (option === 'real-time-video') {
          if (!session_id) return alert('Asegurate de que iniciaste el streaming');
          backendRequestRepeat({ session_id: session_id, text: message_to_render.slice(0, 950).replace(/\*\*/g, '') });
        }

        console.log('Mensaje respuesta => ', message_to_render);

        // This is gonna be the new messages
        setMessages((prev) => {
          const temp: Message[] = [...prev];
          temp.pop();
          if (assistant_messages) {
            temp.push({ name: name_chatbot, message: message_to_render } as Message);
            setHasExecuted(false);
          }
          return temp;
        });

        // Adding the request to say it
        const audio_payload = {
          message: message_to_render,
        }
        const audioResponse = await axios.post(endpoints.createAudio, audio_payload, { responseType: 'blob' });
        const audioBlob = new Blob([audioResponse.data], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audioElement = document.getElementById("voice") as HTMLAudioElement;
        if (audioElement) {
          console.log('nuevo mensaje de audio para el avatar !')
          audioElement.src = audioUrl;
          localStorage.setItem('ky-to-say', audioUrl);
          console.log('Window despues de obtener la respuesta => ', window);
          // audioElement.play();
        }

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


export default TempChatbot2;

