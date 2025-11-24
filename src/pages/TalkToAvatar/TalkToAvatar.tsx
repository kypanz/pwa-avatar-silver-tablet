import { useEffect, useState } from 'react'
// import Conversation from '../../components/Conversation/Conversation'
import { endpoints } from '../../utils/endpoints/endpoints';
import axios from 'axios';
import { Button } from 'keep-react';
// import SpeechAvatar from '../../components/SpeechAvatar/SpeechAvatar'
// import Avatar2DComponent from '../../components/Avatar2DComponent/Avatar2DComponent';
// import TempChatbot2 from '../../components/TempChatbot2/TempChatbot2';
import AvatarStreaming from '../../components/AvatarStreaming/AvatarStreaming'

export default function TalkToAvatar() {

  const [enabled, setEnabled] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState('');
  const [configurationData, setConfigurationData] = useState();
  const [statusInit, setStatusInit] = useState(false);

  // Check current tablet configuration 
  const checkDevice = () => {
    try {
      const check_id = localStorage.getItem('mayiq-device-id');
      if (check_id) {
        setEnabled(true);
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    checkDevice();
  }, []);

  // Current device id handler
  const changeStorageDeviceId = () => {
    try {
      localStorage.setItem('mayiq-device-id', currentDeviceId);
      setEnabled(true);
    } catch (error) {
      console.error(error);
    }
  }

  const [portModelAvatar, setPortModelAvatar] = useState("");
  const syncModel = async ({
    avatar_name,
    avatar_model_name,
    avatar_instructions,
    avatar_voice
  }:{
    avatar_name : string,
    avatar_model_name : string,
    avatar_instructions : string,
    avatar_voice : string
  }) => {
    try {
    const payload = {
      model_id: avatar_model_name,
      avatar_name:  avatar_name.split("AVATAR_")[1],
      avatar_instructions: avatar_instructions,
      avatar_voice: avatar_voice
    }
    const response = await axios.post(endpoints.initModelAvatar, payload, {withCredentials : true});
    if(response.status == 200) {
      setPortModelAvatar(response.data.port)
    }
    console.log("response syncModel => ", response);
    } catch (error) {
      console.log(error);
    }
  }


  // Request to get the device id 
  const getDeviceConfig = async ({ device_id }: { device_id: string }) => {
    try {
      if (!device_id) return
      const payload = {
        device_id: device_id
      }
      const response = await axios.post(endpoints.getDeviceConfigurations, payload);
      if (response.status == 200) {
        setConfigurationData(response.data.message);
        localStorage.setItem('user_id', response.data.message.user_id);
        setEnabled(true);
        setStatusInit(true);
        const _data = response.data.message;
        await syncModel({
          avatar_name : _data.avatar_name,
    avatar_model_name : _data.style_avatar,
    avatar_instructions : _data.avatar_instructions,
    avatar_voice : _data.avatar_voice
        })
      }
    } catch (error) {
      console.error(error);
    }
  }

  // First Time Connection to get the device id
  const setDeviceId = async () => {
    try {
      if (!currentDeviceId) return alert('Debes ingresar el codigo de sincronizacion');
      const payload = {
        device_id: currentDeviceId
      }
      const response = await axios.post(endpoints.getDeviceConfigurations, payload);
      if (response.status == 200) {
        alert('Conexion realizada correctamente');
        setConfigurationData(response.data.message);
        localStorage.setItem('user_id', response.data.message.user_id);
        changeStorageDeviceId();
        console.log('Datos de configuracion obtenida => ', response.data.message);
      }
    } catch (error) {
      console.error(error);
      alert('Problema al configurar el dispositivo')
    }
  }

  // const [globalCurrentText, setGlobalCurrentText] = useState('');



    const [isGameActive, setIsGameActive] = useState(false);
  const getStatusGame = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_APP_AVATAR}:${portModelAvatar}/game/status`);
      if(response.status == 200) {
        const game_status = (response.data.status == "active") ? true : false;
        console.log("estado del juego : ", game_status);
        setIsGameActive(game_status);
      }
    } catch (error) {
      console.error("Error on get status game => ", error);
    }
  }

  useEffect(() => {
    // llamada inicial
    getStatusGame();

    // intervalo cada 5 segundos
    const intervalId = setInterval(() => {
      getStatusGame();
    }, 5000);

    // cleanup cuando se desmonta el componente
    return () => clearInterval(intervalId);
  }, [portModelAvatar]);

  const RenderGame = () => {
    return(
      <>
      {/* @ts-ignore */}
      <iframe src="https://h5p.org/h5p/embed/707" width="1090" height="1294" frameborder="0" allowfullscreen="allowfullscreen" allow="geolocation *; microphone *; camera *; midi *; encrypted-media *" title="Memory Game"></iframe><script src="https://h5p.org/sites/all/modules/h5p/library/js/h5p-resizer.js" charset="UTF-8"></script>
      </>
    )
  }


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 text-blue-900 ">
      {/* Estado de conexión */}
      {!statusInit && (
        <p className="mb-6 text-2xl font-bold">
          Estado de conexión:
          <span className={enabled ? 'text-green-500' : 'text-red-500'}>
            {enabled ? ' Dispositivo sincronizado' : ' Dispositivo no sincronizado'}
          </span>
        </p>
      )}

      {/* Título principal */}
      {!statusInit && (
        <h1 className="text-5xl font-bold mb-8 text-center text-blue-900">Habla con tu avatar</h1>
      )}

      {/* Paso 1: Campo de entrada y botón "Sincronizar" */}
      {!enabled && (
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-blue-200">
          <input
            className="w-full p-4 mb-6 text-xl rounded bg-white text-blue-900 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200"
            placeholder="Código de conexión"
            onChange={(e) => setCurrentDeviceId(e.target.value)}
          />
          <Button className="w-full text-xl bg-blue-500 hover:bg-blue-600 text-white" onClick={setDeviceId}>
            Sincronizar
          </Button>
        </div>
      )}

      {/* Paso 2: Botón "Iniciar" */}
      {enabled && !statusInit && (
        <div className="py-8">
          <Button
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-6 px-8 rounded-full text-2xl shadow-lg"
            onClick={() => {
              const device_id = localStorage.getItem('mayiq-device-id');
              getDeviceConfig({ device_id: (device_id as string) });
            }}
          >
            Iniciar
          </Button>
        </div>
      )}

      {/* Paso 3: Chat y video (se muestra solo después de iniciar) */}
      {statusInit && (
        <div className="w-full h-full">

          {/* Conversation ocupa toda la pantalla */}
          {(configurationData && portModelAvatar ) && (
            <>
            {(isGameActive) ? <RenderGame /> : null}
            <AvatarStreaming port={portModelAvatar} /> 
            {/*<Avatar2DComponent />*/}
            </>
          )}

          {/* Mostrar SpeechAvatar y TempChatbot2 para el envio de mensajes ( para compartir funcionalidades ) */}
          {/*
          <div className="fixed bottom-8 left-4">
            <SpeechAvatar setGlobalCurrentText={setGlobalCurrentText} />
          </div>
          <div className="fixed bottom-8 right-4">
            <TempChatbot2 globalCurrentText={globalCurrentText} />
          </div>
      */}
        </div>
      )}
    </div>
  );
}
