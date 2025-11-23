import { useState } from 'react';
import { ResultReason } from 'microsoft-cognitiveservices-speech-sdk';
import { getTokenOrRefresh } from '../../utils/token_util/token_util';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';
import { Button } from 'keep-react';

export default function SpeechAvatar({ setGlobalCurrentText }: { setGlobalCurrentText: any }) {
  const [displayText, setDisplayText] = useState('Inicializado: Listo para probar...');
  const [isListening, setIsListening] = useState(false); // Estado para saber si el micrófono está activo

  async function sttFromMic() {
    const tokenObj = await getTokenOrRefresh();
    const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(
      tokenObj.authToken,
      tokenObj.region,
    );
    speechConfig.speechRecognitionLanguage = 'es-Es';

    const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);

    setDisplayText('Ahora puedes hablarle...');
    setIsListening(true); // Indicar que el micrófono está activo

    recognizer.recognizeOnceAsync((result) => {
      setIsListening(false); // Desactivar el estado de escucha
      if (result.reason === ResultReason.RecognizedSpeech) {
        setDisplayText(`Lo hablado a texto: ${result.text}`);
        setGlobalCurrentText(result.text);
        // Aquí puedes hacer una solicitud al backend si es necesario
      } else {
        setDisplayText(
          'ERROR: El habla fue cancelada o no fue reconocida. ',
        );
      }
    });
  }

  return (
    <div className="flex items-center justify-center p-2 bg-white rounded-lg shadow-md">
      {/* Botón para habilitar el micrófono */}
      <Button
        className={`flex items-center justify-center text-white font-semibold py-3 px-6 rounded-full shadow-lg transition-all duration-300 ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
          }`}
        onClick={sttFromMic}
        disabled={isListening} // Deshabilitar el botón mientras se escucha
      >
        {isListening ? (
          <>
            <svg
              fill="currentColor"
              viewBox="0 0 1920 1920"
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
            >
              <path
                d="M960.315 96.818c-186.858 0-338.862 152.003-338.862 338.861v484.088c0 186.858 152.004 338.862 338.862 338.862 186.858 0 338.861-152.004 338.861-338.862V435.68c0-186.858-152.003-338.861-338.861-338.861M427.818 709.983V943.41c0 293.551 238.946 532.497 532.497 532.497 293.55 0 532.496-238.946 532.496-532.497V709.983h96.818V943.41c0 330.707-256.438 602.668-580.9 627.471l-.006 252.301h242.044V1920H669.862v-96.818h242.043l-.004-252.3C587.438 1546.077 331 1274.116 331 943.41V709.983h96.818ZM960.315 0c240.204 0 435.679 195.475 435.679 435.68v484.087c0 240.205-195.475 435.68-435.68 435.68-240.204 0-435.679-195.475-435.679-435.68V435.68C524.635 195.475 720.11 0 960.315 0Z"
                fillRule="evenodd"
              />
            </svg>
            Escuchando...
          </>
        ) : (
          <svg
            fill="currentColor"
            viewBox="0 0 1920 1920"
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
          >
            <path
              d="M960.315 96.818c-186.858 0-338.862 152.003-338.862 338.861v484.088c0 186.858 152.004 338.862 338.862 338.862 186.858 0 338.861-152.004 338.861-338.862V435.68c0-186.858-152.003-338.861-338.861-338.861M427.818 709.983V943.41c0 293.551 238.946 532.497 532.497 532.497 293.55 0 532.496-238.946 532.496-532.497V709.983h96.818V943.41c0 330.707-256.438 602.668-580.9 627.471l-.006 252.301h242.044V1920H669.862v-96.818h242.043l-.004-252.3C587.438 1546.077 331 1274.116 331 943.41V709.983h96.818ZM960.315 0c240.204 0 435.679 195.475 435.679 435.68v484.087c0 240.205-195.475 435.68-435.68 435.68-240.204 0-435.679-195.475-435.679-435.68V435.68C524.635 195.475 720.11 0 960.315 0Z"
              fillRule="evenodd"
            />
          </svg>

        )}
      </Button>

      {/* Texto de estado */}
      <div className=" px-3 text-center max-w-md">
        <code className="text-gray-700 text-sm">{displayText}</code>
      </div>
    </div>
  );
}
