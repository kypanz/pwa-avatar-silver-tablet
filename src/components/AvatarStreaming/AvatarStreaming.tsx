// AvatarStreaming.tsx
import React, { useEffect, useRef, useState } from 'react';
import './AvatarStreaming.css';

type ChatMsg = { sender: string; text: string; type: 'user' | 'system' };

export default function AvatarStreaming({port} : {port: String}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const lastFinalTranscriptRef = useRef<string>('');

  const [sessionId, setSessionId] = useState<number>(0);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [useStun] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "tts">("chat");

  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { sender: 'Sistema', text: 'Bienvenido, haz clic en "Conectar" para iniciar.', type: 'system' }
  ]);
  const [chatInput, setChatInput] = useState('');
  // const [videoSize, setVideoSize] = useState<number>(100);

  // Grabación local / indicadores
  const [isRecording, setIsRecording] = useState(false);
  // const [recButtonDisabled, setRecButtonDisabled] = useState(false);

  // ---- Helpers ----
  const addChatMessage = (text: string, type: 'user' | 'system' = 'user') => {
    const sender = type === 'user' ? 'Tú' : 'Sistema';
    setChatMessages((prev) => [...prev, { sender, text, type }]);
  };

  useEffect(() => {
    // cleanup on unmount
    return () => {
      if (pcRef.current) pcRef.current.close();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      try {
        if (recognitionRef.current) recognitionRef.current.stop();
      } catch { }
    };
  }, []);

  useEffect(() => {
    // auto-scroll chat container if needed
    const el = document.querySelector('.asr-container');
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages]);

  // ---------------------------
  // WebRTC negotiation (tu código original integrado)
  // ---------------------------
  const negotiate = async (pcInstance: RTCPeerConnection) => {
    pcInstance.addTransceiver('video', { direction: 'recvonly' });
    pcInstance.addTransceiver('audio', { direction: 'recvonly' });

    await pcInstance.setLocalDescription(await pcInstance.createOffer());

    // wait for ICE gathering complete
    await new Promise<void>((resolve) => {
      if (pcInstance.iceGatheringState === 'complete') {
        resolve();
      } else {
        const check = () => {
          if (pcInstance.iceGatheringState === 'complete') {
            pcInstance.removeEventListener('icegatheringstatechange', check);
            resolve();
          }
        };
        pcInstance.addEventListener('icegatheringstatechange', check);
      }
    });

    const offer = pcInstance.localDescription!;
    const response = await fetch(`https://localhost:${port}/offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sdp: offer.sdp, type: offer.type })
    });

    const answer = await response.json();
    // backend returns answer SDP + sessionid
    if (answer.sessionid !== undefined) {
      setSessionId(Number(answer.sessionid));
    }
    // set remote description (assume answer has sdp & type)
    await pcInstance.setRemoteDescription({ type: answer.type, sdp: answer.sdp });
    setConnected(true);
    setConnecting(false);
  };

  const start = async () => {
    setConnecting(true);
    const config: RTCConfiguration | any = { sdpSemantics: 'unified-plan' };
    if (useStun) config.iceServers = [{ urls: ['stun:stun.l.google.com:19302'] }];

    const pcInstance = new RTCPeerConnection(config);

    pcInstance.ontrack = (evt) => {
      if (evt.track.kind === 'video' && videoRef.current) {
        videoRef.current.srcObject = evt.streams[0];
      } else if (evt.track.kind === 'audio' && audioRef.current) {
        audioRef.current.srcObject = evt.streams[0];
      }
    };

    pcInstance.onconnectionstatechange = () => {
      // opcional: reflejar cambios de estado
      if (pcInstance.connectionState === 'disconnected' || pcInstance.connectionState === 'failed' || pcInstance.connectionState === 'closed') {
        setConnected(false);
      }
    };

    pcRef.current = pcInstance;

    negotiate(pcInstance).catch((err) => {
      console.error('Error en negociación:', err);
      setConnecting(false);
      addChatMessage('Error al negociar WebRTC: ' + err.toString(), 'system');
    });
  };

  const stop = () => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        console.error("error al detener la conversacion");
      }
      pcRef.current = null;
    }
    setConnected(false);
    setConnecting(false);
  };

  // ---------------------------
  // /human (chat) y /human (echo/tts)
  // ---------------------------
  const sendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    // mostrar mensaje del usuario
    addChatMessage(text, 'user');
    setChatInput('');

    try {
      await fetch(`https://localhost:${port}/human`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          type: 'chat',
          interrupt: true,
          sessionid: Number(sessionId)
        })
      });
      // opcional: backend puede enviar respuesta por otro canal (streaming TTS)
    } catch (err) {
      console.error('Error enviando /human chat:', err);
      addChatMessage('Fallo al enviar chat al backend.', 'system');
    }
  };

  const sendEcho = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textEl = document.getElementById('tts-text') as HTMLTextAreaElement | null;
    const text = textEl?.value?.trim() ?? '';
    if (!text) return;

    try {
      await fetch(`https://localhost:${port}/human`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          type: 'echo',
          interrupt: true,
          sessionid: Number(sessionId)
        })
      });
      addChatMessage(`朗读请求 enviada: "${text}"`, 'system');
      if (textEl) textEl.value = '';
    } catch (err) {
      console.error('Error enviando /human echo:', err);
      addChatMessage('Fallo al enviar TTS al backend.', 'system');
    }
  };

  // ---------------------------
  // /record start / stop (grabación backend)
  // ---------------------------
  const startRecordOnServer = async () => {
    try {
      const resp = await fetch(`https://localhost:${port}/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'start_record', sessionid: Number(sessionId) })
      });
      if (resp.ok) {
        // setRecButtonDisabled(true);
        addChatMessage('Grabación iniciada en servidor.', 'system');
      } else {
        console.error('start_record failed', resp.status);
        addChatMessage('No se pudo iniciar la grabación en el servidor.', 'system');
      }
    } catch (err) {
      console.error(err);
      addChatMessage('Error al pedir inicio de grabación al servidor.', 'system');
    }
  };

  const stopRecordOnServer = async () => {
    try {
      const resp = await fetch(`https://localhost:${port}/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'end_record', sessionid: Number(sessionId) })
      });
      if (resp.ok) {
        // setRecButtonDisabled(false);
        addChatMessage('Grabación detenida en servidor.', 'system');
      } else {
        console.error('end_record failed', resp.status);
        addChatMessage('No se pudo detener la grabación en el servidor.', 'system');
      }
    } catch (err) {
      console.error(err);
      addChatMessage('Error al pedir detención de grabación al servidor.', 'system');
    }
  };

  // ---------------------------
  // Local media recorder + SpeechRecognition (press-to-talk)
  // ---------------------------
  const startLocalRecordingAndRecognition = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      mr.onstop = () => {
        // stop tracks
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch { }
      };

      mr.start();
      setIsRecording(true);
      // setRecButtonDisabled(true);

      // start server recording if desired
      startRecordOnServer();

      // SpeechRecognition (if available)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'es-ES'; // mantuve el zh-CN como en tu HTML original (cámbialo si quieres)
        recognitionRef.current = recog;
        lastFinalTranscriptRef.current = '';

        recog.onresult = (event: any) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          if (interim) {
            setChatInput(interim);
          }
          if (final) {
            // guardar la última transcripción final
            lastFinalTranscriptRef.current = final.trim();
            setChatInput(final);
          }
        };

        recog.onerror = (err: any) => {
          console.error('SpeechRecognition error', err);
        };

        try {
          recog.start();
        } catch (err) {
          console.warn('No se pudo iniciar SpeechRecognition', err);
        }
      }
    } catch (err) {
      console.error('No se pudo acceder al micrófono', err);
      addChatMessage('No se pudo acceder al micrófono. Verifica permisos.', 'system');
    }
  };

  const stopLocalRecordingAndRecognition = async () => {
    if (!isRecording) return;

    // stop local media recorder
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch (err) {
      console.warn('Error al detener MediaRecorder', err);
    }

    // stop recognition
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch (err) { }

    setIsRecording(false);

    // stop server recording
    await stopRecordOnServer();

    // small delay to let recognition finalize
    setTimeout(async () => {
      const recognized = (lastFinalTranscriptRef.current && lastFinalTranscriptRef.current.trim()) || chatInput.trim();
      if (recognized) {
        // enviar recognized text to /human
        try {
          await fetch(`https:localhost:${port}/human`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: recognized,
              type: 'chat',
              interrupt: true,
              sessionid: Number(sessionId)
            })
          });
          addChatMessage(recognized, 'user');
          setChatInput('');
          lastFinalTranscriptRef.current = '';
        } catch (err) {
          console.error('Error enviando recognized text', err);
          addChatMessage('Error enviando texto reconocido al servidor.', 'system');
        }
      } else {
        addChatMessage('No se detectó texto en la grabación.', 'system');
      }
    }, 400);
  };

  // Press-to-talk handlers (mouse & touch)
  const handleVoiceStart = (ev?: React.MouseEvent | React.TouchEvent) => {
    ev?.preventDefault();
    startLocalRecordingAndRecognition();
  };
  const handleVoiceEnd = (ev?: React.MouseEvent | React.TouchEvent) => {
    ev?.preventDefault();
    stopLocalRecordingAndRecognition();
  };

  return (
    <div className="dashboard-container">
      {/*<h1 className="text-center mb-4"> Prueba el avatar </h1>*/}

      <div className="row">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <span
                  className={`status-indicator ${connected ? 'status-connected' : connecting ? 'status-connecting' : 'status-disconnected'
                    }`}
                ></span>
                <span>{connected ? 'Conectado' : connecting ? 'Conectando...' : 'Desconectado'}</span>
              </div>
              {/*
<div>
                <label className="form-check-label me-2">
                  <input type="checkbox" checked={useStun} onChange={(e) => setUseStun(e.target.checked)} /> Usar STUN
                </label>
              </div>
*/}
            </div>

            <div className="card-body p-0">
              <div className="video-container">
                <video ref={videoRef} autoPlay playsInline style={{width : "400px"}}></video>
                <audio ref={audioRef} autoPlay></audio>

                <div className={`recording-indicator ${isRecording ? 'active' : ''}`} style={{ display: isRecording ? 'flex' : 'none' }}>
                  <div className="blink"></div>
                  <span>Grabando</span>
                </div>
              </div>

              <div className="controls-container mt-3">
                {!connected && !connecting && (
                  <button className="btn btn-primary me-2" onClick={start}>
                    <i className="bi bi-play-fill"></i> Conectar
                  </button>
                )}
                {(connected || connecting) && (
                  <button className="btn btn-danger" onClick={stop}>
                    <i className="bi bi-stop-fill"></i> Desconectar
                  </button>
                )}
                {/*
                <div className="mt-3 video-size-control">
                  <label htmlFor="video-size-slider" className="form-label">Video size: <span id="video-size-value">{videoSize}%</span></label>
                  <input id="video-size-slider" type="range" className="form-range" min={50} max={150} value={videoSize} onChange={(e) => setVideoSize(Number(e.target.value))} />
                </div>
               
                <div className="mt-3 d-flex gap-2">
                  <button className="btn btn-outline-primary" onClick={startLocalRecordingAndRecognition} disabled={isRecording || recButtonDisabled}>
                    <i className="bi bi-record-fill"></i> Start Local Rec
                  </button>
                  <button className="btn btn-outline-danger" onClick={stopLocalRecordingAndRecognition} disabled={!isRecording}>
                    <i className="bi bi-stop-fill"></i> Stop Local Rec
                  </button>
                </div>
*/}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel: Chat / TTS */}
        <div className="col-lg-4">
          <div className="card">

            <div className="card-header">
              <ul className="nav nav-tabs card-header-tabs" role="tablist">
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === "chat" ? "bg-white text-blue-500" : "bg-white text-black"}`}
                    type="button"
                    onClick={() => {
                      setActiveTab("chat");
                    }}>
                    Modo conversación
                  </button>
                </li>
                {/*              <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === "tts" ? "bg-white text-blue-500" : "bg-white text-black"}`}
                    type="button"
                    onClick={() => {
                      setActiveTab("tts");
                    }}>
                    Modo de lectura en voz alta
                  </button>
                </li>
