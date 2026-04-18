import React, { useState, useRef, useEffect, useCallback } from 'react';
import { socketService } from '../utils/socketService';
import './MicrophoneChat.css';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * MicrophoneChat — WebRTC voice chat for a radio frequency room.
 * Works for both hosts and listeners.
 *
 * Props:
 *  - frequency: string
 *  - userName: string
 *  - userRole: 'host' | 'listener'
 */
export const MicrophoneChat = ({ frequency, userName, userRole }) => {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeSpeakers, setActiveSpeakers] = useState([]); // [{ socketId, userName }]
  const [micPermission, setMicPermission] = useState('idle'); // 'idle' | 'granted' | 'denied' | 'loading' | 'no-device' | 'insecure'
  const [micErrorMsg, setMicErrorMsg] = useState('');
  const [volume, setVolume] = useState(100);
  const [speakingAmplitude, setSpeakingAmplitude] = useState(0);

  // WebRTC peers: Map<socketId, RTCPeerConnection>
  const peerConnections = useRef(new Map());
  // Outgoing stream from local mic
  const localStream = useRef(null);
  // Audio analyser for visual feedback
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  // Remote audio elements: Map<socketId, HTMLAudioElement>
  const remoteAudios = useRef(new Map());

  // ── Amplitude animation ─────────────────────────────────────────────────
  const startAmplitudeTracking = useCallback((stream) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;

      const tick = () => {
        const buf = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        setSpeakingAmplitude(Math.min(100, avg * 2));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (_) {}
  }, []);

  const stopAmplitudeTracking = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setSpeakingAmplitude(0);
    analyserRef.current = null;
  }, []);

  // ── Create peer connection to a remote socket ────────────────────────────
  const createPeerConnection = useCallback(
    (remoteSocketId, isInitiator) => {
      if (peerConnections.current.has(remoteSocketId)) {
        return peerConnections.current.get(remoteSocketId);
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current.set(remoteSocketId, pc);

      // Add local tracks to this peer connection
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStream.current);
        });
      }

      // ICE candidates
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socketService.sendIceCandidate(remoteSocketId, e.candidate);
        }
      };

      // Remote audio track received
      pc.ontrack = (e) => {
        let audio = remoteAudios.current.get(remoteSocketId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          remoteAudios.current.set(remoteSocketId, audio);
        }
        audio.srcObject = e.streams[0];
        audio.volume = volume / 100;
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed' ||
          pc.connectionState === 'disconnected'
        ) {
          pc.close();
          peerConnections.current.delete(remoteSocketId);
          const audio = remoteAudios.current.get(remoteSocketId);
          if (audio) {
            audio.srcObject = null;
            remoteAudios.current.delete(remoteSocketId);
          }
        }
      };

      if (isInitiator) {
        // Create and send offer
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            socketService.sendVoiceOffer(
              remoteSocketId,
              pc.localDescription,
              userName
            );
          })
          .catch(console.error);
      }

      return pc;
    },
    [userName, volume]
  );

  // ── Close peer connection to a socket ────────────────────────────────────
  const closePeerConnection = useCallback((remoteSocketId) => {
    const pc = peerConnections.current.get(remoteSocketId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(remoteSocketId);
    }
    const audio = remoteAudios.current.get(remoteSocketId);
    if (audio) {
      audio.srcObject = null;
      remoteAudios.current.delete(remoteSocketId);
    }
  }, []);

  // ── Close all peer connections ────────────────────────────────────────────
  const closeAllPeerConnections = useCallback(() => {
    peerConnections.current.forEach((_, sid) => closePeerConnection(sid));
  }, [closePeerConnection]);

  // ── Turn mic ON ──────────────────────────────────────────────────────────
  const startMic = useCallback(async () => {
    if (isMicOn) return;

    // ── Check HTTPS (mobile browsers block mic over plain HTTP) ──
    const isSecure =
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isSecure) {
      setMicPermission('insecure');
      setMicErrorMsg(
        'Microphone requires a secure connection (HTTPS). Ask the host to enable HTTPS, or open the site via localhost.'
      );
      return;
    }

    // ── Check API availability ──
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicPermission('no-device');
      setMicErrorMsg(
        'Your browser does not support microphone access. Try Chrome or Safari on a modern device.'
      );
      return;
    }

    setMicPermission('loading');
    setMicErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
        video: false,
      });
      localStream.current = stream;
      setMicPermission('granted');
      setMicErrorMsg('');
      setIsMicOn(true);

      // Broadcast to room
      socketService.micStart(frequency, userName, socketService.getSocketId());
      // Amplitude tracking
      startAmplitudeTracking(stream);
    } catch (err) {
      console.error('Mic error:', err.name, err.message);

      // Detect specific error types for actionable messages
      if (
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError'
      ) {
        setMicPermission('denied');
        setMicErrorMsg(
          'Mic permission was blocked. In your browser, tap the 🔒 lock icon (or go to Site Settings) and allow Microphone, then tap the mic button again.'
        );
      } else if (
        err.name === 'NotFoundError' ||
        err.name === 'DevicesNotFoundError'
      ) {
        setMicPermission('no-device');
        setMicErrorMsg(
          'No microphone found on this device. Please connect a microphone and try again.'
        );
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setMicPermission('denied');
        setMicErrorMsg(
          'Microphone is in use by another app. Close other apps using the mic and try again.'
        );
      } else if (err.name === 'OverconstrainedError') {
        setMicPermission('denied');
        setMicErrorMsg('Microphone constraints not satisfied. Try again.');
      } else if (err.name === 'SecurityError') {
        setMicPermission('insecure');
        setMicErrorMsg(
          'Blocked by browser security. This feature requires HTTPS. Contact the host to enable a secure connection.'
        );
      } else {
        setMicPermission('denied');
        setMicErrorMsg(`Microphone error: ${err.message || err.name}. Try refreshing.`);
      }
    }
  }, [isMicOn, frequency, userName, startAmplitudeTracking]);

  // ── Turn mic OFF ─────────────────────────────────────────────────────────
  const stopMic = useCallback(() => {
    if (!isMicOn) return;
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    closeAllPeerConnections();
    socketService.micStop(frequency, userName);
    stopAmplitudeTracking();
    setIsMicOn(false);
    setIsMuted(false);
    setMicPermission('idle');
    setMicErrorMsg('');
  }, [isMicOn, frequency, userName, closeAllPeerConnections, stopAmplitudeTracking]);

  // ── Toggle mute (keeps stream alive, just mutes tracks) ─────────────────
  const toggleMute = useCallback(() => {
    if (!localStream.current) return;
    const newMuted = !isMuted;
    localStream.current.getAudioTracks().forEach((t) => {
      t.enabled = !newMuted;
    });
    setIsMuted(newMuted);
  }, [isMuted]);

  // ── Volume change for remote audio ────────────────────────────────────────
  const handleVolumeChange = useCallback((e) => {
    const v = Number(e.target.value);
    setVolume(v);
    remoteAudios.current.forEach((audio) => {
      audio.volume = v / 100;
    });
  }, []);

  // ── Socket event handlers ────────────────────────────────────────────────
  useEffect(() => {
    // Another user started their mic: initiate WebRTC as offerer if WE are mic-on
    const handleVoiceUserStarted = ({ socketId, userName: remoteName }) => {
      setActiveSpeakers((prev) => {
        if (prev.find((s) => s.socketId === socketId)) return prev;
        return [...prev, { socketId, userName: remoteName }];
      });

      // If we're currently broadcasting, establish connection to the new speaker too
      if (localStream.current) {
        createPeerConnection(socketId, true);
      }
    };

    const handleVoiceUserStopped = ({ socketId }) => {
      setActiveSpeakers((prev) => prev.filter((s) => s.socketId !== socketId));
      closePeerConnection(socketId);
    };

    // We received an offer from a speaker → answer it
    const handleVoiceOffer = async ({ fromSocketId, offer, userName: remoteName }) => {
      setActiveSpeakers((prev) => {
        if (prev.find((s) => s.socketId === fromSocketId)) return prev;
        return [...prev, { socketId: fromSocketId, userName: remoteName }];
      });

      const pc = createPeerConnection(fromSocketId, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketService.sendVoiceAnswer(fromSocketId, pc.localDescription);
      } catch (err) {
        console.error('Answer error:', err);
      }
    };

    // We received an answer → complete our side
    const handleVoiceAnswer = async ({ fromSocketId, answer }) => {
      const pc = peerConnections.current.get(fromSocketId);
      if (pc && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('Set remote desc error:', err);
        }
      }
    };

    // ICE candidate relayed
    const handleIceCandidate = async ({ fromSocketId, candidate }) => {
      const pc = peerConnections.current.get(fromSocketId);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('ICE candidate error:', err);
        }
      }
    };

    socketService.onVoiceUserStarted(handleVoiceUserStarted);
    socketService.onVoiceUserStopped(handleVoiceUserStopped);
    socketService.onVoiceOffer(handleVoiceOffer);
    socketService.onVoiceAnswer(handleVoiceAnswer);
    socketService.onVoiceIceCandidate(handleIceCandidate);

    return () => {
      socketService.offVoiceEvents();
    };
  }, [createPeerConnection, closePeerConnection]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (isMicOn) {
        localStream.current?.getTracks().forEach((t) => t.stop());
        socketService.micStop(frequency, userName);
        stopAmplitudeTracking();
      }
      closeAllPeerConnections();
      socketService.offVoiceEvents();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  const ringSize = 40 + speakingAmplitude * 0.6;

  return (
    <div className="mic-chat-container">
      <div className="mic-chat-header">
        <span className="mic-chat-title">🎙️ Voice Chat</span>
        {activeSpeakers.length > 0 && (
          <span className="mic-live-badge">LIVE</span>
        )}
      </div>

      {/* Main mic button */}
      <div className="mic-button-area">
        <div
          className={`mic-ring ${isMicOn && !isMuted ? 'active' : ''}`}
          style={{ width: ringSize, height: ringSize }}
        />
        <button
          id="mic-toggle-btn"
          className={`mic-btn ${isMicOn ? (isMuted ? 'muted' : 'active') : 'inactive'}`}
          onClick={isMicOn ? stopMic : startMic}
          title={isMicOn ? 'Stop Microphone' : 'Start Microphone'}
          disabled={micPermission === 'loading'}
        >
          {micPermission === 'loading' ? (
            <span className="mic-spinner" />
          ) : isMicOn ? (
            isMuted ? '🔇' : '🎤'
          ) : (
            '🎤'
          )}
        </button>
      </div>

      {/* Status text */}
      <div className="mic-status-text">
        {(micPermission === 'denied' || micPermission === 'insecure' || micPermission === 'no-device') && (
          <div className="mic-error-block">
            <span className="mic-denied-icon">
              {micPermission === 'insecure' ? '🔒' : micPermission === 'no-device' ? '🎙️' : '⛔'}
            </span>
            <span className="mic-denied-msg">{micErrorMsg}</span>
            {micPermission === 'denied' && (
              <button
                className="mic-retry-btn"
                onClick={() => {
                  setMicPermission('idle');
                  setMicErrorMsg('');
                }}
              >
                🔄 Try Again
              </button>
            )}
          </div>
        )}
        {micPermission === 'loading' && <span>Requesting mic access...</span>}
        {isMicOn && !isMuted && <span className="mic-on-label">● You are live</span>}
        {isMicOn && isMuted && <span className="mic-muted-label">Muted (mic stream paused)</span>}
        {!isMicOn && micPermission === 'idle' && (
          <span className="mic-off-label">Tap mic to speak</span>
        )}
      </div>

      {/* Mute toggle (visible only when mic is on) */}
      {isMicOn && (
        <button
          id="mic-mute-btn"
          className={`mic-mute-btn ${isMuted ? 'muted' : ''}`}
          onClick={toggleMute}
        >
          {isMuted ? '🔈 Unmute' : '🔇 Mute'}
        </button>
      )}

      {/* Volume slider for incoming voice */}
      <div className="mic-volume-row">
        <span className="mic-volume-label">🔊</span>
        <input
          id="mic-volume-slider"
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleVolumeChange}
          className="mic-volume-slider"
          title="Incoming voice volume"
        />
        <span className="mic-volume-value">{volume}%</span>
      </div>

      {/* Active speakers list */}
      {activeSpeakers.length > 0 && (
        <div className="mic-speakers-list">
          <p className="mic-speakers-title">🔴 Speaking now:</p>
          {activeSpeakers.map((s) => (
            <div key={s.socketId} className="mic-speaker-item">
              <span className="mic-speaker-dot" />
              <span className="mic-speaker-name">{s.userName}</span>
            </div>
          ))}
        </div>
      )}

      {activeSpeakers.length === 0 && !isMicOn && (
        <div className="mic-empty">
          <p>No one is speaking</p>
        </div>
      )}
    </div>
  );
};
