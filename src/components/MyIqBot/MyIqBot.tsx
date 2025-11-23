import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { setChatbotLiveSessionId } from '../../redux/handlerVideoSlice/handlerVideoSlice';
import { RootState } from '../../redux/store';
import axios from 'axios';
import { endpoints } from '../../utils/endpoints/endpoints';

interface IMYIQChatbot {
  thinkingCounter: number;
}

interface INewSession {
  quality: string;
  avatar_name: string;
  voice_id: string;
}

interface IICE {
  session_id: string;
  candidate: RTCIceCandidateInit;
}

interface IStopSession {
  session_id: string | null | undefined;
}

interface IRepeat {
  session_id: string | null;
  text: string | null;
}

export async function backendRequestRepeat({ session_id, text }: IRepeat) {
  try {
    const payload = { session_id, text };
    await axios.post(endpoints.avatarRepeat, payload);
  } catch (error) {
    console.error('error al repetir voz con el avatar del chatbot => ', error);
  }
}

export default function MYIQChatbot({ thinkingCounter }: IMYIQChatbot) {

  const dispatch = useDispatch();
  const videoRef = useRef<HTMLVideoElement>(null);
  const session_id = useSelector((state: RootState) => state.handler_video.live_session_id);
  const [output, setOutput] = useState('');


  async function backendRequestNewSession({ quality, avatar_name, voice_id }: INewSession) {
    try {
      const payload = {
        quality: quality,
        avatar_name: avatar_name,
        voice_id: voice_id
      }
      console.log('payload => ', payload);
      const response = await axios.post(endpoints.avatarNewSession, payload);
      if (response.status == 200) {
        return response.data.message;
      }
    } catch (error) {
      console.error('imposible realizar la consulta => ', error);
    }
  }

  async function backendRequestHandleICE({ session_id, candidate }: IICE) {
    try {
      const payload = { session_id: session_id, candidate: candidate };
      await axios.post(endpoints.avatarHandleICE, payload);
    } catch (error) {
      console.error('no es posible obtener el ice => ', error);
    }
  }

  async function backendRequestStopSession({ session_id }: IStopSession) {

    try {

      const payload = { session_id };
      await axios.post(endpoints.avatarStopSession, payload);

    } catch (error) {

      console.error('no es posible parar la sesion del avatar => ', error);

    }

  }

  // --- Chatbot ---
  async function startChatbotAvatar() {

    try {

      // Avatar Configuration
      const sessionInfo = await backendRequestNewSession({
        quality: 'high',
        avatar_name: '',
        voice_id: 'fef785686844404baff0391a67c84c1d'
      });
      const {
        sdp,
        ice_servers2,
        session_id
      } = sessionInfo;
      const peerConnection = new RTCPeerConnection({
        iceServers: ice_servers2
      });

      // Event listeners
      peerConnection.onicecandidate = ({ candidate }) => {
        console.log('Received ICE candidate:', candidate);
        if (candidate) {
          backendRequestHandleICE({
            session_id: session_id,
            candidate: candidate.toJSON()
          });
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log(`ICE connection state changed to: ${peerConnection.iceConnectionState}`)
        setOutput(`estado de conexion cambiada a : ${peerConnection.iceConnectionState}`);
      };

      peerConnection.ontrack = (event) => {
        console.log('Received the track');
        if (event.track.kind === 'audio' || event.track.kind === 'video') {
          console.log('Received track => ', event.streams[0]);
          if (videoRef.current) {
            videoRef.current.srcObject = event.streams[0];
          }
        }
      };

      peerConnection.ondatachannel = (event) => {
        const dataChannel = event.channel;
        dataChannel.onmessage = onMessage;
      };

      const remoteDescription = new RTCSessionDescription(sdp);
      await peerConnection.setRemoteDescription(remoteDescription);

      // Setting the session id of the avatar
      setOutput(`Chat conectado correctamente, ahora puedes comenzar la sesion`);
      dispatch(setChatbotLiveSessionId({ session_id }));
      console.log('Sesion establecida => ', session_id);

    } catch (error) {

      console.error('[ main | error ] =>', error);

    }
  }

  function onMessage(event: { data: unknown; }) {

    try {

      const message = event.data;
      console.log('Received message:', message);

    } catch (error) {

      console.error('onMessage error => ', error);

    }

  }

  useEffect(() => {
    backendRequestStopSession({ session_id: session_id });
  }, []);

  return (
    <div className='m-auto'>
      <p className='text-primary text-center'>
        {(thinkingCounter > 0) ? ' pensando ... ' + thinkingCounter : null}
      </p>
      <p className='text-center text-primary'>
        {output}
      </p>
      <video
        className='m-auto'
        width={400}
        height={400}
        ref={videoRef}
        autoPlay playsInline />
      <div className='space-x-2 mt-5 m-auto text-center text-black'>
        <button
          className='p-2 rounded bg-primary'
          onClick={() => startChatbotAvatar()}>
          Conectar Chatbot
        </button>
        <button
          className='p-2 rounded bg-primary'
          onClick={() => backendRequestStopSession({ session_id: session_id })}>
          Cerrar session
        </button>
      </div>
    </div>
  )
}