*/}
              </ul>
            </div>

            <div className="card-body">
              <div className="tab-content">
                {/* Chat Tab */}
                {activeTab === "chat" && (
                  <>
                    <div className="tab-pane fade show active">
                      <div className="asr-container mb-3">
                        {chatMessages.map((m, i) => (
                          <div key={i} className={`asr-text ${m.type === 'user' ? 'user-message' : 'system-message'}`}>
                            {m.sender}: {m.text}
                          </div>
                        ))}
                      </div>

                      <form id="chat-form" onSubmit={sendChat}>
                        <div className="input-group mb-3">
                          <textarea className="form-control" id="chat-message" rows={3} value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ingrese texto..." />
                          <button className="btn btn-primary" type="submit"><i className="bi bi-send"></i> Enviar</button>
                        </div>
                      </form>

                      <div className="voice-record-btn mt-2"
                        onMouseDown={handleVoiceStart}
                        onMouseUp={handleVoiceEnd}
                        onTouchStart={handleVoiceStart}
                        onTouchEnd={handleVoiceEnd}
                        style={{ backgroundColor: isRecording ? '#dc3545' : undefined }}
                        title="Mantén pulsado para hablar"
                      >
                        <i className="bi bi-mic-fill"></i>
                      </div>
                      <div className="voice-record-label">Mantén para hablar — suelta para enviar</div>
                    </div>
                  </>
                )}

                {/* TTS Tab (simple) */}
                {activeTab === "tts" && (
                  <>
                    <div className="tab-pane fade show active mt-3">
                      <form id="echo-form" onSubmit={sendEcho}>
                        <div className="mb-3">
                          <label htmlFor="tts-text" className="form-label">Texto a leer</label>
                          <textarea id="tts-text" className="form-control" rows={6} placeholder="Texto para TTS..."></textarea>
                        </div>
                        <button type="submit" className="btn btn-primary w-100"><i className="bi bi-volume-up"></i> Leer texto</button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div> {/* row */}

      {/* Hidden session id for compatibility */}
      <input type="hidden" id="sessionid" value={sessionId} />
    </div>
  );
}


