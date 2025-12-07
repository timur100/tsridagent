import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const WebRTCPlayer = ({ streamName, cameraIp, cameraPort, onError }) => {
  const { theme } = useTheme();
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let pc = null;
    let restartTimeout = null;

    const startStream = async () => {
      try {
        setStatus('connecting');
        console.log('[WebRTC] Starting stream:', streamName);

        // Create RTCPeerConnection
        pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pcRef.current = pc;

        // Add video element as receiver
        pc.ontrack = (event) => {
          console.log('[WebRTC] Received track:', event.track.kind);
          if (videoRef.current) {
            videoRef.current.srcObject = event.streams[0];
            setStatus('connected');
          }
        };

        pc.onconnectionstatechange = () => {
          console.log('[WebRTC] Connection state:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            setStatus('connected');
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            setStatus('error');
            if (onError) {
              onError(new Error('WebRTC connection failed'));
            }
          }
        };

        // Add transceiver for receiving video
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        // Create and set local offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        console.log('[WebRTC] Sending offer to go2rtc...');

        // Send offer to go2rtc
        const response = await fetch(`http://localhost:1984/api/webrtc?src=${streamName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sdp: offer.sdp,
            type: offer.type
          })
        });

        if (!response.ok) {
          throw new Error(`go2rtc response: ${response.status}`);
        }

        const answer = await response.json();
        console.log('[WebRTC] Received answer from go2rtc');

        // Set remote description
        await pc.setRemoteDescription(answer);
        console.log('[WebRTC] Connection established');

      } catch (error) {
        console.error('[WebRTC] Error:', error);
        setStatus('error');
        
        // Set user-friendly error message
        if (error.message.includes('timeout') || error.message.includes('dial tcp')) {
          setErrorMessage(`Kamera ${cameraIp}:${cameraPort} ist nicht erreichbar. Netzwerk-Timeout.`);
        } else if (error.message.includes('404')) {
          setErrorMessage('Stream nicht gefunden. Bitte prüfen Sie die Kamera-Konfiguration.');
        } else {
          setErrorMessage('WebRTC-Verbindung fehlgeschlagen. Siehe Netzwerk-Hinweis unten.');
        }
        
        if (onError) {
          onError(error);
        }

        // Don't retry automatically if it's a network issue
        if (!error.message.includes('timeout') && !error.message.includes('dial tcp')) {
          restartTimeout = setTimeout(() => {
            if (pcRef.current) {
              pcRef.current.close();
            }
            startStream();
          }, 5000);
        }
      }
    };

    startStream();

    // Cleanup
    return () => {
      if (restartTimeout) {
        clearTimeout(restartTimeout);
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, [streamName, onError]);

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />
      
      {status === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-center">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
              theme === 'dark' ? 'border-white' : 'border-gray-900'
            } mx-auto mb-4`}></div>
            <p className="text-white">Verbinde mit Kamera...</p>
          </div>
        </div>
      )}
      
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-center text-white">
            <svg className="h-16 w-16 mb-4 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p className="text-lg font-semibold mb-2">Verbindung fehlgeschlagen</p>
            <p className="text-sm text-gray-400">Erneuter Versuch in 3 Sekunden...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebRTCPlayer;
