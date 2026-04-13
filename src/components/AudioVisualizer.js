import React, { useEffect, useRef, useState } from 'react';
import './AudioVisualizer.css';

export const AudioVisualizer = ({ audioRef }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const vuCanvasRef = useRef(null);
  const visualizerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!audioRef?.current || !canvasRef?.current) return;

    // Initialize visualizer
    const visualizer = initializeVisualizer(audioRef.current, canvasRef.current, vuCanvasRef.current);
    visualizerRef.current = visualizer;

    return () => {
      if (visualizer?.animId) {
        cancelAnimationFrame(visualizer.animId);
      }
      if (visualizer?.audioCtx && visualizer.audioCtx.state !== 'closed') {
        try {
          visualizer.audioCtx.close();
        } catch (e) {
          // Already closed
        }
      }
    };
  }, [audioRef]);

  const handleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        } else if (containerRef.current.webkitRequestFullscreen) {
          await containerRef.current.webkitRequestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        } else if (document.webkitFullscreenElement) {
          await document.webkitExitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!document.webkitFullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className={`audio-visualizer-container ${isFullscreen ? 'fullscreen-active' : ''}`} ref={containerRef}>
      <style>{visualizerStyles}</style>
      
      <div className="visualizer-header">
        <span className="visualizer-title">Sonoscope AV-2077</span>
        <button className="fullscreen-btn" onClick={handleFullscreen} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
          {isFullscreen ? '⛶' : '⛶'}
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

      <div id="theme-row" className="visualizer-theme-row">
        <span className="theme-lbl">THEME:</span>
        <div className="theme-dot active" data-theme="amber" style={{ background: '#d4a042' }}></div>
        <div className="theme-dot" data-theme="synthwave" style={{ background: '#cc44ff' }}></div>
        <div className="theme-dot" data-theme="acid" style={{ background: '#44ff00' }}></div>
        <div className="theme-dot" data-theme="blood" style={{ background: '#ff2200' }}></div>
        <div className="theme-dot" data-theme="ice" style={{ background: '#00ccff' }}></div>
        <div className="theme-dot" data-theme="gold" style={{ background: '#ffdd00' }}></div>
        <div className="theme-dot" data-theme="rose" style={{ background: '#ff44aa' }}></div>
      </div>

      <div id="mode-wrap" className="visualizer-mode-wrap">
        <div id="mode-btns" className="visualizer-mode-btns">
          <button className="mbtn active" data-mode="bars">BARS</button>
          <button className="mbtn" data-mode="mirror_bars">MIRROR</button>
          <button className="mbtn" data-mode="waterfall">WATERFALL</button>
          <button className="mbtn" data-mode="bars3d">3D BARS</button>
          <button className="mbtn" data-mode="wave">WAVE</button>
          <button className="mbtn" data-mode="mirror_wave">MIRROR WAVE</button>
          <button className="mbtn" data-mode="tunnel">TUNNEL</button>
          <button className="mbtn" data-mode="lissajous">LISSAJOUS</button>
          <button className="mbtn" data-mode="radial">RADIAL</button>
          <button className="mbtn" data-mode="kaleidoscope">KALEIDO</button>
          <button className="mbtn" data-mode="mandala">MANDALA</button>
          <button className="mbtn" data-mode="polygon">POLYGON</button>
          <button className="mbtn" data-mode="dna">DNA</button>
          <button className="mbtn" data-mode="particles">PARTICLES</button>
          <button className="mbtn" data-mode="starfield">STARFIELD</button>
          <button className="mbtn" data-mode="aurora">AURORA</button>
          <button className="mbtn" data-mode="blackhole">BLACKHOLE</button>
          <button className="mbtn" data-mode="vinyl">VINYL</button>
          <button className="mbtn" data-mode="pixel_matrix">PIXELS</button>
        </div>
      </div>

      <div id="ctrl-row" className="visualizer-ctrl-row">
        <div className="kg">
          <div className="knob" id="k-gain"><div className="kdot" id="kd-gain"></div></div>
          <span className="klbl">GAIN</span>
          <span className="kval" id="kv-gain">1.5</span>
        </div>
        <div className="kg">
          <div className="knob" id="k-smooth"><div className="kdot" id="kd-smooth"></div></div>
          <span className="klbl">SMOOTH</span>
          <span className="kval" id="kv-smooth">0.80</span>
        </div>
        <div className="kg">
          <div className="knob" id="k-zoom"><div className="kdot" id="kd-zoom"></div></div>
          <span className="klbl">ZOOM</span>
          <span className="kval" id="kv-zoom">1.0</span>
        </div>
        <div id="right-ctrl" className="visualizer-right-ctrl">
          <div className="icon-btns">
            <button className="ibtn" id="btn-auto">AUTO</button>
            <button className="ibtn" id="btn-shake">SHAKE</button>
            <button className="ibtn" id="btn-trails">TRAILS</button>
            <button className="ibtn" id="btn-hue">HUE</button>
          </div>
        </div>
      </div>

      <div id="botbar" className="visualizer-botbar">
        <div id="mode-name" className="visualizer-mode-name">BARS</div>
      </div>
    </div>
  );
};

