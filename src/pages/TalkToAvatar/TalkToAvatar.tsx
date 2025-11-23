import { useEffect, useState } from 'react'
// import Conversation from '../../components/Conversation/Conversation'
import { endpoints } from '../../utils/endpoints/endpoints';
import axios from 'axios';
import { Button } from 'keep-react';
import SpeechAvatar from '../../components/SpeechAvatar/SpeechAvatar'
import Avatar2DComponent from '../../components/Avatar2DComponent/Avatar2DComponent';
import TempChatbot2 from '../../components/TempChatbot2/TempChatbot2';

export default function TalkToAvatar() {

  const [enabled, setEnabled] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState('');
  const [configurationData, setConfigurationData] = useState();
  const [statusInit, setStatusInit] = useState(false);
  // const [showSpeechAvatar, setShowSpeechAvatar] = useState(true); // Estado para alternar

  // Check current tablet configuration 
  const checkDevice = () => {
    try {
      // const device_id = undefined;
      const check_id = localStorage.getItem('mayiq-device-id');
      if (check_id) {
        // device_id = check_id;
        // console.log('valor actual device_id => ', device_id);
        setEnabled(true);
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    checkDevice();
  }, []);

  const changeStorageDeviceId = () => {
    try {
      localStorage.setItem('mayiq-device-id', currentDeviceId);
      setEnabled(true);
    } catch (error) {
      console.error(error);
    }
  }

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
      }
    } catch (error) {
      console.error(error);
    }
  }

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

  const [globalCurrentText, setGlobalCurrentText] = useState('');

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
          {configurationData && (
            <Avatar2DComponent />
          )}

          {/*configurationData && (
            <div className="">
              <Conversation configuration={configurationData} />
            </div>
          )*/}

          {/* Botón de alternancia */}
          {/* <div className="fixed bottom-8 left-4 flex items-center justify-center">
            <Button
              className="bg-blue-500 text-xl hover:bg-blue-600 text-white font-bold py-3 px-3 rounded-full shadow-lg flex items-center space-x-2"
              onClick={() => setShowSpeechAvatar(!showSpeechAvatar)}
            >
              {showSpeechAvatar ? (
                <>

                  <span>Cambiar a Chat</span>
                </>
              ) : (
                <>

                  <span>Cambiar a Voz</span>
                </>
              )}
            </Button>
          </div>
        */}

          {/* Mostrar SpeechAvatar y TempChatbot2 para el envio de mensajes ( para compartir funcionalidades ) */}
          <div className="fixed bottom-8 left-4">
            <SpeechAvatar setGlobalCurrentText={setGlobalCurrentText} />
          </div>
          <div className="fixed bottom-8 right-4">
            <TempChatbot2 globalCurrentText={globalCurrentText} />
          </div>

          {/* Mostrar SpeechAvatar o TempChatbot2 según el estado */}
          {/*showSpeechAvatar ? (
            <div className="fixed bottom-8 right-4">
              <SpeechAvatar setGlobalCurrentText={setGlobalCurrentText} />
            </div>
          ) : (
            <div className="fixed bottom-8 right-4">
              <TempChatbot2 globalCurrentText={globalCurrentText} />
            </div>
          )*/}
        </div>
      )}
    </div>
  );
}
