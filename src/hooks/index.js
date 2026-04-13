import { useEffect, useRef } from 'react';
import { useRadioStore } from '../store/useRadioStore';
import { socketService } from '../utils/socketService';

export const useSocketListener = () => {
  const setCurrentTrack = useRadioStore((state) => state.setCurrentTrack);
  const setPlaylist = useRadioStore((state) => state.setPlaylist);
  const setIsPlaying = useRadioStore((state) => state.setIsPlaying);
  const setCurrentTime = useRadioStore((state) => state.setCurrentTime);
  const setListenerCount = useRadioStore((state) => state.setListenerCount);
  const setStations = useRadioStore((state) => state.setStations);
  const setError = useRadioStore((state) => state.setError);
  const setMessage = useRadioStore((state) => state.setMessage);

  useEffect(() => {
    // Playlist updated
    socketService.onPlaylistUpdated((data) => {
      setPlaylist(data.tracks);
      setCurrentTrack(data.currentTrack);
      setMessage('Playlist updated');
    });

    // Play event
    socketService.onPlay((data) => {
      setIsPlaying(true);
      setCurrentTime(data.currentTime);
    });

    // Pause event
    socketService.onPause((data) => {
      setIsPlaying(false);
      setCurrentTime(data.currentTime);
    });

    // Track changed
    socketService.onTrackChanged((data) => {
      setCurrentTrack(data.currentTrack);
      setCurrentTime(data.currentTime);
      setIsPlaying(data.isPlaying);
    });

    // Seeked
    socketService.onSeeked((data) => {
      setCurrentTime(data.currentTime);
    });

    // Listener count updated
    socketService.onListenerCountUpdated((data) => {
      setListenerCount(data.listenerCount);
    });

    // Station closed
    socketService.onStationClosed((data) => {
      setError(data.message);
      setMessage('Station closed by host');
    });

    // Stations updated
    socketService.onStationsUpdated((data) => {
      setStations(data);
    });

    return () => {
      socketService.offPlaylistUpdated();
      socketService.offPlay();
      socketService.offPause();
      socketService.offTrackChanged();
      socketService.offSeeked();
      socketService.offListenerCountUpdated();
      socketService.offStationClosed();
      socketService.offStationsUpdated();
    };
  }, [
    setCurrentTrack,
    setPlaylist,
    setIsPlaying,
    setCurrentTime,
    setListenerCount,
    setStations,
    setError,
    setMessage,
  ]);
};

/**
 * Hook to handle audio synchronization for listeners
 * Ensures client audio stays in sync with server state
 */
export const useSyncedAudio = (audioRef, userRole, currentFrequency) => {
  const currentTime = useRadioStore((state) => state.currentTime);
  const isPlaying = useRadioStore((state) => state.isPlaying);
  const setCurrentTime = useRadioStore((state) => state.setCurrentTime);

  const lastSyncTimeRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || userRole !== 'listener') return;

    // Update local playback time
    const handleTimeUpdate = async () => {
      const localTime = audio.currentTime;
      setCurrentTime(localTime);

      // Periodic sync every 3 seconds
      if ((Date.now() - (lastSyncTimeRef.current || 0)) > 3000) {
        lastSyncTimeRef.current = Date.now();
        try {
          const response = await socketService.syncRequest(currentFrequency, localTime);

          if (response.correctionNeeded) {
            // Correct playback drift
            const offset = response.offset;
            if (Math.abs(offset) > 0.5) {
              audio.currentTime = response.serverTime;
              console.log(
                `🔄 Corrected drift: ${offset.toFixed(2)}s, serverTime: ${response.serverTime.toFixed(2)}s`
              );
            }
          }
        } catch (error) {
          console.error('Sync error:', error);
        }
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioRef, userRole, currentFrequency, setCurrentTime]);

  // Handle play/pause from server
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      // Sync to server time
      if (Math.abs(audioRef.current.currentTime - currentTime) > 0.5) {
        audioRef.current.currentTime = currentTime;
      }
      audioRef.current.play().catch((e) => console.error('Play error:', e));
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = currentTime;
    }
  }, [isPlaying, currentTime, audioRef]);
};