const visualizerStyles = `
.audio-visualizer-container{font-family:'Courier New',monospace;padding:12px;background:#0d0a06;display:flex;flex-direction:column;gap:10px;border-radius:10px;border:1px solid #2a1a08}
#canvas-wrap{position:relative;border-radius:8px;overflow:hidden;border:1px solid #2a1a08}
#main-canvas{display:block;width:100%;height:260px}
#flash-overlay{position:absolute;inset:0;pointer-events:none;opacity:0;border-radius:8px;transition:opacity .05s}
#vu-row{display:flex;gap:8px;align-items:center;height:28px}
.vu-lbl{font-size:8px;color:#5a3a18;letter-spacing:1px;min-width:18px}
#vu-canvas{flex:1;height:22px;display:block;border-radius:3px;overflow:hidden}
.visualizer-theme-row{display:flex;gap:5px;flex-wrap:wrap;align-items:center}
.theme-dot{width:18px;height:18px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:border-color .15s,transform .15s}
.theme-dot.active{border-color:#fff;transform:scale(1.2)}
.theme-lbl{font-size:8px;color:#5a3a18;letter-spacing:1px}
.visualizer-mode-wrap{overflow-x:auto;padding-bottom:2px;-webkit-overflow-scrolling:touch}
.visualizer-mode-wrap::-webkit-scrollbar{height:3px}
.visualizer-mode-wrap::-webkit-scrollbar-track{background:#0d0a06}
.visualizer-mode-wrap::-webkit-scrollbar-thumb{background:#3a2208;border-radius:2px}
#mode-btns{display:flex;gap:4px;width:max-content;padding:2px 0}
.mbtn{background:#1a0d00;border:1px solid #2a1a08;border-radius:4px;color:#3a2208;font-family:'Courier New',monospace;font-size:8px;letter-spacing:1px;padding:4px 8px;cursor:pointer;white-space:nowrap;transition:all .12s;flex-shrink:0}
.mbtn:hover{border-color:#5a3a18;color:#5a3a18}
.mbtn.active{border-color:#d4a042;color:#d4a042;background:#2a1a08}
.visualizer-ctrl-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.kg{display:flex;flex-direction:column;align-items:center;gap:3px}
.klbl{font-size:8px;color:#5a3a18;letter-spacing:1px}
.kval{font-size:8px;color:#d4a042;min-width:26px;text-align:center}
.knob{width:34px;height:34px;border-radius:50%;background:#1a0d00;border:2px solid #3a2208;position:relative;cursor:ns-resize;user-select:none;touch-action:none;transition:border-color .15s}
.knob:hover{border-color:#d4a042}
.kdot{width:4px;height:4px;background:#d4a042;border-radius:50%;position:absolute;top:3px;left:50%;transform-origin:2px 14px;transform:translateX(-50%)}
.visualizer-right-ctrl{flex:1;display:flex;flex-direction:column;gap:6px;align-items:flex-end}
.icon-btns{display:flex;gap:6px}
.ibtn{background:#1a0d00;border:1px solid #2a1a08;border-radius:5px;color:#5a3a18;font-family:'Courier New',monospace;font-size:9px;padding:5px 8px;cursor:pointer;transition:all .15s;letter-spacing:1px}
.ibtn:hover{border-color:#d4a042;color:#d4a042}
.ibtn.active{border-color:#ff8800;color:#ff8800;background:#2a1000}
.visualizer-botbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px}
.visualizer-mode-name{font-size:9px;color:#3a2208;letter-spacing:2px}
`;

