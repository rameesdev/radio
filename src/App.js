import React, { useEffect, useState } from 'react';
import { useRadioStore } from './store/useRadioStore';
import { socketService } from './utils/socketService';
import { RoleSelector } from './components/RoleSelector';
import { HostPanel } from './components/HostPanel';
import { ListenerPanel } from './components/ListenerPanel';
import './App.css';

function App() {
  const userRole = useRadioStore((state) => state.userRole);
  const showHostPanel = useRadioStore((state) => state.showHostPanel);
  const showJoinPanel = useRadioStore((state) => state.showJoinPanel);
  const isConnected = useRadioStore((state) => state.isConnected);
  const error = useRadioStore((state) => state.error);
  const message = useRadioStore((state) => state.message);
  const setIsConnected = useRadioStore((state) => state.setIsConnected);
  const setStations = useRadioStore((state) => state.setStations);
  const reset = useRadioStore((state) => state.reset);

  const [notification, setNotification] = useState('');

  useEffect(() => {
    // Connect to Socket.IO server
    // Use environment variable if set, otherwise use current host with port 5000
    let socketUrl = process.env.REACT_APP_SOCKET_URL;
    if (!socketUrl) {
      const host = window.location.hostname;
      const protocol = window.location.protocol;
      socketUrl = `${protocol}//${host}:5000`;
    }
    const socket = socketService.connect(socketUrl);

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Disconnected');
    });

    // Fetch initial stations
    const fetchStations = async () => {
      try {
        const stations = await socketService.getStations();
        setStations(stations);
      } catch (err) {
        console.error('Error fetching stations:', err);
      }
    };

    const stationsInterval = setInterval(fetchStations, 5000);
    fetchStations();

    return () => {
      clearInterval(stationsInterval);
    };
  }, [setIsConnected, setStations]);

  // Show notifications
  useEffect(() => {
    if (message) {
      setNotification(message);
      const timer = setTimeout(() => setNotification(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (error) {
      setNotification(error);
      const timer = setTimeout(() => setNotification(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="app">
      <div className="status-bar">
        <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
        {userRole && (
          <button className="btn-logout" onClick={reset}>
            🚪 Leave
          </button>
        )}
      </div>

      {notification && <div className="notification">{notification}</div>}

      <main className="main-content">
        {!userRole ? (
          <div className="entry-flow">
            <RoleSelector />
          </div>
        ) : userRole === 'host' && showHostPanel ? (
          <HostPanel />
        ) : userRole === 'listener' ? (
          <ListenerPanel />
        ) : null}
      </main>
    </div>
  );
}

export default App;
