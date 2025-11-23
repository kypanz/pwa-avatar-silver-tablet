import { useEffect, useRef, useState } from "react";
import type { StartAvatarResponse } from "@heygen/streaming-avatar";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents, TaskType, VoiceEmotion,
} from "@heygen/streaming-avatar";
import { useMemoizedFn, usePrevious } from "ahooks";
import InteractiveAvatarTextInput from "../InteractiveAvatarTextInput/InteractiveAvatarTextInput";
import { AVATARS } from "../../utils/constants/constants";
import { Badge, Button } from "keep-react";
import { endpoints } from "../../utils/endpoints/endpoints";

interface IConversation {
  configuration: {
    "_id": string;
    "user_id": string;
    "device_id": string;
    "assistant_id": string;
    "style_avatar": string;
    "createdAt": string;
    "updatedAt": string;
    "__v": number;
  },
}

export default function Conversation({ configuration }: IConversation) {
  AVATARS[0].name = 'Default Avatar Style';

  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState<MediaStream>();

  const [knowledgeId] = useState<string>("");
  const [voiceCheck, setVoiceCheck] = useState<boolean>(false);

  const [_data, setData] = useState<StartAvatarResponse>();
  const [text, setText] = useState<string>("");
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);
  const [chatMode, setChatMode] = useState("text_mode");
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [isEnableTalk, setIsEnableTalk] = useState(false);

  async function fetchAccessToken() {
    try {
      const response = await fetch(endpoints.getAvatarToken, {
        method: "GET",
      });
      const token = await response.text();
      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
    }
    return "";
  }

  async function startSession() {
    setIsLoadingSession(true);
    const newToken = await fetchAccessToken();

    avatar.current = new StreamingAvatar({
      token: newToken,
    });
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      console.log("Avatar started talking", e);
    });
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log("Avatar stopped talking", e);
    });
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log("Stream disconnected");
      endSession();
      setIsEnableTalk(false);
    });
    avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
      console.log(">>>>> Stream ready:", event.detail);
      setStream(event.detail);
    });
    avatar.current?.on(StreamingEvents.USER_START, (event) => {
      console.log(">>>>> User started talking:", event);
      setIsUserTalking(true);
    });
    avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
      console.log(">>>>> User stopped talking:", event);
      setIsUserTalking(false);
    });

    await handleSpeak();

    try {
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: (configuration.style_avatar == 'no-data') ? '' : configuration.style_avatar,
        knowledgeId: knowledgeId, // Or use a custom `knowledgeBase`.
        voice: {
          rate: 1.5,
          emotion: VoiceEmotion.EXCITED,
        },
        language: 'es',
      });
      setData(res);
      setChatMode('text_mode');
      setIsEnableTalk(true);
    } catch (error) {
      console.error("Error starting avatar session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  }

  useEffect(() => {
    startSession();
    console.log('Inicializado!');
  }, []);

  const speak = async ({ message }: { message: string }): Promise<void> => {
    if (!avatar.current) {
      console.error('Avatar reference is not set');
      return;
    }
    return avatar.current.speak({ text: message, task_type: TaskType.REPEAT }).catch((e) => {
      console.error(e.message);
    });
  };

  async function handleSpeak() {
    try {
      setIsLoadingRepeat(true);
      if (!avatar.current) {
        return console.log('avatar.current => ', avatar.current);
      }
      (window as any).MAIQ = speak;
      setVoiceCheck(true);
      setIsLoadingRepeat(false);
      console.log('Avatar voice enabled.');
    } catch (error) {
      console.log('[ Error on auto enable voice ] => ', error);
    }
  }

  async function handleInterrupt() {
    if (!avatar.current) {
      return;
    }
    await avatar.current.interrupt().catch((e) => {
      console.error(e.message);
    });
  }

  async function endSession() {
    await avatar.current?.stopAvatar();
    setStream(undefined);
    setVoiceCheck(false);
  }

  const handleChangeChatMode = useMemoizedFn(async (v) => {
    if (v === chatMode) {
      return;
    }
    if (v === "text_mode") {
      avatar.current?.closeVoiceChat();
    } else {
      await avatar.current?.startVoiceChat();
    }
    setChatMode(v);
  });

  const previousText = usePrevious(text);
  useEffect(() => {
    if (!previousText && text) {
      avatar.current?.startListening();
    } else if (previousText && !text) {
      avatar?.current?.stopListening();
    }
  }, [text, previousText]);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
      };
    }
  }, [mediaStream, stream]);

  const renderChatOption = ({ option }: { option: string }) => {
    if (option == 'old') {
      return (
        <div className="w-full flex relative">
          <InteractiveAvatarTextInput
            disabled={!stream}
            input={text}
            label="Chat"
            loading={isLoadingRepeat}
            placeholder="Type something for the avatar to respond"
            setInput={setText}
            onSubmit={handleSpeak}
          />
          {text && (
            <Badge className="absolute right-16 top-3">Listening</Badge>
          )}
        </div>
      );
    }
    return (
      <div>
        <p className="hidden bottom-0"> Estado de la voz del avatar : {(voiceCheck) ? 'Habilitada' : 'Deshabilitada'} </p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black">
      {stream ? (
        <div className="relative w-full h-full">
          <video
            ref={mediaStream}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          >
            <track kind="captions" />
          </video>
          
          {/* Controls overlay */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {/* Top status bar */}
            {isUserTalking && (
              <div className="w-full p-4 flex justify-end">
                <Badge className="bg-green-500 text-white pointer-events-auto">
                  Listening
                </Badge>
              </div>
            )}
            
            {/* Bottom controls bar */}
            <div className="w-full p-4 flex justify-between items-end pointer-events-none">
              {/* Voice status */}
              {isEnableTalk && renderChatOption({ option: 'new' })}
              
              {/* Control buttons */}
              <div className="flex gap-2 pointer-events-auto">
                <Button
                  className="bg-black/50 hover:bg-black text-white px-4 py-2 rounded-lg transition-colors"
                  size="md"
                  onClick={handleInterrupt}
                >
                  Interrumpir
                </Button>
                <Button
                  className="bg-black/50 hover:bg-black text-white px-4 py-2 rounded-lg transition-colors"
                  size="md"
                  onClick={endSession}
                >
                  Finalizar
                </Button>
              </div>
            </div>
          </div>

          {/* Botón para cambiar entre modos de chat */}
          <div className="absolute bottom-4 left-4 pointer-events-auto">
            <Button
              className="bg-black/50 hidden hover:bg-black text-white px-4 py-2 rounded-lg transition-colors"
              size="md"
              onClick={() => handleChangeChatMode(chatMode === "text_mode" ? "voice_mode" : "text_mode")}
            >
              {chatMode === "text_mode" ? "Activar voz" : "Activar texto"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white text-xl">
          {isLoadingSession ? 'Iniciando...' : 'Esperando stream...'}
        </div>
      )}
    </div>
  );
}