import io from 'socket.io-client';

export class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(url = 'http://localhost:5000') {
    if (this.socket?.connected) return this.socket;

    this.socket = io(url, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  // Host Methods
  createStation(frequency, hostName) {
    return new Promise((resolve, reject) => {
      this.socket.emit('host:create-station', { frequency, hostName }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.message));
        }
      });
    });
  }

  uploadTracks(frequency, tracks) {
    return new Promise((resolve, reject) => {
      this.socket.emit('host:upload-track', { frequency, tracks }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.message));
        }
      });
    });
  }

  play(frequency, currentTime = 0) {
    return new Promise((resolve, reject) => {
      this.socket.emit('host:play', { frequency, currentTime }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.message));
        }
      });
    });
  }

  pause(frequency, currentTime) {
    return new Promise((resolve, reject) => {
      this.socket.emit('host:pause', { frequency, currentTime }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.message));
        }
      });
    });
  }

  changeTrack(frequency, trackIndex) {
    return new Promise((resolve, reject) => {
      this.socket.emit('host:change-track', { frequency, trackIndex }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.message));
        }
      });
    });
  }

  seek(frequency, currentTime) {
    return new Promise((resolve, reject) => {
      this.socket.emit('host:seek', { frequency, currentTime }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.message));
        }
      });
    });
  }

  // Listener Methods
  joinStation(frequency, userName) {
    return new Promise((resolve, reject) => {
      this.socket.emit('listener:join', { frequency, userName }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.message));
        }
      });
    });
  }

  syncRequest(frequency, localTime) {
    return new Promise((resolve) => {
      this.socket.emit('listener:sync-request', { frequency, localTime }, (response) => {
        resolve(response);
      });
    });
  }

  fullSync(frequency) {
    return new Promise((resolve, reject) => {
      this.socket.emit('listener:full-sync', { frequency }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error('Sync failed'));
        }
      });
    });
  }

  // Utility Methods
  getStations() {
    return new Promise((resolve) => {
      this.socket.emit('util:get-stations', (response) => {
        resolve(response.stations || []);
      });
    });
  }

  getStation(frequency) {
    return new Promise((resolve, reject) => {
      this.socket.emit('util:get-station', { frequency }, (response) => {
        if (response.success) {
          resolve(response.station);
        } else {
          reject(new Error(response.message));
        }
      });
    });
  }

  // Event Listeners
  onStationCreated(callback) {
    this.socket.on('server:station-created', callback);
  }

  onPlaylistUpdated(callback) {
    this.socket.on('server:playlist-updated', callback);
  }

  onPlay(callback) {
    this.socket.on('server:play', callback);
  }

  onPause(callback) {
    this.socket.on('server:pause', callback);
  }

  onTrackChanged(callback) {
    this.socket.on('server:track-changed', callback);
  }

  onSeeked(callback) {
    this.socket.on('server:seeked', callback);
  }

  onListenerCountUpdated(callback) {
    this.socket.on('server:listener-count-updated', callback);
  }

  onStationClosed(callback) {
    this.socket.on('server:station-closed', callback);
  }

  onStationsUpdated(callback) {
    this.socket.on('server:stations-updated', callback);
  }

  // Remove listeners
  offStationCreated() {
    this.socket.off('server:station-created');
  }

  offPlaylistUpdated() {
    this.socket.off('server:playlist-updated');
  }

  offPlay() {
    this.socket.off('server:play');
  }

  offPause() {
    this.socket.off('server:pause');
  }

  offTrackChanged() {
    this.socket.off('server:track-changed');
  }

  offSeeked() {
    this.socket.off('server:seeked');
  }

  offListenerCountUpdated() {
    this.socket.off('server:listener-count-updated');
  }

  offStationClosed() {
    this.socket.off('server:station-closed');
  }

  offStationsUpdated() {
    this.socket.off('server:stations-updated');
  }

  // ============ VOICE CHAT (WebRTC Signaling) ============

  micStart(frequency, userName, userId) {
    this.socket?.emit('voice:mic-start', { frequency, userName, userId });
  }

  micStop(frequency, userName) {
    this.socket?.emit('voice:mic-stop', { frequency, userName });
  }

  sendVoiceOffer(targetSocketId, offer, userName) {
    this.socket?.emit('voice:offer', { targetSocketId, offer, userName });
  }

  sendVoiceAnswer(targetSocketId, answer) {
    this.socket?.emit('voice:answer', { targetSocketId, answer });
  }

  sendIceCandidate(targetSocketId, candidate) {
    this.socket?.emit('voice:ice-candidate', { targetSocketId, candidate });
  }

  onVoiceUserStarted(callback) {
    this.socket?.on('server:voice-user-started', callback);
  }

  onVoiceUserStopped(callback) {
    this.socket?.on('server:voice-user-stopped', callback);
  }

  onVoiceOffer(callback) {
    this.socket?.on('server:voice-offer', callback);
  }

  onVoiceAnswer(callback) {
    this.socket?.on('server:voice-answer', callback);
  }

  onVoiceIceCandidate(callback) {
    this.socket?.on('server:voice-ice-candidate', callback);
  }

  offVoiceEvents() {
    this.socket?.off('server:voice-user-started');
    this.socket?.off('server:voice-user-stopped');
    this.socket?.off('server:voice-offer');
    this.socket?.off('server:voice-answer');
    this.socket?.off('server:voice-ice-candidate');
  }

  getSocketId() {
    return this.socket?.id || null;
  }
}

export const socketService = new SocketService();
