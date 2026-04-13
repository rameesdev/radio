import React, { useState } from 'react';
import { useRadioStore } from '../store/useRadioStore';
import { socketService } from '../utils/socketService';
import { VintageTuner } from './VintageTuner';
import './RoleSelector.css';

export const RoleSelector = () => {
  const [stationName, setStationName] = useState('');
  const [hostName, setHostNameState] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState(null); // 'create', 'join', or null

  const setUserRole = useRadioStore((state) => state.setUserRole);
  const setUserName = useRadioStore((state) => state.setUserName);
  const setShowHostPanel = useRadioStore((state) => state.setShowHostPanel);
  const setShowJoinPanel = useRadioStore((state) => state.setShowJoinPanel);
  const setCurrentFrequency = useRadioStore((state) => state.setCurrentFrequency);
  const setHostString = useRadioStore((state) => state.setHostName);

  const handleCreateStation = async (frequency) => {
    // Use provided station name or generate a default one
    const finalStationName = stationName.trim() || `Station ${frequency}`;

    setCreating(true);
    try {
      await socketService.createStation(frequency, finalStationName);

      setUserRole('host');
      setUserName(finalStationName);
      setCurrentFrequency(frequency);
      setHostString(finalStationName);
      setShowHostPanel(true);
      setShowJoinPanel(false);
      setError('');
      setMode(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinStation = async (frequency) => {
    // Use provided name or generate a default one
    const finalName = hostName.trim() || `Listener ${Math.floor(Math.random() * 10000)}`;

    setJoining(true);
    try {
      const response = await socketService.joinStation(frequency, finalName);

      // Extract sync data from response and populate store
      const { syncData, hostName: remoteHostName } = response;
      if (syncData) {
        useRadioStore.getState().setPlaylist(syncData.playlist || []);
        useRadioStore.getState().setCurrentTrack(syncData.currentTrack || null);
        useRadioStore.getState().setIsPlaying(syncData.isPlaying || false);
        useRadioStore.getState().setCurrentTime(syncData.currentPlaybackTime || 0);
        useRadioStore.getState().setListenerCount(syncData.listenerCount || 0);
      }
      if (remoteHostName) {
        useRadioStore.getState().setHostName(remoteHostName);
      }

      setUserRole('listener');
      setUserName(finalName);
      setCurrentFrequency(frequency);
      setShowJoinPanel(false);
      setShowHostPanel(false);
      setError('');
      setMode(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  if (!mode) {
    return (
      <div className="role-selector vintage">
        <div className="vintage-header">
          <div className="radio-logo">
            <div className="logo-circle"></div>
            <h1>Virtual Radio</h1>
          </div>
          <p className="vintage-subtitle">Real-Time Synchronized Audio Broadcast</p>
        </div>

        <div className="vintage-buttons-grid">
          <button
            className="vintage-card-button create-btn"
            onClick={() => {
              setMode('create');
              setError('');
            }}
          >
            <div className="card-icon">🎙️</div>
            <div className="card-title">Create Station</div>
            <div className="card-desc">Broadcast your own station</div>
          </button>

          <button
            className="vintage-card-button join-btn"
            onClick={() => {
              setMode('join');
              setError('');
            }}
          >
            <div className="card-icon">👂</div>
            <div className="card-title">Join Station</div>
            <div className="card-desc">Listen to existing stations</div>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="role-selector vintage">
        <button className="back-btn" onClick={() => setMode(null)}>← Back</button>
        
        <h2 className="mode-title">🎙️ Create Your Station</h2>

        <div className="create-form-wrapper">
          <div className="form-section">
            <label className="form-label">Station Name</label>
            <input
              type="text"
              className="vintage-input"
              placeholder="e.g., Jazz FM, Rock Radio (optional)"
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              disabled={creating}
            />
          </div>

          {error && <div className="vintage-error">{error}</div>}

          <VintageTuner
            onTune={handleCreateStation}
            minFrequency={0}
            maxFrequency={100}
            step={0.5}
            title="Tune Your Frequency"
          />

          <p className="vintage-hint">Turn the dial to select your station (0-100, step: 0.5)</p>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="role-selector vintage">
        <button className="back-btn" onClick={() => setMode(null)}>← Back</button>
        
        <h2 className="mode-title">👂 Join a Station</h2>

        <div className="create-form-wrapper">
          <div className="form-section">
            <label className="form-label">Your Name</label>
            <input
              type="text"
              className="vintage-input"
              placeholder="Enter your name (optional)"
              value={hostName}
              onChange={(e) => setHostNameState(e.target.value)}
              disabled={joining}
            />
          </div>

          {error && <div className="vintage-error">{error}</div>}

          <VintageTuner
            onTune={handleJoinStation}
            minFrequency={0}
            maxFrequency={100}
            step={0.5}
            title="Tune To Station"
            showFrequencyInput={true}
          />

          <p className="vintage-hint">Type or rotate the dial to find and connect to a station (0-100, step: 0.5)</p>
        </div>
      </div>
    );
  }
};
