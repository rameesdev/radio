import React, { useEffect, useRef, useState } from 'react';
import {
  Activity, AudioLines, ChevronDown, Headphones, LayoutGrid, ListMusic, LogOut, Menu, MoreHorizontal,
  Mic, Music2, Pause, Play, Radio, Settings2, Share2, SkipBack, SkipForward, Upload, Volume2, X,
} from 'lucide-react';
import { useRadioStore } from '../store/useRadioStore';
import { socketService } from '../utils/socketService';
import { MicrophoneChat } from './MicrophoneChat';
import { SonoscapePlayer } from './SonoscapePlayer';
import './StationWorkspace.css';

const durationText = value => {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
};

export function StationWorkspace({
  audioRef, children, duration = 0, currentTime = 0, transport, importPlaylist,
}) {
  const { currentFrequency: frequency, currentTrack: track, playlist, hostName,
    userName, userRole, isPlaying, isConnected, listenerCount, reset, setMessage, setError } = useRadioStore();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [visualizerOpen, setVisualizerOpen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [needsAudio, setNeedsAudio] = useState(false);
  const uploadRef = useRef(null);
  const meterRef = useRef(null);
  const voiceCloseRef = useRef(null);
  const voiceToggleRef = useRef(null);
  const closeVoice = () => {
    setVoiceOpen(false);
    voiceToggleRef.current?.focus();
  };
  const host = Boolean(transport);
  const length = duration || track?.duration || 0;
  const progress = Math.max(0, Math.min(currentTime, length));
  const playing = Boolean(track && isPlaying);
  useEffect(() => {
    if (!voiceOpen) return;
    voiceCloseRef.current?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        setVoiceOpen(false);
        voiceToggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [voiceOpen]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || host || !playing) return;
    const update = () => setNeedsAudio(audio.paused || audio.audioCtx?.state === 'suspended');
    update();
    audio.addEventListener('playing', update);
    audio.addEventListener('pause', update);
    audio.audioCtx?.addEventListener('statechange', update);
    return () => {
      audio.removeEventListener('playing', update);
      audio.removeEventListener('pause', update);
      audio.audioCtx?.removeEventListener('statechange', update);
    };
  }, [audioRef, host, playing, track?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    const meter = meterRef.current;
    if (!audio || !meter || !playing) return;
    const bins = new Uint8Array(16);
    let frame;
    const draw = () => {
      audio.analyserNode?.getByteFrequencyData(bins);
      const level = bins.reduce((sum, value) => sum + value, 0) / (bins.length * 255);
      meter.style.setProperty('--meter-level', String(audio.paused ? 0.25 : 0.25 + level * 0.75));
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [audioRef, playing]);
  const share = async () => {
    const url = new URL('/', window.location.origin);
    url.searchParams.set('frequency', frequency);
    try {
      await navigator.clipboard.writeText(url.href);
      setMessage('Station link copied');
    } catch {
      setError('Could not copy the station link.');
    }
  };

  const openVisualizer = (settings = false) => {
    setVisualizerOpen(true);
    setNavigationOpen(false);
    requestAnimationFrame(() => {
      const target = document.getElementById(settings ? 'station-visualizer-settings' : 'station-visualizer');
      if (settings) {
        const details = target?.querySelector('details.edge-settings');
        if (details) details.open = true;
      }
      target?.scrollIntoView({ block: 'start' });
    });
  };

  return (
    <div className="station-workspace">
      <aside className={'workspace-nav' + (navigationOpen ? ' expanded' : '')}>
        <div className="workspace-brand"><Radio size={21} /> Ramz Radio</div>
        <div className="workspace-frequency"><Radio size={17} /><div><small>Current station</small><strong>{frequency} FM</strong></div></div>
        <nav aria-label="Station navigation">
          <a href="#station-overview" onClick={() => setNavigationOpen(false)}><LayoutGrid />Overview</a>
          <a href="#station-player" onClick={() => setNavigationOpen(false)}><Music2 />Now playing</a>
          <a href="#station-queue" onClick={() => setNavigationOpen(false)}><ListMusic />Queue</a>
          {host && <button onClick={() => { setNavigationOpen(false); importPlaylist(); }}><Upload />Import playlist</button>}
          <button onClick={() => openVisualizer()}><Activity />Visualizer</button>
          <button onClick={() => openVisualizer(true)}><Settings2 />Settings</button>
        </nav>
      </aside>
      <header className="workspace-header" id="station-overview">
        <button type="button" className="workspace-menu icon-button" aria-label="Station navigation" aria-expanded={navigationOpen}
          onClick={() => { setNavigationOpen(!navigationOpen); setVoiceOpen(false); }}><Menu /></button>
        <div className="station-heading"><h1>{frequency} FM</h1><span>{hostName}</span></div>
        <div className="workspace-status">
          {playing && <span className="station-live">Live</span>}
          <span className={isConnected ? 'socket-online' : ''}>{isConnected ? 'Connected' : 'Disconnected'}</span>
          <span title="Listeners"><Headphones size={15} aria-label="Listeners" />{listenerCount}</span>
        </div>
        <div className="workspace-actions">
          <button className="icon-button" title="Copy station link" aria-label="Copy station link" onClick={share}><Share2 /></button>
          <button className="icon-button" title="Visualizer settings" aria-label="Visualizer settings" onClick={() => openVisualizer(true)}><Settings2 /></button>
          <button className="icon-button" title="Leave station" aria-label="Leave station" onClick={() => {
            if (host) socketService.socket?.emit('host:leave');
            reset();
          }}><LogOut /></button>
        </div>
      </header>
      <div className="workspace-main">
        <section className="workspace-player" id="station-player" aria-labelledby="now-playing-title">
          <div className="workspace-art">
            {track?.artwork ? <img src={track.artwork} alt="" /> : <Music2 size={50} strokeWidth={1.2} />}
          </div>
          <div className="workspace-track">
            <div className="workspace-eyebrow" id="now-playing-title">Now playing
              {playing && <span ref={meterRef} className="track-meter" aria-hidden="true"><AudioLines size={16} /></span>}
            </div>
            <h2>{track?.title || 'No track queued'}</h2>
            <p>{track?.artist || hostName || 'Ramz Radio'} <span>· {frequency} FM</span></p>
            <div className="workspace-progress">
              <time>{durationText(currentTime)}</time>
              {host ? <input type="range" aria-label="Playback position" min="0" max={length || 1}
                step="0.1" disabled={!length} value={progress} onChange={event => transport.seek(event.target.valueAsNumber)} />
                : <progress aria-label="Playback position" max={length || 1} value={progress} />}
              <time>{durationText(length)}</time>
            </div>
            <div className="workspace-transport">
              {host && <>
                <button className="icon-button" title="Previous track" aria-label="Previous track" disabled={!track} onClick={transport.previous}><SkipBack /></button>
                <button className="icon-button play-button" title={playing ? 'Pause' : 'Play'} aria-label={playing ? 'Pause' : 'Play'} disabled={!track} onClick={transport.play}>{playing ? <Pause /> : <Play />}</button>
                <button className="icon-button" title="Next track" aria-label="Next track" disabled={!track} onClick={transport.next}><SkipForward /></button>
              </>}
              {!host && playing && needsAudio && <button className="enable-audio" type="button" onClick={async () => {
                const audio = audioRef.current;
                try {
                  audio.audioCtx?.resume().catch(() => {});
                  await audio.play();
                  setNeedsAudio(false);
                } catch {
                  setError('Audio could not start. Try again when the track is available.');
                }
              }}>Enable audio</button>}
              <label className="workspace-volume"><Volume2 size={17} />
                <input type="range" aria-label="Music volume" min="0" max="1" step="0.01" value={volume}
                  onChange={event => {
                    const value = event.target.valueAsNumber;
                    setVolume(value);
                    const audio = audioRef.current;
                    if (audio?.volumeNode) audio.volumeNode.gain.value = value;
                    else if (audio) audio.volume = value;
                  }} />
              </label>
            </div>
          </div>
        </section>
        <section className="workspace-queue" id="station-queue" aria-labelledby="queue-title">
          <div className="workspace-section-header">
            <div><h2 id="queue-title">Queue</h2><span>{playlist.length} {playlist.length === 1 ? 'track' : 'tracks'}</span></div>
            {host && <div className="queue-actions">
              <input ref={uploadRef} type="file" multiple accept="audio/*,.mp3,.wav,.ogg,.webm,.aac,.m4a" hidden
                onChange={event => { transport.upload(event); event.target.value = ''; }} />
              <button onClick={() => uploadRef.current?.click()}><Upload size={15} />Upload audio</button>
              <button className="primary-action" onClick={importPlaylist}><ListMusic size={16} />Import playlist</button>
            </div>}
          </div>
          {playlist.length ? <ol className="workspace-tracks">
            {playlist.map((item, index) => {
              const selected = item.id === track?.id;
              return <li key={item.id} className={selected ? 'selected' : ''} aria-current={selected ? 'true' : undefined}>
                <span className="queue-index">{selected && playing ? <AudioLines size={16} className="playing-indicator" aria-label="Playing" /> : index + 1}</span>
                <span className="queue-art"><Music2 size={16} /></span>
                <span className="queue-name"><strong>{item.title}</strong>{item.artist && <small>{item.artist}</small>}</span>
                <time>{item.duration > 0 ? durationText(item.duration) : '—'}</time>
                {host && <details className="queue-menu">
                  <summary className="icon-button" aria-label={'Actions for ' + item.title} title="Track actions"><MoreHorizontal size={16} /></summary>
                  <button type="button" onClick={event => {
                    event.currentTarget.closest('details').open = false;
                    transport.select(index);
                  }}>Select track</button>
                </details>}
              </li>;
            })}
          </ol> : <p className="queue-empty">{host ? 'Upload audio or import a playlist to fill the queue.' : 'Waiting for the host to add tracks.'}</p>}
        </section>
        <section className="workspace-visualizer" id="station-visualizer">
          <button className="visualizer-toggle" aria-expanded={visualizerOpen} aria-controls="station-visualizer-settings"
            onClick={() => setVisualizerOpen(!visualizerOpen)}><Activity size={18} />Audio visualizer<ChevronDown size={17} /></button>
          <div id="station-visualizer-settings" hidden={!visualizerOpen}>
            <SonoscapePlayer audioRef={audioRef} trackName={track?.title} />
          </div>
        </section>
      </div>
      {voiceOpen && <button className="voice-backdrop" aria-label="Close voice chat" onClick={closeVoice} />}
      <aside id="station-voice" className={'workspace-voice' + (voiceOpen ? ' expanded' : '')} aria-label="Voice chat">
        <button ref={voiceCloseRef} className="workspace-voice-close icon-button" aria-label="Close voice chat" onClick={closeVoice}><X /></button>
        <MicrophoneChat participantCount={listenerCount + 1} frequency={frequency} userName={userName || hostName} userRole={userRole} />
      </aside>
      <nav className="workspace-bottom-nav" aria-label="Quick navigation">
        <a href="#station-player"><Music2 />Player</a>
        <a href="#station-queue"><ListMusic />Queue</a>
        <button onClick={() => openVisualizer()}><Activity />Visualizer</button>
        <button ref={voiceToggleRef} aria-controls="station-voice" aria-expanded={voiceOpen} onClick={() => { setVoiceOpen(!voiceOpen); setNavigationOpen(false); }}><Mic />Voice</button>
      </nav>
      {children}
    </div>
  );
}
