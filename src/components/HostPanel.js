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
  const setPlaylist = useRadioStore((state) => state.setPlaylist);
  const setCurrentTrack = useRadioStore((state) => state.setCurrentTrack);
  const setIsPlaying = useRadioStore((state) => state.setIsPlaying);
  const setMessage = useRadioStore((state) => state.setMessage);
  const setError = useRadioStore((state) => state.setError);

  const [duration, setDuration] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [pausedTime, setPausedTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // THIS IS THE MASTER AUDIO REFERENCE
  const audioRef = useRef(null);
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

      const updatedPlaylist = [...playlist, ...newTracks];
      await socketService.uploadTracks(currentFrequency, updatedPlaylist);
      setPlaylist(updatedPlaylist);
      
      if (!currentTrack) setCurrentTrack(updatedPlaylist[0]);
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
      setPlaybackTime(0);
      setPausedTime(0);
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error('Playback error:', err));
      }
    }
  }, [currentTrack, isPlaying]);

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