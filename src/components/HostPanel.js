import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRadioStore } from '../store/useRadioStore';
import { socketService } from '../utils/socketService';
import { useSocketListener } from '../hooks';
import { SonoscapePlayer } from './SonoscapePlayer';
import { MicrophoneChat } from './MicrophoneChat';
import './HostPanel.css';

export const HostPanel = () => {
  useSocketListener();

  const currentFrequency = useRadioStore((state) => state.currentFrequency);
  const hostName = useRadioStore((state) => state.hostName);
  const playlist = useRadioStore((state) => state.playlist);
  const currentTrack = useRadioStore((state) => state.currentTrack);
  const isPlaying = useRadioStore((state) => state.isPlaying);
  const listenerCount = useRadioStore((state) => state.listenerCount);
  const setCurrentTrack = useRadioStore((state) => state.setCurrentTrack);
  const setIsPlaying = useRadioStore((state) => state.setIsPlaying);
  const setMessage = useRadioStore((state) => state.setMessage);
  const setError = useRadioStore((state) => state.setError);

  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeJob, setYoutubeJob] = useState(null);

  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;
    const progress = job => setYoutubeJob(job);
    const refreshStatus = () => {
      socket.timeout(5000).emit('host:youtube-status', { frequency: currentFrequency }, (error, job) => {
        if (!error) setYoutubeJob(job);
      });
    };
    const disconnected = () => setYoutubeJob(job => job?.running
      ? { ...job, running: false, message: 'Connection lost. The import stopped. Reconnect and retry.' } : job);
    socket.on('server:youtube-import', progress);
    socket.on('disconnect', disconnected);
    const timer = setInterval(refreshStatus, 5000);
    refreshStatus();
    return () => {
      socket.off('server:youtube-import', progress);
      socket.off('disconnect', disconnected);
      clearInterval(timer);
    };
  }, [currentFrequency]);

  const importYoutube = event => {
    event.preventDefault();
    setYoutubeJob({ running: true, message: 'Starting import…' });
    socketService.socket.timeout(10000).emit('host:import-youtube',
      { frequency: currentFrequency, url: youtubeUrl }, (error, result) => {
        if (error || !result?.success) setYoutubeJob({
          running: false, message: result?.message || 'Import could not start. Check the server connection.',
        });
      });
  };

  const [duration, setDuration] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(() => useRadioStore.getState().currentTime || 0);
  const [pausedTime, setPausedTime] = useState(() => useRadioStore.getState().currentTime || 0);
  const [isDragging, setIsDragging] = useState(false);
  
  // THIS IS THE MASTER AUDIO REFERENCE
  const audioRef = useRef(null);
  const restoredTime = useRef(useRadioStore.getState().currentTime || 0);
  const fileInputRef = useRef(null);
  const progressRef = useRef(null);

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files) return;

    const validAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/mp4', 'audio/mp3', 'audio/x-m4a'];

    for (let file of files) {
      if (!validAudioTypes.includes(file.type)) {
        const ext = file.name.split('.').pop().toLowerCase();
        const validExtensions = ['mp3', 'wav', 'ogg', 'webm', 'aac', 'm4a'];
        if (!validExtensions.includes(ext)) {
          setError(`❌ "${file.name}" is not an audio file. Please upload audio files only.`);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      }
    }

    const getAudioDuration = (fileUrl) => {
      return new Promise((resolve) => {
        const tempAudio = new Audio();
        tempAudio.src = fileUrl;
        tempAudio.onloadedmetadata = () => resolve(Math.floor(tempAudio.duration));
        tempAudio.onerror = () => resolve(180);
      });
    };

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const newTracks = [];

    try {
      for (let file of files) {
        const formData = new FormData();
        formData.append('audio', file);

        const uploadResponse = await fetch(`${apiUrl}/api/upload`, { method: 'POST', body: formData });
        if (!uploadResponse.ok) throw new Error(`Failed to upload ${file.name}`);
        const uploadData = await uploadResponse.json();
        if (!uploadData.success) throw new Error(uploadData.message || 'Upload failed');

        const audioDuration = await getAudioDuration(uploadData.file.url);
        newTracks.push({
          id: Math.random().toString(36).substr(2, 9),
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Unknown',
          duration: audioDuration,
          fileUrl: uploadData.file.url,
          mimeType: file.type,
        });
      }

      if (newTracks.length === 0) throw new Error('No files were processed');

      await socketService.uploadTracks(currentFrequency, newTracks, true);
      setMessage(`📁 Uploaded ${newTracks.length} tracks successfully!`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(`❌ Upload Error: ${err.message}`);
    }
  };

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        const currentTime = audioRef.current?.currentTime || 0;
        setPausedTime(currentTime);
        await socketService.pause(currentFrequency, currentTime);
        if (audioRef.current) audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const resumeTime = pausedTime || 0;
        await socketService.play(currentFrequency, resumeTime);
        if (audioRef.current) {
          audioRef.current.currentTime = resumeTime;
          audioRef.current.play().catch(err => console.error('Playback error:', err));
        }
        setPausedTime(0);
        setIsPlaying(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSeek = useCallback(async (time) => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        setPlaybackTime(time);
      }
      if (!isPlaying) setPausedTime(time);
      await socketService.seek(currentFrequency, time);
    } catch (err) {
      setError(err.message);
    }
  }, [currentFrequency, isPlaying, setError]);

  useEffect(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.src = currentTrack.fileUrl;
      const position = restoredTime.current;
      restoredTime.current = 0;
      setPlaybackTime(position);
      setPausedTime(position);
      const restorePosition = () => { audioRef.current.currentTime = position; };
      const audio = audioRef.current;
      audio.addEventListener('loadedmetadata', restorePosition, { once: true });
      return () => audio.removeEventListener('loadedmetadata', restorePosition);
    }
  }, [currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && audioRef.current.paused) {
        audioRef.current.play().catch(err => console.error('Playback error:', err));
      } else if (!isPlaying && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      if (!progressRef.current || duration <= 0) return;
      const rect = progressRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setPlaybackTime(percent * duration);
    };
    const handleMouseUp = () => {
      if (!progressRef.current || duration <= 0) return setIsDragging(false);
      const rect = progressRef.current.getBoundingClientRect();
      const percent = (Math.max(rect.left, Math.min(rect.right, window.event?.clientX || rect.right)) - rect.left) / rect.width;
      handleSeek(percent * duration);
      setIsDragging(false);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, duration, handleSeek]);

  const handleSkipTrack = async () => {
    try {
      const currentIndex = playlist.findIndex((t) => t.id === currentTrack?.id);
      const nextIndex = (currentIndex + 1) % playlist.length;
      await socketService.changeTrack(currentFrequency, nextIndex);
      setCurrentTrack(playlist[nextIndex]);
    } catch (err) { setError(err.message); }
  };

  const handlePreviousTrack = async () => {
    try {
      const currentIndex = playlist.findIndex((t) => t.id === currentTrack?.id);
      const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
      await socketService.changeTrack(currentFrequency, prevIndex);
      setCurrentTrack(playlist[prevIndex]);
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="host-panel">
      <div className="host-panel-content">
        <div className="header">
          <h2>🎙️ Station: {currentFrequency} FM</h2>
          <p className="host-name">{hostName}</p>
          <div className="listener-count">👥 {listenerCount} listeners</div>
        </div>

        <form className="youtube-import" onSubmit={importYoutube}>
          <p>Your frequency and playlist are reserved for 15 minutes after disconnect. Refreshing restores your host session.</p>
          <label htmlFor="youtube-playlist">Import YouTube playlist as audio</label>
          <div className="youtube-import-actions">
            <input id="youtube-playlist" type="url" required value={youtubeUrl}
              onChange={event => setYoutubeUrl(event.target.value)}
              placeholder="https://music.youtube.com/playlist?list=…"
              disabled={youtubeJob?.running} />
            <button type="submit" disabled={youtubeJob?.running}>Import playlist</button>
            {youtubeJob?.running && <button type="button"
              onClick={() => socketService.socket.emit('host:cancel-youtube')}>Cancel</button>}
          </div>
          <small>Public playlists · up to 30 minutes per track · unavailable tracks are skipped</small>
          {youtubeJob && !youtubeJob.entries && <p role="status">
            {youtubeJob.message}
            {youtubeJob.total > 0 && ` · ${youtubeJob.processed || 0}/${youtubeJob.total} processed · ${youtubeJob.imported || 0} added`}
          </p>}
        </form>

        {/* ✅ ENHANCED: SonoscapePlayer now includes seekbar, controls, upload, and playlist */}
        <SonoscapePlayer 
          audioRef={audioRef}
          isPlaying={isPlaying}
          trackName={currentTrack?.title}
          playlist={playlist}
          currentTrack={currentTrack}
          onPlayPause={handlePlayPause}
          onSkipNext={handleSkipTrack}
          onSkipPrevious={handlePreviousTrack}
          onTrackSelect={(index) => {
            try {
              socketService.changeTrack(currentFrequency, index);
              setCurrentTrack(playlist[index]);
            } catch (err) {
              setError(err.message);
            }
          }}
          onFileUpload={(e) => handleFileUpload(e)}
          duration={duration}
          currentTime={playbackTime}
          onSeek={handleSeek}
          listenerCount={listenerCount}
          currentFrequency={currentFrequency}
        />

        {/* ✅ ONLY audio element - hidden, no wrapper needed */}
        <audio
          preload="none"
          ref={audioRef}
          src={currentTrack?.fileUrl}
          crossOrigin="anonymous"
          style={{ display: 'none' }}
          onLoadedMetadata={(e) => setDuration(e.target.duration || currentTrack?.duration || 0)}
          onTimeUpdate={(e) => setPlaybackTime(e.target.currentTime)}
          onEnded={() => handleSkipTrack()}
        />

        {/* 🎤 Voice Chat */}
        <MicrophoneChat
          frequency={currentFrequency}
          userName={hostName}
          userRole="host"
        />

        {/* ✅ OLD CONTROLS REMOVED - Now integrated in SonoscapePlayer */}
      </div>
    </div>
  );
};