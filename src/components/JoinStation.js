import React, { useState } from 'react';
import { useRadioStore } from '../store/useRadioStore';
import { socketService } from '../utils/socketService';
import './JoinStation.css';

export const JoinStation = () => {
  const [frequency, setFrequency] = useState('');
  const [userName, setUserName] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const stations = useRadioStore((state) => state.stations);

  const setUserRole = useRadioStore((state) => state.setUserRole);
  const setCurrentFrequency = useRadioStore((state) => state.setCurrentFrequency);
  const setHostName = useRadioStore((state) => state.setHostName);
  const setShowJoinPanel = useRadioStore((state) => state.setShowJoinPanel);
  const setPlaylist = useRadioStore((state) => state.setPlaylist);
  const setCurrentTrack = useRadioStore((state) => state.setCurrentTrack);
  const setIsPlaying = useRadioStore((state) => state.setIsPlaying);
  const setCurrentTime = useRadioStore((state) => state.setCurrentTime);

  const handleJoinStation = async (e) => {
    e.preventDefault();
    setJoining(true);

    try {
      const freq = parseFloat(frequency);

      if (!userName.trim()) {
        setError('Please enter your name');
        setJoining(false);
        return;
      }

      const response = await socketService.joinStation(freq, userName);

      // Set initial sync data from server (includes playlist and current playback state)
      if (response.syncData) {
        setPlaylist(response.syncData.playlist || []);
        setCurrentTrack(response.syncData.currentTrack || null);
        setIsPlaying(response.syncData.isPlaying || false);
        setCurrentTime(response.syncData.currentPlaybackTime || 0);
      }

      setUserRole('listener');
      setCurrentFrequency(freq);
      setHostName(response.hostName);
      setShowJoinPanel(false);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleJoinFromList = async (freq, hostName) => {
    setJoining(true);
    try {
      const name = userName.trim() || `Listener ${Math.floor(Math.random() * 10000)}`;
      const response = await socketService.joinStation(freq, name);

      // Set initial sync data from server (includes playlist and current playback state)
      if (response.syncData) {
        setPlaylist(response.syncData.playlist || []);
        setCurrentTrack(response.syncData.currentTrack || null);
        setIsPlaying(response.syncData.isPlaying || false);
        setCurrentTime(response.syncData.currentPlaybackTime || 0);
      }

      setUserRole('listener');
      setCurrentFrequency(freq);
      setHostName(hostName);
      setShowJoinPanel(false);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="join-station">
      <div className="container">
        <h2>👂 Join a Station</h2>

        <form onSubmit={handleJoinStation} className="form">
          <div className="form-group">
            <label htmlFor="userName">Your Name</label>
            <input
              id="userName"
              type="text"
              placeholder="Your name (optional)"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={joining}
            />
          </div>

          <div className="form-group">
            <label htmlFor="frequency">Frequency (FM)</label>
            <input
              id="frequency"
              type="number"
              placeholder="e.g., 101.2"
              step="0.1"
              min="1"
              max="1000"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              disabled={joining}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={joining}>
            {joining ? 'Joining...' : '🎧 Join Station'}
          </button>
        </form>

        <div className="stations-list">
          <h3>Available Stations</h3>
          {stations && stations.length > 0 ? (
            <div className="stations-grid">
              {stations.map((station) => (
                <div key={station.frequency} className="station-card">
                  <div className="frequency">{station.frequency} FM</div>
                  <div className="host-name">{station.hostName}</div>
                  <div className="listeners">👥 {station.listenerCount} listeners</div>
                  {station.currentTrack && (
                    <div className="now-playing">{station.currentTrack.title}</div>
                  )}
                  <button
                    className="btn btn-small"
                    onClick={() => handleJoinFromList(station.frequency, station.hostName)}
                    disabled={joining}
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-stations">No active stations. Start one!</p>
          )}
        </div>
      </div>
    </div>
  );
};