function initializeVisualizer(audioElement, canvas, vuCanvas) {
  const ctx = canvas.getContext('2d');
  const vx = vuCanvas.getContext('2d');
  const flash = document.querySelector('#flash-overlay');

  let audioCtx = null;
  let isInitialized = false;
  let analyser = null;
  let source = null;
  let gainNode = null;
  let animId = null;

  let mode = 'bars';
  let gain = 1.5;
  let smooth = 0.8;
  let zoom = 1.0;
  let wfBuf = null;
  let wfCtx = null;
  let particles = [];
  let stars = [];
  let lissHist = [];
  let phaseHue = 0;
  let hueCycle = false;
  let shakeOn = false;
  let trailsOn = false;
  let autoOn = false;
  let autoTimer = 0;
  const autoInterval = 6000;
  let peakHold = 0;
  let peakTimer = 0;
  let flashAlpha = 0;
  let shakeX = 0;
  let shakeY = 0;
  let energySmooth = 0;

  const THEMES = {
    amber: { h: 35, s: 80, base: '#d4a042', flash: 'rgba(255,180,0,' },
    synthwave: { h: 280, s: 90, base: '#cc44ff', flash: 'rgba(180,0,255,' },
    acid: { h: 100, s: 100, base: '#44ff00', flash: 'rgba(100,255,0,' },
    blood: { h: 0, s: 100, base: '#ff2200', flash: 'rgba(255,30,0,' },
    ice: { h: 195, s: 100, base: '#00ccff', flash: 'rgba(0,200,255,' },
    gold: { h: 48, s: 100, base: '#ffdd00', flash: 'rgba(255,220,0,' },
    rose: { h: 330, s: 90, base: '#ff44aa', flash: 'rgba(255,50,150,' },
  };
  let theme = THEMES.amber;
  let currentThemeKey = 'amber';

  const modes = ['bars','mirror_bars','waterfall','bars3d','wave','mirror_wave','tunnel','lissajous','radial','kaleidoscope','mandala','polygon','dna','particles','starfield','aurora','blackhole','vinyl','pixel_matrix'];
  const modeNames = {bars:'BARS',mirror_bars:'MIRROR BARS',waterfall:'WATERFALL',bars3d:'3D BARS',wave:'WAVEFORM',mirror_wave:'MIRROR WAVE',tunnel:'TUNNEL',lissajous:'LISSAJOUS',radial:'RADIAL',kaleidoscope:'KALEIDOSCOPE',mandala:'MANDALA',polygon:'POLYGON',dna:'DNA HELIX',particles:'PARTICLES',starfield:'STAR FIELD',aurora:'AURORA',blackhole:'BLACK HOLE',vinyl:'VINYL',pixel_matrix:'PIXELS'};

  function th(lightness, sat) {
    const s = sat !== undefined ? sat : theme.s;
    return `hsl(${theme.h},${s}%,${lightness}%)`;
  }

  function hsl(h, s, l) {
    return `hsl(${h},${s}%,${l}%)`;
  }

  function initAudio() {
    if (isInitialized) return;
    try {
      // Validate audio element
      if (!audioElement) {
        console.error('❌ Audio element not found');
        return;
      }

      // Create audio context if not exists
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          console.error('❌ Web Audio API not supported');
          return;
        }
        audioCtx = new AudioContextClass();
        console.log('✅ AudioContext created:', audioCtx.state);
      }

      // Verify audioCtx is valid
      if (!audioCtx || typeof audioCtx.createGain !== 'function') {
        console.error('❌ Invalid AudioContext');
        return;
      }

      // Resume audio context if suspended (mobile browsers)
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
          console.log('✅ Audio context resumed');
        }).catch(e => {
          console.warn('Could not resume audio context:', e);
        });
      }

      // Create analyser only once
      if (!analyser) {
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = smooth;
        console.log('✅ Analyser created');
      }

      // Create gain node only once
      if (!gainNode) {
        gainNode = audioCtx.createGain();
        gainNode.gain.value = gain;
        console.log('✅ Gain node created');
      }

      // Create source only once - THIS IS CRITICAL
      if (!source) {
        // Check if createMediaElementAudioSource exists
        if (typeof audioCtx.createMediaElementAudioSource !== 'function') {
          console.error('❌ createMediaElementAudioSource is not available');
          console.error('AudioContext methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(audioCtx)));
          return;
        }

        source = audioCtx.createMediaElementAudioSource(audioElement);
        console.log('✅ Media element source created');

        // Connect the audio graph
        source.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(audioCtx.destination);
        console.log('✅ Audio graph connected: source → gain → analyser → destination');
      }

      isInitialized = true;
      console.log('✅✅✅ Audio visualizer fully initialized and ready');
    } catch (e) {
      console.error('❌ Audio initialization error:', e.message);
      console.error('Stack:', e.stack);
      isInitialized = false;
    }
  }

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    canvas.width = r.width || 600;
    canvas.height = 260;
    const vr = vuCanvas.getBoundingClientRect();
    vuCanvas.width = Math.max((vr.width || 580) - 28, 100);
    vuCanvas.height = 22;
    wfBuf = null;
    stars = Array.from({ length: 150 }, () => ({
      x: (Math.random() - 0.5) * canvas.width,
      y: (Math.random() - 0.5) * canvas.height,
      z: Math.random() * canvas.width / 2 + 1,
    }));
  }

  function drawVu(level) {
    const W = vuCanvas.width;
    const H = vuCanvas.height;
    vx.fillStyle = '#060402';
    vx.fillRect(0, 0, W, H);
    const segs = 50;
    const sw = W / segs - 1;
    const lit = Math.floor(level * segs);
    if (level > peakHold) {
      peakHold = level;
      peakTimer = 90;
    }
    if (peakTimer > 0) peakTimer--;
    else peakHold = Math.max(peakHold - 0.008, 0);
    for (let i = 0; i < segs; i++) {
      const active = i < lit;
      vx.fillStyle = i < segs * 0.68 ? active ? th(45) : '#0a0602' : i < segs * 0.86 ? active ? th(55, 60) : '#100800' : active ? '#ff2200' : '#180200';
      vx.fillRect(i * (W / segs), 1, sw, H - 2);
    }
    const ph = Math.floor(peakHold * segs);
    if (ph > 0 && ph < segs) {
      vx.fillStyle = ph >= segs * 0.86 ? '#ff2200' : ph >= segs * 0.68 ? th(55, 60) : th(45);
      vx.fillRect(ph * (W / segs), 0, sw + 1, H);
    }
  }

  function drawGrid(W, H, alpha) {
    ctx.strokeStyle = `rgba(60,30,5,${alpha || 0.06})`;
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += W / 8) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += H / 5) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }

  function cycleMode(dir) {
    const idx = (modes.indexOf(mode) + dir + modes.length) % modes.length;
    setMode(modes[idx]);
  }

  function setMode(m) {
    mode = m;
    particles = [];
    lissHist = [];
    wfBuf = null;
    document.querySelectorAll('.mbtn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === m);
    });
    const modeNameEl = document.getElementById('mode-name');
    if (modeNameEl) {
      modeNameEl.textContent = modeNames[m] || m.toUpperCase();
    }
    const activeBtn = document.querySelector(`.mbtn[data-mode="${m}"]`);
    if (activeBtn) {
      const wrap = document.getElementById('mode-wrap');
      if (wrap) {
        const btnLeft = activeBtn.offsetLeft;
        const btnW = activeBtn.offsetWidth;
        const wrapW = wrap.offsetWidth;
        wrap.scrollTo({ left: btnLeft - wrapW / 2 + btnW / 2, behavior: 'smooth' });
      }
    }
  }

  function drawBars(freq, avg, bass, C, W, H, zBins, useTrails) {
    const bars = 80;
    const bw = (W / bars) * 0.75;
    for (let i = 0; i < bars; i++) {
      const v = Math.min((freq[Math.floor((i / bars) * zBins)] / 255) * gain, 1.3);
      const h = v * (H - 30);
      const x = (i / bars) * W + (W / bars) * 0.125;
      ctx.fillStyle = v > 1 ? '#ff2200' : hsl(C + (i / bars) * 40, theme.s, 15 + v * 35);
      ctx.fillRect(x, H - h - 20, bw, h);
      ctx.fillStyle = `rgba(${hexR(theme.base)},${hexG(theme.base)},${hexB(theme.base)},0.4)`;
      ctx.fillRect(x, H - h - 22, bw, 2);
    }
  }

  function hexR(h) {
    return parseInt(h.slice(1, 3), 16);
  }
  function hexG(h) {
    return parseInt(h.slice(3, 5), 16);
  }
  function hexB(h) {
    return parseInt(h.slice(5, 7), 16);
  }

  function draw() {
    if (!isInitialized) {
      initAudio();
    }
    
    animId = requestAnimationFrame(draw);
    
    // If analyser not ready, show waiting message
    if (!analyser) {
      const W = canvas.width;
      const H = canvas.height;
      ctx.fillStyle = '#060402';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#8b6f47';
      ctx.font = '14px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('INITIALIZING AUDIO...', W / 2, H / 2);
      return;
    }

    animId = requestAnimationFrame(draw);
    if (hueCycle) phaseHue = (phaseHue + 0.3) % 360;
    const tH = hueCycle ? phaseHue : theme.h;

    const W = canvas.width;
    const H = canvas.height;
    const bufLen = analyser.frequencyBinCount;
    const freq = new Uint8Array(bufLen);
    const time = new Uint8Array(analyser.fftSize);
    analyser.getByteFrequencyData(freq);
    analyser.getByteTimeDomainData(time);
    const zBins = Math.floor(bufLen * Math.min(zoom, 1));

    let avg = 0;
    for (let i = 0; i < freq.length; i++) avg += freq[i];
    avg /= freq.length * 255;
    const bass = freq[Math.floor(bufLen * 0.03)] / 255;

    energySmooth += (avg * gain * 2.5 - energySmooth) * 0.05;
    const useTrails = trailsOn;

    if (shakeX || shakeY) {
      ctx.save();
      ctx.translate(shakeX, shakeY);
      shakeX *= 0.7;
      shakeY *= 0.7;
    }

    if (useTrails) {
      ctx.fillStyle = 'rgba(6,4,2,0.35)';
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = '#060402';
      ctx.fillRect(0, 0, W, H);
    }

    if (mode !== 'pixel_matrix' && mode !== 'aurora') drawGrid(W, H);

    const C = hueCycle ? tH : theme.h;

    // Simple bars visualization for now
    drawBars(freq, avg, bass, C, W, H, zBins, useTrails);

    drawVu(Math.min(avg * gain * 2.5, 1));

    if (shakeX || shakeY) ctx.restore();
  }

  function setupKnob(kId, dId, vId, min, max, dec, init, cb) {
    const k = document.getElementById(kId);
    const d = document.getElementById(dId);
    const v = document.getElementById(vId);
    let val = init;
    let active = false;
    let sy = 0;
    let sv = 0;

    function set(nv) {
      val = Math.min(max, Math.max(min, nv));
      d.style.transform = `translateX(-50%) rotate(${-135 + ((val - min) / (max - min)) * 270}deg) translateY(-8px)`;
      v.textContent = val.toFixed(dec);
      cb(val);
    }

    set(init);
    k.addEventListener('mousedown', (e) => {
      active = true;
      sy = e.clientY;
      sv = val;
      e.preventDefault();
    });
    k.addEventListener(
      'touchstart',
      (e) => {
        active = true;
        sy = e.touches[0].clientY;
        sv = val;
      },
      { passive: true }
    );
    document.addEventListener('mousemove', (e) => {
      if (!active) return;
      set(sv + ((sy - e.clientY) * (max - min)) / 80);
    });
    document.addEventListener(
      'touchmove',
      (e) => {
        if (!active) return;
        set(sv + ((sy - e.touches[0].clientY) * (max - min)) / 80);
      },
      { passive: true }
    );
    document.addEventListener('mouseup', () => (active = false));
    document.addEventListener('touchend', () => (active = false));
  }

  // Initialize canvas
  resize();
  window.addEventListener('resize', resize);

  // Setup theme dots - with error handling
  const themeDots = document.querySelectorAll('.theme-dot');
  if (themeDots.length > 0) {
    themeDots.forEach((d) => {
      d.addEventListener('click', () => {
        document.querySelectorAll('.theme-dot').forEach((x) => x.classList.remove('active'));
        d.classList.add('active');
        currentThemeKey = d.dataset.theme;
        theme = THEMES[currentThemeKey];
        wfBuf = null;
      });
    });
  }

  // Setup mode buttons - with error handling
  const modeBtns = document.getElementById('mode-btns');
  if (modeBtns) {
    modeBtns.addEventListener('click', (e) => {
      if (e.target.classList.contains('mbtn')) setMode(e.target.dataset.mode);
    });
  }

  // Setup control buttons - with error handling
  const btnAuto = document.getElementById('btn-auto');
  if (btnAuto) {
    btnAuto.addEventListener('click', function () {
      autoOn = !autoOn;
      this.classList.toggle('active', autoOn);
    });
  }

  const btnShake = document.getElementById('btn-shake');
  if (btnShake) {
    btnShake.addEventListener('click', function () {
      shakeOn = !shakeOn;
      this.classList.toggle('active', shakeOn);
    });
  }

  const btnTrails = document.getElementById('btn-trails');
  if (btnTrails) {
    btnTrails.addEventListener('click', function () {
      trailsOn = !trailsOn;
      this.classList.toggle('active', trailsOn);
    });
  }

  const btnHue = document.getElementById('btn-hue');
  if (btnHue) {
    btnHue.addEventListener('click', function () {
      hueCycle = !hueCycle;
      this.classList.toggle('active', hueCycle);
    });
  }

  // Add click listener to initialize audio on first interaction
  const handleFirstInteraction = () => {
    if (!isInitialized && audioElement && audioElement.src) {
      initAudio();
      document.removeEventListener('click', handleFirstInteraction);
    }
  };
  document.addEventListener('click', handleFirstInteraction);

  // Also try to initialize when audio plays
  const handleAudioPlay = () => {
    if (!isInitialized && audioElement && audioElement.src) {
      initAudio();
    }
  };
  audioElement.addEventListener('play', handleAudioPlay);
  audioElement.addEventListener('loadedmetadata', handleAudioPlay);

  // Setup knobs
  // Setup knobs only if elements exist
  if (document.getElementById('k-gain')) {
    setupKnob('k-gain', 'kd-gain', 'kv-gain', 0.5, 4, 1, 1.5, (v) => {
      gain = v;
      if (gainNode) gainNode.gain.value = v;
    });
  }
  if (document.getElementById('k-smooth')) {
    setupKnob('k-smooth', 'kd-smooth', 'kv-smooth', 0, 0.97, 2, 0.8, (v) => {
      smooth = v;
      if (analyser) analyser.smoothingTimeConstant = v;
    });
  }
  if (document.getElementById('k-zoom')) {
    setupKnob('k-zoom', 'kd-zoom', 'kv-zoom', 0.1, 1, 1, 1, (v) => {
      zoom = v;
    });
  }

  // Setup keyboard shortcuts
  const handleKeydown = (e) => {
    if (e.key === 'ArrowRight') cycleMode(1);
    else if (e.key === 'ArrowLeft') cycleMode(-1);
  };
  document.addEventListener('keydown', handleKeydown);

  // Start drawing
  draw();

  return { animId, audioCtx, analyser, source, gainNode };
}
