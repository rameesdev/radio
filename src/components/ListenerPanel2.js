import React, { useRef, useEffect } from 'react';
import { useRadioStore } from '../store/useRadioStore';
import { useSyncedAudio, useSocketListener } from '../hooks';
import './ListenerPanel.css';

export const ListenerPanel = () => {
  const currentFrequency = useRadioStore((state) => state.currentFrequency);
  const hostName = useRadioStore((state) => state.hostName);
  const currentTrack = useRadioStore((state) => state.currentTrack);
  const isPlaying = useRadioStore((state) => state.isPlaying);
  const currentTime = useRadioStore((state) => state.currentTime);
  const listenerCount = useRadioStore((state) => state.listenerCount);
  const playlist = useRadioStore((state) => state.playlist);

  const audioRef = useRef(null);

  useSocketListener();
  useSyncedAudio(audioRef, 'listener', currentFrequency);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="listener-panel">
      <div className="listener-panel-content">
        <div className="header">
          <h2>🎧 Tuned to {currentFrequency} FM</h2>
          <p className="host-name">Host: {hostName}</p>
          <div className="listener-count">👥 {listenerCount} listeners</div>
        </div>

        <div className="now-playing-section">
          <div className="now-playing-title">Now Playing</div>
          <div className="track-info">
            {currentTrack ? (
              <>
                <div className="track-title">{currentTrack.title}</div>
                <div className="track-artist">{currentTrack.artist}</div>
              </>
            ) : (
              'Waiting for content...'
            )}
          </div>
          <div className="playback-status">
            {isPlaying ? (
              <span className="status playing">🎵 Playing</span>
            ) : (
              <span className="status paused">⏸️ Paused</span>
            )}
          </div>
        </div>

        <div className="player-section">
          <audio
            ref={audioRef}
            src={currentTrack?.fileUrl}
            crossOrigin="anonymous"
            controls={false}
            autoPlay={isPlaying}
          />
          <div className="playback-info">
            <div className="time">{formatTime(currentTime)}</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '0%' }}></div>
            </div>
            <div className="duration">{formatTime(currentTrack?.duration || 0)}</div>
          </div>
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
        </div>

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
