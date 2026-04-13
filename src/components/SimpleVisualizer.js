import React, { useEffect, useRef, useState } from 'react';
import './AudioVisualizer.css';

export const SimpleVisualizer = ({ audioRef }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const vuCanvasRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);

  const handleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!audioRef?.current || !canvasRef?.current || !vuCanvasRef?.current) {
      return;
    }

    const canvas = canvasRef.current;
    const vuCanvas = vuCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const vx = vuCanvas.getContext('2d');
    const audioElement = audioRef.current;

    let audioCtx = null;
    let analyser = null;
    let animId = null;
    let initialized = false;

    const initAudio = () => {
      if (initialized) return;

      try {
        // Create audio context with better support
        const AudioCtx = window.AudioContext || window.webkitAudioContext || window.mozAudioContext;
        if (!AudioCtx) {
          console.error('❌ Web Audio API not supported');
          return;
        }

        audioCtx = new AudioCtx();
        console.log('✅ AudioContext created, state:', audioCtx.state);

        // Resume if needed (mobile browsers)
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(e => console.warn('Could not resume context:', e));
        }

        // Create analyser
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;
        console.log('✅ Analyser created');

        // Try to connect audio element to analyser
        try {
          console.log('🔧 Attempting to create MediaElementAudioSource...');
          console.log('audioCtx type:', typeof audioCtx);
          console.log('audioCtx.createMediaElementAudioSource:', typeof audioCtx.createMediaElementAudioSource);
          
          if (typeof audioCtx.createMediaElementAudioSource === 'function') {
            const source = audioCtx.createMediaElementAudioSource(audioElement);
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
            console.log('✅ Connected via MediaElementAudioSource');
          } else {
            console.warn('⚠️  MediaElementAudioSource not available, using fallback');
            analyser.connect(audioCtx.destination);
          }
        } catch (e) {
          console.warn('⚠️  Could not connect MediaElementAudioSource:', e.message);
          // Even without source connection, analyser might work
          analyser.connect(audioCtx.destination);
        }

        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        initialized = true;
        console.log('✅✅✅ Visualizer fully initialized and ready');
      } catch (error) {
        console.error('❌ Initialization error:', error);
        initialized = false;
      }
    };

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 600;
      canvas.height = 260;
      vuCanvas.width = Math.max((vuCanvas.parentElement?.clientWidth || 100) - 28, 100);
      vuCanvas.height = 22;
    };

    const drawVu = (level) => {
      vx.fillStyle = '#060402';
      vx.fillRect(0, 0, vuCanvas.width, vuCanvas.height);
      const segs = 50;
      const sw = vuCanvas.width / segs - 1;
      const lit = Math.floor(level * segs);

      for (let i = 0; i < segs; i++) {
        const active = i < lit;
        vx.fillStyle = active ? (i < segs * 0.68 ? '#d4a042' : i < segs * 0.86 ? '#ffa500' : '#ff2200') : '#1a0d00';
        vx.fillRect(i * (vuCanvas.width / segs), 1, sw, vuCanvas.height - 2);
      }
    };

    const drawBars = (freq, W, H) => {
      const bars = 80;
      const bw = (W / bars) * 0.75;
      for (let i = 0; i < bars; i++) {
        const v = Math.min((freq[Math.floor((i / bars) * 256)] / 255) * 1.5, 1.3);
        const h = v * (H - 30);
        const x = (i / bars) * W + (W / bars) * 0.125;
        ctx.fillStyle = v > 1 ? '#ff2200' : `hsl(${35 + (i / bars) * 40}, 80%, ${15 + v * 35}%)`;
        ctx.fillRect(x, H - h - 20, bw, h);
      }
    };

    const draw = () => {
      if (!initialized) {
        initAudio();
      }

      animId = requestAnimationFrame(draw);

      const W = canvas.width;
      const H = canvas.height;

      // Clear canvas
      ctx.fillStyle = '#060402';
      ctx.fillRect(0, 0, W, H);

      // Draw grid
      ctx.strokeStyle = 'rgba(60,30,5,0.06)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += W / 8) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      let avg = 0;

      if (analyser && dataArrayRef.current) {
        try {
          analyser.getByteFrequencyData(dataArrayRef.current);
          const freq = dataArrayRef.current;

          // Calculate average
          for (let i = 0; i < freq.length; i++) avg += freq[i];
          avg /= freq.length * 255;

          // Draw if we have audio
          if (avg > 0.01) {
            drawBars(freq, W, H);
          } else {
            // Show message
            ctx.fillStyle = '#8b6f47';
            ctx.font = '11px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('NO SIGNAL', W / 2, H / 2);
          }
        } catch (e) {
          console.error('Draw error:', e.message);
        }
      } else {
        // Still initializing
        ctx.fillStyle = '#d4a042';
        ctx.font = '11px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('INITIALIZING...', W / 2, H / 2);
      }

      // Always draw VU
      drawVu(avg);
    };

    resize();
    window.addEventListener('resize', resize);

    // Initialize on user interaction
    const handleInput = () => {
      if (!initialized) {
        initAudio();
      }
    };

    document.addEventListener('click', handleInput);
    document.addEventListener('touchstart', handleInput);
    audioElement.addEventListener('play', handleInput);
    audioElement.addEventListener('loadedmetadata', handleInput);

    // Start animation
    draw();

    // Cleanup
    return () => {
      if (animId) cancelAnimationFrame(animId);
      document.removeEventListener('click', handleInput);
      document.removeEventListener('touchstart', handleInput);
      audioElement.removeEventListener('play', handleInput);
      audioElement.removeEventListener('loadedmetadata', handleInput);
      window.removeEventListener('resize', resize);

      if (audioCtx && audioCtx.state !== 'closed') {
        try {
          audioCtx.close();
        } catch (e) {
          // Already closed
        }
      }
    };
  }, [audioRef]);

  return (
    <div className={`audio-visualizer-container ${isFullscreen ? 'fullscreen-active' : ''}`} ref={containerRef}>
      <style>{visualizerStyles}</style>

      <div className="visualizer-header">
        <span className="visualizer-title">Sonoscope AV-2077</span>
        <button className="fullscreen-btn" onClick={handleFullscreen} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
          ⛶
        </button>
      </div>

      <div id="canvas-wrap" className="visualizer-canvas-wrap">
        <canvas id="main-canvas" ref={canvasRef}></canvas>
        <div id="flash-overlay" className="visualizer-flash-overlay"></div>
      </div>

      <div id="vu-row" className="visualizer-vu-row">
        <span className="vu-lbl">VU</span>
        <canvas id="vu-canvas" ref={vuCanvasRef}></canvas>
      </div>

      <div id="botbar" className="visualizer-botbar">
        <div className="visualizer-mode-name">BARS MODE</div>
      </div>
    </div>
  );
};

