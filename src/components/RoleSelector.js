import React, { useState } from 'react';
import { useRadioStore } from '../store/useRadioStore';
import { socketService } from '../utils/socketService';
import { ArrowRight, Headphones, Radio } from 'lucide-react';

export const RoleSelector = () => {
  const [stationName, setStationName] = useState('');
  const [hostName, setHostNameState] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [sharedFrequency] = useState(() => new URLSearchParams(window.location.search).get('frequency'));
  const [mode, setMode] = useState(sharedFrequency != null ? 'join' : 'create');
  const [frequency, setFrequency] = useState(sharedFrequency ?? '');

  const stations = useRadioStore((state) => state.stations);
  const isConnected = useRadioStore((state) => state.isConnected);
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
      const result = await socketService.createStation(frequency, finalStationName);
      if (result.resumeToken) localStorage.setItem('radioHostSession', JSON.stringify({
        frequency, token: result.resumeToken,
      }));

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
    if (joining) return;
    if (!isConnected) {
      setError('The radio server is still connecting. Try again in a moment.');
      return;
    }
    setError('');
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

  const openStations = [...stations].sort((a, b) =>
    Number(Boolean(b.isPlaying)) - Number(Boolean(a.isPlaying)) || a.frequency - b.frequency);
  const pending = creating || joining;

  return (
    <div className="station-lobby">
      <header className="lobby-header">
        <div className="workspace-brand"><Radio size={21} /> Ramz Radio</div>
        <span className={isConnected ? 'socket-online' : ''}>{isConnected ? 'Connected' : 'Connecting…'}</span>
      </header>
      <div className="lobby-grid">
        <section className="lobby-hero">
          <div className="lobby-radio"><Radio size={70} strokeWidth={1.15} /></div>
          <h1>Host and listen to live radio</h1>
          <p>Open a frequency, queue your music, and listen together in sync.</p>
        </section>
        <section className="lobby-panel" aria-label="Tune a frequency">
          <div className="lobby-tabs" aria-label="Station role">
            <button type="button" aria-pressed={mode === 'create'} disabled={pending} onClick={() => { setMode('create'); setError(''); }}><Radio size={16} />Host</button>
            <button type="button" aria-pressed={mode === 'join'} disabled={pending} onClick={() => { setMode('join'); setError(''); }}><Headphones size={16} />Listen</button>
          </div>
          <form onSubmit={event => {
            event.preventDefault();
            const value = Number(frequency);
            if (!frequency || !Number.isFinite(value) || value < 0 || value > 100) return;
            if (mode === 'create') handleCreateStation(value);
            else handleJoinStation(value);
          }}>
            {mode === 'create' ? <label>Station name <input value={stationName} placeholder="Optional" onChange={e => setStationName(e.target.value)} disabled={pending} /></label>
              : <label>Your name <input value={hostName} placeholder="Optional" onChange={e => setHostNameState(e.target.value)} disabled={pending} /></label>}
            <label>Frequency (FM) <input required type="number" inputMode="decimal" min="0" max="100" step="0.5"
              value={frequency} placeholder="82.5" onChange={event => setFrequency(event.target.value)} disabled={pending} /></label>
            <button className="primary-action" disabled={pending || !isConnected}>
              {pending ? 'Connecting…' : mode === 'create' ? 'Create station' : 'Join station'}<ArrowRight size={17} />
            </button>
            {error && <p role="alert" className="lobby-error">{error}</p>}
          </form>
        </section>
      </div>
      <section className="lobby-directory" aria-labelledby="directory-heading">
        <div className="workspace-section-header"><h2 id="directory-heading">Open frequencies</h2><span>{openStations.length} available</span></div>
        {openStations.length ? <ul>{openStations.map(station => (
          <li key={station.frequency}>
            <button type="button" disabled={pending || !isConnected} onClick={() => {
              setFrequency(String(station.frequency));
              setMode('join');
              setError('');
              if (mode === 'join') handleJoinStation(station.frequency);
            }}>
              <span className="directory-band">{station.frequency} FM</span>
              <strong>{station.hostName || 'Radio station'}</strong>
              <span className={station.isPlaying ? 'station-live' : ''}>{station.isPlaying ? 'Live' : 'Open'}</span>
              <span><Headphones size={15} aria-label="Listeners" /> {station.listenerCount}</span>
            </button>
          </li>
        ))}</ul> : <p className="queue-empty">{isConnected ? 'No stations are open right now.' : 'Connecting to the radio server…'}</p>}
      </section>
    </div>
  );
};
