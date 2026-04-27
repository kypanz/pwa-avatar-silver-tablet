import { useEffect, useState, useRef } from "react";

import { endpoints } from "../../utils/endpoints/endpoints";
import axios from "axios";
import { Button } from "keep-react";

import AvatarStreaming from "../../components/AvatarStreaming/AvatarStreaming";

export default function TalkToAvatar() {
  // Para las tareas
  const processedTasksRef = useRef<Set<string>>(new Set());

  const [currentBrowser, setCurrentBrowser] = useState("no detectado");
  const userAgent = navigator.userAgent.toLowerCase();

  let browserName = "unknown";

  if (
    userAgent.includes("chrome") &&
    !userAgent.includes("edg") &&
    !userAgent.includes("opr")
  ) {
    browserName = "chrome";
  } else if (userAgent.includes("samsungbrowser")) {
    browserName = "samsung";
  } else if (userAgent.includes("firefox")) {
    browserName = "firefox";
  } else if (userAgent.includes("safari") && !userAgent.includes("chrome")) {
    browserName = "safari";
  }

  useEffect(() => {
    setCurrentBrowser(browserName);
  }, []);

  const [enabled, setEnabled] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState("");
  const [configurationData, setConfigurationData] = useState();
  const [statusInit, setStatusInit] = useState(false);

  // Check current tablet configuration
  const checkDevice = () => {
    try {
      const check_id = localStorage.getItem("mayiq-device-id");
      if (check_id) {
        setEnabled(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    checkDevice();
  }, []);

  // Current device id handler
  const changeStorageDeviceId = () => {
    try {
      localStorage.setItem("mayiq-device-id", currentDeviceId);
      setEnabled(true);
    } catch (error) {
      console.error(error);
    }
  };

  const [portModelAvatar, setPortModelAvatar] = useState("");
  const syncModel = async ({
    avatar_name,
    avatar_model_name,
    avatar_instructions,
    avatar_voice,
    device_code,
  }: {
    avatar_name: string;
    avatar_model_name: string;
    avatar_instructions: string;
    avatar_voice: string;
    device_code: string;
  }) => {
    try {
      const payload = {
        model_id: avatar_model_name,
        avatar_name: avatar_name.split("AVATAR_")[1],
        avatar_instructions: avatar_instructions,
        avatar_voice: avatar_voice,
        device_code: device_code,
      };
      const response = await axios.post(endpoints.initModelAvatar, payload, {
        withCredentials: true,
      });
      if (response.status == 200) {
        setPortModelAvatar(response.data.port);
      }
      console.log("response syncModel => ", response);
    } catch (error) {
      console.log(error);
    }
  };

  // Request to get the device id
  const getDeviceConfig = async ({ device_id }: { device_id: string }) => {
    try {
      if (!device_id) return;
      const payload = {
        device_id: device_id,
      };
      const response = await axios.post(
        endpoints.getDeviceConfigurations,
        payload,
      );
      if (response.status == 200) {
        setConfigurationData(response.data.message);
        localStorage.setItem("user_id", response.data.message.user_id);
        setEnabled(true);
        // setStatusInit(true); // This is enabled to render the Avatar section
        const _data = response.data.message;
        await syncModel({
          avatar_name: _data.avatar_name,
          avatar_model_name: _data.style_avatar,
          avatar_instructions: _data.avatar_instructions,
          avatar_voice: _data.avatar_voice,
          device_code: device_id,
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  // First Time Connection to get the device id
  const setDeviceId = async () => {
    try {
      if (!currentDeviceId)
        return alert("Debes ingresar el codigo de sincronizacion");
      const payload = {
        device_id: currentDeviceId,
      };
      const response = await axios.post(
        endpoints.getDeviceConfigurations,
        payload,
      );
      if (response.status == 200) {
        alert("Conexion realizada correctamente");
        setConfigurationData(response.data.message);
        localStorage.setItem("user_id", response.data.message.user_id);
        changeStorageDeviceId();
        console.log(
          "Datos de configuracion obtenida => ",
          response.data.message,
        );
      }
    } catch (error) {
      console.error(error);
      alert("Problema al configurar el dispositivo");
    }
  };

  // const [globalCurrentText, setGlobalCurrentText] = useState('');

  let isShowed = false;
  const [isLoading, setIsLoading] = useState(false);

  const [isGameActive, setIsGameActive] = useState(false);
  const getStatusGame = async () => {
    try {
      const response = await axios.get(
        `https://p${portModelAvatar}${import.meta.env.VITE_APP_AVATAR}/game/status`,
      );
      if (response.status == 200) {
        const game_status = response.data.status == "active" ? true : false;
        // console.log("estado del juego : ", game_status);
        setIsGameActive(game_status);
        if (isShowed == false) {
          setStatusInit(true);
          isShowed = true;
        }
      }
    } catch (error) {
      console.error("Error on get status game => ", error);
    }
  };

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

  // Added by Kyp4nz
  // const [messageToSay, setMessageToSay] = useState("");
  const [messageQueue, setMessageQueue] = useState<
    { id: string; text: string }[]
  >([]);
  const checkScheduledMessages = async () => {
    try {
      const device_id = localStorage.getItem("mayiq-device-id");
      if (device_id) {
        const payload = { device_id: device_id };
        const response = await axios.post(
          endpoints.getTelegramMessages,
          payload,
        );
        if (response.status == 200) {
          if (response.data.message == null) {
            // console.log("No hay tareas programadas por ahora.");
            return;
          }

          if (response.data.message) {
            const tasks = response.data.message;

            if (tasks.length > 0) {
              const now = Date.now();

              const newTasks = tasks.filter((t: any) => {
                // ya leída o ya procesada
                if (t.is_readed || processedTasksRef.current.has(t._id))
                  return false;

                // sin fecha programada → ignorar
                if (!t.scheduled_time) return false;

                const taskTime = new Date(t.scheduled_time).getTime();

                // si la fecha es inválida → ignorar
                if (isNaN(taskTime)) return false;

                // 🔥 solo permitir tareas cuyo tiempo ya llegó
                return taskTime <= now;
              });

              if (newTasks.length === 0) return;

              // marcar como procesadas en frontend
              newTasks.forEach((t: any) => {
                processedTasksRef.current.add(t._id);
              });

              const formattedTasks = newTasks.map((t: any) => ({
                id: t._id,
                text: "Tienes un recordatorio, recuerda que " + t.message,
              }));

              setMessageQueue((prev) => [...prev, ...formattedTasks]);

              try {
                // (opcional: aquí podrías marcar como leídas en backend)
              } catch (err) {
                console.error("Error marcando tarea como leída", err);
              }
            }
          }

          // if (response.data.message) {
          //   const tasks = response.data.message;
          //   // const msg = "[ Recordatorio ] : " + content_message;
          //   // console.log("recoo => ", msg);
          //   if (tasks.length > 0) {
          //     const newTasks = tasks.filter(
          //       (t: any) =>
          //         !t.is_readed && !processedTasksRef.current.has(t._id),
          //     );
          //
          //     if (newTasks.length === 0) return;
          //
          //     // marcar como procesadas en frontend
          //     newTasks.forEach((t: any) => {
          //       processedTasksRef.current.add(t._id);
          //     });
          //
          //     const formattedTasks = newTasks.map((t: any) => ({
          //       id: t._id,
          //       text: "Tienes un recordatorio, recuerda que " + t.message,
          //     }));
          //
          //     setMessageQueue((prev) => [...prev, ...formattedTasks]);
          //
          //     try {
          //     } catch (err) {
          //       console.error("Error marcando tarea como leída", err);
          //     }
          //   }
          // }
        }
      }
    } catch (error) {
      console.error(
        "Error on get telegram messages for this tablet => ",
        error,
      );
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      checkScheduledMessages();
    }, 5000);

    return () => clearInterval(interval);

    // setInterval(() => {
    //   checkScheduledMessages();
    // }, 5000);
  }, []);

  // End added

  const RenderGame = () => {
    return (
      <>
        {/* @ts-ignore */}
        <iframe
          src="https://h5p.org/h5p/embed/707"
          width="1090"
          height="1294"
          frameBorder="0"
          allowFullScreen
          allow="geolocation *; microphone *; camera *; midi *; encrypted-media *"
          title="Memory Game"
        ></iframe>
        {/* @ts-ignore */}
        <script
          src="https://h5p.org/sites/all/modules/h5p/library/js/h5p-resizer.js"
          charSet="UTF-8"
        ></script>
      </>
    );
  };

  console.log(currentBrowser);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 text-blue-900 ">
      {/* Para verificar el navegador actual del dispositivo */}
      {/* <h1 style={{fontSize:'25px', color:"orange"}}>Navegador actual : {navigator.userAgent.toLowerCase()} </h1> */}

      {/* Estado de conexión */}
      {!statusInit && (
        <p className="mb-6 text-2xl font-bold">
          Estado de conexión:
          <span className={enabled ? "text-green-500" : "text-red-500"}>
            {enabled
              ? " Dispositivo sincronizado"
              : " Dispositivo no sincronizado"}
          </span>
        </p>
      )}

      {/* Título principal */}
      {!statusInit && (
        <h1 className="text-5xl font-bold mb-8 text-center text-blue-900">
          Habla con tu avatar
        </h1>
      )}

      {/* Paso 1: Campo de entrada y botón "Sincronizar" */}
      {!enabled && (
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-blue-200">
          <input
            className="w-full p-4 mb-6 text-xl rounded bg-white text-blue-900 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200"
            placeholder="Código de conexión"
            onChange={(e) => setCurrentDeviceId(e.target.value)}
          />
          <Button
            className="w-full text-xl bg-blue-500 hover:bg-blue-600 text-white"
            onClick={setDeviceId}
          >
            Sincronizar
          </Button>
        </div>
      )}

      {/* Paso 2: Botón "Iniciar" */}
      {enabled && !statusInit && (
        <>
          <div className="py-8">
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-6 px-8 rounded-full text-2xl shadow-lg"
              onClick={() => {
                setIsLoading(true);
                const device_id = localStorage.getItem("mayiq-device-id");
                getDeviceConfig({ device_id: device_id as string });
              }}
              disabled={isLoading}
            >
              {isLoading ? "Iniciando por favor espere ..." : "Iniciar"}
            </Button>
          </div>

          <div className="flex items-center justify-center my-6 gap-3">
            <div className="w-16 h-px bg-gray-300"></div>
            <span className="text-sm text-gray-500">o</span>
            <div className="w-16 h-px bg-gray-300"></div>
          </div>

          <p className="pb-4"> ¿ Quieres sincronizar con otro avatar ? </p>
          <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-blue-200">
            <input
              className="w-full p-4 mb-6 text-xl rounded bg-white text-blue-900 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200"
              placeholder="Código de conexión"
              onChange={(e) => setCurrentDeviceId(e.target.value)}
            />
            <Button
              className="w-full text-xl bg-blue-500 hover:bg-blue-600 text-white"
              onClick={setDeviceId}
            >
              Sincronizar
            </Button>
          </div>
        </>
      )}

      {/* Paso 3: Chat y video (se muestra solo después de iniciar) */}
      {statusInit && (
        <div className="w-full h-full">
          {/* Conversation ocupa toda la pantalla */}
          {configurationData && portModelAvatar && (
            <>
              {isGameActive ? <RenderGame /> : null}
              <AvatarStreaming
                port={portModelAvatar}
                messageQueue={messageQueue}
                setMessageQueue={setMessageQueue}
                // messageToSay={messageToSay}
                // setMessageToSay={setMessageToSay}
              />
              {/*<Avatar2DComponent />*/}
            </>
          )}
        </div>
      )}
    </div>
  );
}
