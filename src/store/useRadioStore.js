import create from 'zustand';

export const useRadioStore = create((set) => ({
  // Authentication
  userRole: null, // 'host' or 'listener'
  userName: '',
  userId: null,

  // Station state
  currentFrequency: null,
  stations: [],
  isConnected: false,

  // Playback state
  currentTrack: null,
  playlist: [],
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  listenerCount: 0,
  hostName: '',

  // UI state
  showHostPanel: false,
  showJoinPanel: true,
  uploadProgress: 0,
  error: null,
  message: null,

  // Actions
  setUserRole: (role) => set({ userRole: role }),
  setUserName: (name) => set({ userName: name }),
  setUserId: (id) => set({ userId: id }),
  setCurrentFrequency: (freq) => set({ currentFrequency: freq }),
  setStations: (stations) => set({ stations }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setPlaylist: (playlist) => set({ playlist }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setListenerCount: (count) => set({ listenerCount: count }),
  setHostName: (name) => set({ hostName: name }),
  setShowHostPanel: (show) => set({ showHostPanel: show }),
  setShowJoinPanel: (show) => set({ showJoinPanel: show }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setError: (error) => set({ error }),
  setMessage: (message) => set({ message }),

  // Reset
  reset: () =>
    set({
      userRole: null,
      userName: '',
      userId: null,
      currentFrequency: null,
      stations: [],
      isConnected: false,
      currentTrack: null,
      playlist: [],
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      listenerCount: 0,
      hostName: '',
      showHostPanel: false,
      showJoinPanel: true,
      uploadProgress: 0,
      error: null,
      message: null,
    }),
}));
