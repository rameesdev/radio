import React, { useRef } from 'react';
import { useRadioStore } from '../store/useRadioStore';
import { useSyncedAudio, useSocketListener } from '../hooks';
import { StationWorkspace } from './StationWorkspace';

export const ListenerPanel = () => {
  const currentFrequency = useRadioStore((state) => state.currentFrequency);
  const currentTrack = useRadioStore((state) => state.currentTrack);
  const isPlaying = useRadioStore((state) => state.isPlaying);
  const currentTime = useRadioStore((state) => state.currentTime);

  const audioRef = useRef(null);

  // Set up socket listeners for this listener
  useSocketListener();

  // Sync audio playback with server
  useSyncedAudio(audioRef, 'listener', currentFrequency);

  return (
    <StationWorkspace audioRef={audioRef} currentTime={currentTime}>
        <audio
          preload="none"
          ref={audioRef}
          src={currentTrack?.fileUrl}
          crossOrigin="anonymous"
          controls={false}
          autoPlay={isPlaying}
          style={{ display: 'none' }}
        />
    </StationWorkspace>
  );
};
