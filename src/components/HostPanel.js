import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRadioStore } from '../store/useRadioStore';
import { socketService } from '../utils/socketService';
import { useSocketListener } from '../hooks';
import { X } from 'lucide-react';
import { StationWorkspace } from './StationWorkspace';

export const HostPanel = () => {
  useSocketListener();

  const currentFrequency = useRadioStore((state) => state.currentFrequency);
  const playlist = useRadioStore((state) => state.playlist);
  const currentTrack = useRadioStore((state) => state.currentTrack);
  const isPlaying = useRadioStore((state) => state.isPlaying);
  const trackUrl = currentTrack?.fileUrl;
  const trackId = currentTrack?.id;
  const setIsPlaying = useRadioStore((state) => state.setIsPlaying);
  const setMessage = useRadioStore((state) => state.setMessage);
  const setError = useRadioStore((state) => state.setError);

  const importDialog = useRef(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeJob, setYoutubeJob] = useState(null);

  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;
    const progress = job => {
      setYoutubeJob(job);
      if (!job.running && job.imported > 0) setMessage(job.imported + ' tracks added to the queue');
    };
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
  }, [currentFrequency, setMessage]);

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
  
  // THIS IS THE MASTER AUDIO REFERENCE
  const audioRef = useRef(null);
  const restoredTime = useRef(useRadioStore.getState().currentTime || 0);

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
    } catch (err) {
      setError(`❌ Upload Error: ${err.message}`);
    }
  };

  const playRequest = useRef(false);
  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !trackUrl || playRequest.current) return;
    playRequest.current = true;
    try {
      if (isPlaying) {
        const position = audio.currentTime;
        audio.pause();
        setPausedTime(position);
        await socketService.pause(currentFrequency, position);
        setIsPlaying(false);
      } else {
        audio.currentTime = pausedTime;
        audio.audioCtx?.resume().catch(() => {});
        await audio.play();
        await socketService.play(currentFrequency, audio.currentTime);
        setIsPlaying(true);
      }
    } catch (err) {
      if (!isPlaying) audio.pause();
      setError(err.message);
    } finally {
      playRequest.current = false;
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
    if (audioRef.current && trackUrl) {
      const position = restoredTime.current;
      restoredTime.current = 0;
      setDuration(0);
      setPlaybackTime(position);
      setPausedTime(position);
      const audio = audioRef.current;
      const restorePosition = () => { audio.currentTime = position; };
      if (audio.readyState >= 1) restorePosition();
      else audio.addEventListener('loadedmetadata', restorePosition, { once: true });
      return () => audio.removeEventListener('loadedmetadata', restorePosition);
    }
  }, [trackId, trackUrl]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && audioRef.current.paused) {
        audioRef.current.play().catch(err => console.error('Playback error:', err));
      } else if (!isPlaying && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, trackId, trackUrl]);

  const selectTrack = async (index) => {
    if (playRequest.current || !playlist[index]) return;
    try {
      await socketService.changeTrack(currentFrequency, index);
      if (playlist[index].id === trackId && audioRef.current) {
        audioRef.current.currentTime = 0;
        if (isPlaying) await audioRef.current.play();
      }
    } catch (err) { setError(err.message); }
  };

  const handleSkipTrack = () => {
    const index = playlist.findIndex(track => track.id === trackId);
    return selectTrack((index + 1) % playlist.length);
  };

  const handlePreviousTrack = () => {
    const index = playlist.findIndex(track => track.id === trackId);
    return selectTrack((index - 1 + playlist.length) % playlist.length);
  };

  const transport = {
    play: handlePlayPause, previous: handlePreviousTrack, next: handleSkipTrack,
    seek: handleSeek, select: selectTrack, upload: handleFileUpload,
  };

  return (
    <StationWorkspace audioRef={audioRef} duration={duration} currentTime={playbackTime}
      transport={transport} importPlaylist={() => importDialog.current?.showModal()}>
      <dialog ref={importDialog} className="workspace-dialog" aria-labelledby="import-title">
        <div className="workspace-section-header">
          <h2 id="import-title">Import playlist</h2>
          <button type="button" className="icon-button" aria-label="Close import" onClick={() => importDialog.current?.close()}><X /></button>
        </div>
        <form onSubmit={importYoutube}>
          <label htmlFor="youtube-playlist">YouTube playlist URL</label>
          <input id="youtube-playlist" type="url" required value={youtubeUrl}
            onChange={event => setYoutubeUrl(event.target.value)}
            placeholder="https://music.youtube.com/playlist?list=..."
            disabled={youtubeJob?.running} />
          {youtubeJob && !youtubeJob.entries && <div role="status" className="import-status">
            <p>{youtubeJob.message}</p>
            {youtubeJob.total > 0 && <>
              <progress aria-label="Import progress" max={youtubeJob.total} value={youtubeJob.processed || 0} />
              <small>{youtubeJob.imported || 0} added · {youtubeJob.failed || 0} skipped</small>
            </>}
          </div>}
          <div className="queue-actions">
            <button type="submit" className="primary-action" disabled={youtubeJob?.running}>Import playlist</button>
            {youtubeJob?.running && <button type="button" onClick={() => socketService.socket.emit('host:cancel-youtube')}>Cancel import</button>}
          </div>
        </form>
      </dialog>
        <audio
          preload="none"
          ref={audioRef}
          src={trackUrl}
          crossOrigin="anonymous"
          style={{ display: 'none' }}
          onLoadedMetadata={(e) => setDuration(e.target.duration || currentTrack?.duration || 0)}
          onTimeUpdate={(e) => setPlaybackTime(e.target.currentTime)}
          onEnded={() => handleSkipTrack()}
        />
    </StationWorkspace>
  );
};
