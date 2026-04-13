import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useRadioStore } from '../store/useRadioStore';

export const StationHelmet = () => {
  const currentFrequency = useRadioStore((state) => state.currentFrequency);
  const hostName = useRadioStore((state) => state.hostName);
  const listenerCount = useRadioStore((state) => state.listenerCount);
  const isPlaying = useRadioStore((state) => state.isPlaying);

  if (!currentFrequency) return null;

  const title = `Live Now: ${hostName || 'Station'} on FM ${currentFrequency}`;
  const description = `Join ${listenerCount || 0} listeners tuning into ${hostName || 'Station'} for synchronized, real-time playback.`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BroadcastEvent",
    "name": `Live Audio: frequency ${currentFrequency} by ${hostName || 'Host'}`,
    "broadcastOfEvent": {
      "@type": "Event",
      "name": "Synchronized Virtual Listening Session"
    },
    "isLiveBroadcast": true,
    "videoFormat": "Audio-only",
    "about": {
      "@type": "AudioObject",
      "description": "Real-time synchronized audio stream hosted on Virtual Radio."
    }
  };

  return (
    <Helmet>
      <title>{title} | Virtual Radio</title>
      <meta name="description" content={description} />
      
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="music.radio_station" />
      <meta property="og:url" content={typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/station/${currentFrequency}` : ''} />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:label1" content="Listeners" />
      <meta name="twitter:data1" content={(listenerCount || 0).toString()} />
      <meta name="twitter:label2" content="Status" />
      <meta name="twitter:data2" content={isPlaying ? "Live" : "Paused"} />

      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};