const visualizerStyles = `
.audio-visualizer-container{font-family:'Courier New',monospace;padding:12px;background:#0d0a06;display:flex;flex-direction:column;gap:10px;border-radius:10px;border:1px solid #2a1a08;margin:15px 0;position:relative}
.audio-visualizer-container.fullscreen-active{position:fixed;inset:0;width:100vw;height:100vh;max-width:none;margin:0;border-radius:0;padding:0;gap:0;z-index:10000}
.visualizer-header{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(26,13,0,0.8);border-bottom:1px solid #2a1a08}
.visualizer-title{font-size:11px;color:#d4a042;letter-spacing:2px;font-weight:bold}
.fullscreen-btn{background:#1a0d00;border:1px solid #2a1a08;color:#d4a042;padding:4px 8px;border-radius:3px;cursor:pointer;font-size:14px;transition:all 0.15s}
.fullscreen-btn:hover{border-color:#d4a042;background:#2a1a08}
.visualizer-canvas-wrap{position:relative;border-radius:8px;overflow:hidden;border:1px solid #2a1a08;min-height:260px;flex:1}
.audio-visualizer-container.fullscreen-active .visualizer-canvas-wrap{border-radius:0;border:none;min-height:auto}
#main-canvas{display:block;width:100%;height:260px}
.audio-visualizer-container.fullscreen-active #main-canvas{height:100vh}
#vu-row{display:flex;gap:8px;align-items:center;height:28px}
.vu-lbl{font-size:8px;color:#5a3a18;letter-spacing:1px;min-width:18px}
#vu-canvas{flex:1;height:22px;display:block;border-radius:3px;overflow:hidden}
.visualizer-botbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;padding:8px;background:rgba(26,13,0,0.5);border-radius:6px}
.visualizer-mode-name{font-size:9px;color:#d4a042;letter-spacing:2px;font-weight:bold}
`;
