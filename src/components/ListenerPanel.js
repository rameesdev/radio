import React, { useRef } from 'react';
import { useRadioStore } from '../store/useRadioStore';
import { useSyncedAudio, useSocketListener } from '../hooks';
import { SonoscapePlayer } from './SonoscapePlayer';
import { MicrophoneChat } from './MicrophoneChat';
import './ListenerPanel.css';

export const ListenerPanel = () => {
  const currentFrequency = useRadioStore((state) => state.currentFrequency);
  const hostName = useRadioStore((state) => state.hostName);
  const userName = useRadioStore((state) => state.userName);
  const currentTrack = useRadioStore((state) => state.currentTrack);
  const isPlaying = useRadioStore((state) => state.isPlaying);
  const currentTime = useRadioStore((state) => state.currentTime);
  const listenerCount = useRadioStore((state) => state.listenerCount);
  const playlist = useRadioStore((state) => state.playlist);

  const audioRef = useRef(null);

  // Set up socket listeners for this listener
  useSocketListener();

  // Sync audio playback with server
  useSyncedAudio(audioRef, 'listener', currentFrequency);

  return (
    <div className="listener-panel">
      <div className="listener-panel-content">
        <div className="header">
          <h2>🎧 Tuned to {currentFrequency} FM</h2>
          <p className="host-name">Host: {hostName}</p>
          <div className="listener-count">👥 {listenerCount} listeners</div>
        </div>

        {/* ✅ Pass audioRef and playlist to visualizer for consistent layout */}
        {currentTrack?.fileUrl && (
          <SonoscapePlayer
            audioRef={audioRef}
            isPlaying={isPlaying}
            trackName={currentTrack?.title}
            playlist={playlist}
            currentTrack={currentTrack}
            duration={currentTrack?.duration || 0}
            currentTime={currentTime}
            listenerCount={listenerCount}
            currentFrequency={currentFrequency}
            readOnly={true}
            onPlayPause={() => {}}
            onSkipNext={() => {}}
            onSkipPrevious={() => {}}
            onTrackSelect={() => {}}
            onFileUpload={() => {}}
            onSeek={() => {}}
          />
        )}

        {/* ✅ ONLY audio element - hidden, no wrapper needed */}
        <audio
          ref={audioRef}
          src={currentTrack?.fileUrl}
          crossOrigin="anonymous"
          controls={false}
          autoPlay={isPlaying}
          style={{ display: 'none' }}
        />

        {/* Status message for listeners */}
        <div className="status-message">
          {isPlaying && (
            <p className="info">🔄 Syncing with host in real-time...</p>
          )}
          {!isPlaying && currentTrack && (
            <p className="info">⏸️ Station paused</p>
          )}
          {!currentTrack && (
            <p className="info">📻 Tuned in, waiting for content...</p>
          )}
        </div>

        {/* 🎤 Voice Chat — listeners can also speak */}
        <MicrophoneChat
          frequency={currentFrequency}
          userName={userName || 'Listener'}
          userRole="listener"
        />

        <div className="queue-section">
          <h3>Next Up ({playlist.length} songs)</h3>
          <div className="queue">
            {playlist.length > 0 ? (
              playlist.map((track, index) => (
                <div
                  key={track.id}
                  className={`queue-item ${
                    currentTrack?.id === track.id ? 'current' : ''
                  }`}
                >
                  <span className="queue-number">{index + 1}</span>
                  <span className="queue-title">{track.title}</span>
                </div>
              ))
            ) : (
              <p className="no-queue">No songs queued</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
