import React, { useCallback, useEffect, useRef, useState } from 'react';
import './SonoscapeVisualizerStyle.css';

/**
 * SonoscapePlayer - Full-Featured Player with Visualizer
 * ✅ ENHANCED: Now includes seekbar, play controls, playlist, and file upload
 * ✅ ARCHITECTURE: Pure visualizer + integrated player controls
 * ✅ readOnly mode: For listeners - shows visualizer and playlist only
 */
export const SonoscapePlayer = ({ 
  audioRef, 
  isPlaying, 
  trackName,
  playlist = [],
  currentTrack = null,
  onPlayPause = () => {},
  onSkipNext = () => {},
  onSkipPrevious = () => {},
  onTrackSelect = () => {},
  onFileUpload = () => {},
  duration = 0,
  currentTime = 0,
  onSeek = () => {},
  listenerCount = 0,
  currentFrequency = null,
  readOnly = false
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const vuCanvasRef = useRef(null);
  const fullscreenButtonRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(null);
  const [beatFlash, setBeatFlash] = useState(false);
  const beatFlashRef = useRef(false);

  function toggleBeatFlash() {
    beatFlashRef.current = !beatFlashRef.current;
    setBeatFlash(beatFlashRef.current);
  }

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;
    const active = document.fullscreenElement || document.webkitFullscreenElement;
    if (active === container) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      await exit?.call(document);
      return;
    }
    if (fullscreen === 'viewport') {
      setFullscreen(null);
      return;
    }
    const request = container.requestFullscreen || container.webkitRequestFullscreen;
    if (request) {
      try {
        await request.call(container);
        return;
      } catch {
        // Some browsers expose the API but reject fullscreen for this element.
      }
    }
    setFullscreen('viewport');
  }, [fullscreen]);

  const exitFullscreen = () => toggleFullscreen().then(() => {
    fullscreenButtonRef.current?.focus({ preventScroll: true });
  }).catch(console.warn);

  useEffect(() => {
    const syncFullscreen = () => {
      const active = document.fullscreenElement || document.webkitFullscreenElement;
      setFullscreen(current => active === containerRef.current ? 'native' : current === 'native' ? null : current);
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen);
    };
  }, []);

  useEffect(() => {
    if (fullscreen) canvasRef.current?.focus({ preventScroll: true });
  }, [fullscreen]);

  useEffect(() => {
    if (fullscreen !== 'viewport') return;
    const root = document.documentElement;
    const x = window.scrollX;
    const y = window.scrollY;
    root.classList.add('sonoscope-viewport-open');
    return () => {
      root.classList.remove('sonoscope-viewport-open');
      window.scrollTo(x, y);
    };
  }, [fullscreen]);

  useEffect(() => {
    const handleFullscreenKey = event => {
      if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey ||
          event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key.toLowerCase() === 'f' || (event.key === 'Escape' && fullscreen === 'viewport')) {
        event.preventDefault();
        toggleFullscreen().catch(console.warn);
        fullscreenButtonRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('keydown', handleFullscreenKey);
    return () => document.removeEventListener('keydown', handleFullscreenKey);
  }, [fullscreen, toggleFullscreen]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !canvasRef.current || !vuCanvasRef.current || !audioRef?.current) return;

    const mc = canvasRef.current;
    const vc = vuCanvasRef.current;
    const ctx = mc.getContext('2d', { alpha: false });
    const vx = vc.getContext('2d', { alpha: false });
    const flash = container.querySelector('#flash-overlay');

    let mode = 'edge_lighting';
    let gain = 1.5;
    let smooth = 0.8;
    let zoom = 1.0;
    let animId = null;
    
    // Vis variables
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
    let autoInterval = 6000;
    let peakHold = 0;
    let peakTimer = 0;
    let flashAlpha = 0;
    let shakeX = 0;
    let shakeY = 0;
    let energySmooth = 0;
    let bpmHistory = [];
    let lastBeatTime = 0;
    let bassBaseline = 0;
    let previousBass = 0;
    let detectedBpm = 0;

    const THEMES = {
      amber: { h: 35, s: 80, base: '#d4a042', flash: 'rgba(255,180,0,' },
      synthwave: { h: 280, s: 90, base: '#cc44ff', flash: 'rgba(180,0,255,' },
      acid: { h: 100, s: 100, base: '#44ff00', flash: 'rgba(100,255,0,' },
      blood: { h: 0, s: 100, base: '#ff2200', flash: 'rgba(255,30,0,' },
      ice: { h: 195, s: 100, base: '#00ccff', flash: 'rgba(0,200,255,' },
      gold: { h: 48, s: 100, base: '#ffdd00', flash: 'rgba(255,220,0,' },
      rose: { h: 330, s: 90, base: '#ff44aa', flash: 'rgba(255,50,150,' }
    };
    let theme = THEMES.amber;

    const modes = ['edge_lighting', 'bars', 'mirror_bars', 'waterfall', 'bars3d', 'wave', 'mirror_wave', 'tunnel', 'lissajous', 'radial', 'kaleidoscope', 'mandala', 'polygon', 'dna', 'particles', 'starfield', 'aurora', 'blackhole', 'vinyl', 'pixel_matrix'];
    const modeNames = {
      edge_lighting: 'EDGE LIGHTING', bars: 'BARS', mirror_bars: 'MIRROR BARS', waterfall: 'WATERFALL', bars3d: '3D BARS',
      wave: 'WAVEFORM', mirror_wave: 'MIRROR WAVE', tunnel: 'TUNNEL', lissajous: 'LISSAJOUS',
      radial: 'RADIAL', kaleidoscope: 'KALEIDOSCOPE', mandala: 'MANDALA', polygon: 'POLYGON',
      dna: 'DNA HELIX', particles: 'PARTICLES', starfield: 'STAR FIELD', aurora: 'AURORA',
      blackhole: 'BLACK HOLE', vinyl: 'VINYL', pixel_matrix: 'PIXELS'
    };

    function th(lightness, sat) { return `hsl(${theme.h},${sat !== undefined ? sat : theme.s}%,${lightness}%)`; }
    function hsl(h, s, l) { return `hsl(${h},${s}%,${l}%)`; }
    function hexR(h) { return parseInt(h.slice(1, 3), 16); }
    function hexG(h) { return parseInt(h.slice(3, 5), 16); }
    function hexB(h) { return parseInt(h.slice(5, 7), 16); }

    function resize() {
      const width = mc.clientWidth;
      const height = mc.clientHeight;
      const vuWidth = vc.clientWidth;
      if (vuWidth && (vc.width !== vuWidth || vc.height !== vc.clientHeight)) {
        vc.width = vuWidth;
        vc.height = vc.clientHeight;
      }
      if (!width || !height || (mc.width === width && mc.height === height)) return;
      mc.width = width;
      mc.height = height;
      wfBuf = null;
      stars = Array.from({ length: 150 }, () => ({
        x: (Math.random() - 0.5) * mc.width,
        y: (Math.random() - 0.5) * mc.height,
        z: Math.random() * mc.width / 2 + 1
      }));
    }

    // ==========================================
    // AUDIO TOPOLOGY & LIFECYCLE (MEDIA ELEMENT ROUTING)
    // ==========================================
    const audio = audioRef.current;
    
    // We strictly attach the nodes to the DOM element so they survive React re-renders
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audio.audioCtx && AudioContext) {
      audio.audioCtx = new AudioContext();
      audio.sourceNode = audio.audioCtx.createMediaElementSource(audio);
      
      const a = audio.audioCtx.createAnalyser();
      a.fftSize = 2048;
      const g = audio.audioCtx.createGain();
      
      audio.sourceNode.connect(g);
      g.connect(a);
      a.connect(audio.audioCtx.destination);
      
      audio.analyserNode = a;
      audio.gainNode = g;
    }

    const analyser = audio.analyserNode;
    const gainNode = audio.gainNode;
    if (analyser) analyser.smoothingTimeConstant = smooth;
    if (gainNode) gainNode.gain.value = gain;

    // Browsers suspend audio contexts until interaction. Ensure it wakes up when the HostPanel plays.
    const handlePlayResume = () => {
      if (audio.audioCtx?.state === 'suspended') {
        audio.audioCtx.resume();
      }
    };
    audio.addEventListener('play', handlePlayResume);

    // ==========================================
    // VISUALIZER / DRAWING
    // ==========================================
    function drawVu(level) {
      const W = vc.width; const H = vc.height;
      vx.fillStyle = '#060402'; vx.fillRect(0, 0, W, H);
      const segs = 50; const sw = W / segs - 1;
      const lit = Math.floor(level * segs);

      if (level > peakHold) { peakHold = level; peakTimer = 90; }
      if (peakTimer > 0) peakTimer--; else peakHold = Math.max(peakHold - 0.008, 0);

      for (let i = 0; i < segs; i++) {
        const active = i < lit;
        vx.fillStyle = i < segs * 0.68 ? (active ? th(45) : '#0a0602') :
          i < segs * 0.86 ? (active ? th(55, 60) : '#100800') : (active ? '#ff2200' : '#180200');
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
      for (let x = 0; x < W; x += W / 8) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += H / 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }

    function detectBeat(freq, now) {
      // Use the low-frequency onset rather than the overall volume or gain setting.
      const low = (freq[2] + freq[3] + freq[4] + freq[5]) / (4 * 255);
      const rise = low - previousBass;
      previousBass = low;
      bassBaseline += (low - bassBaseline) * 0.04;
      if (now - lastBeatTime < 240 || low < 0.12 || rise < 0.04 || low < bassBaseline + 0.08) return;

      const interval = now - lastBeatTime;
      if (lastBeatTime && interval < 2000) {
        bpmHistory.push(60000 / interval);
        if (bpmHistory.length > 8) bpmHistory.shift();
        detectedBpm = Math.round(bpmHistory.reduce((a, b) => a + b) / bpmHistory.length);
        const bpmDisplay = container.querySelector('#bpm-display');
        if (bpmDisplay) bpmDisplay.textContent = detectedBpm;
      }
      lastBeatTime = now;
      flashAlpha = Math.min(low * 0.32, 0.24);
      if (shakeOn) {
        shakeX = (Math.random() - 0.5) * 8;
        shakeY = (Math.random() - 0.5) * 8;
      }
    }

    function setMode(m) {
      mode = m; particles = []; lissHist = []; wfBuf = null;
      const modeNameEl = container?.querySelector('#mode-name');
      if (modeNameEl) modeNameEl.textContent = modeNames[m] || m.toUpperCase();
      const modeBtns = container?.querySelectorAll('.mbtn');
      if (modeBtns) modeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === m));
    }

    const edgeBands = [
      { floor: 0.022, rise: 0.004, duration: 920, strength: 0.92 }, // Volume
      { floor: 0.29, rise: 0.05, duration: 850, strength: 0.81 }, // Bass
      { floor: 0.32, rise: 0.06, duration: 740, strength: 0.72 }, // Mids
      { floor: 0.37, rise: 0.07, duration: 610, strength: 0.64 }, // Treble
    ].map(band => ({ ...band, baseline: 0, previous: 0 }));
    const edgePulses = [];
    let lastEdgePulse = -Infinity;
    const binHz = (audio.audioCtx?.sampleRate || 48000) / (analyser?.fftSize || 2048);

    function bandPeak(freq, lowHz, highHz) {
      let peak = 0;
      const end = Math.min(freq.length, Math.floor(highHz / binHz) + 1);
      for (let i = Math.ceil(lowHz / binHz); i < end; i++) peak = Math.max(peak, freq[i]);
      return peak / 255;
    }

    function drawEdgeLighting(width, height, hue, freq, waveform, timestamp) {
      let sum = 0;
      for (const sample of waveform) sum += ((sample - 128) / 128) ** 2;
      const rms = Math.sqrt(sum / waveform.length);
      const levels = [rms, bandPeak(freq, 40, 190), bandPeak(freq, 190, 2400), bandPeak(freq, 2400, 9000)];
      let trigger;

      edgeBands.forEach((band, index) => {
        const level = rms >= 0.014 ? levels[index] : 0;
        const rise = Math.max(band.rise, band.baseline * 0.09);
        if (!trigger && level >= band.floor && level - band.previous >= rise &&
            level - band.baseline >= rise) {
          trigger = band;
        }
        band.previous = level;
        band.baseline += (level - band.baseline) * 0.12;
      });

      for (let index = edgePulses.length - 1; index >= 0; index--) {
        const pulse = edgePulses[index];
        if (timestamp - pulse.started >= pulse.duration) edgePulses.splice(index, 1);
      }
      if (trigger && timestamp - lastEdgePulse >= 95) {
        if (edgePulses.length === 6) edgePulses.shift();
        edgePulses.push({
          started: timestamp,
          duration: trigger.duration,
          strength: trigger.strength * Math.min(1, 0.48 + rms * 6),
        });
        lastEdgePulse = timestamp;
      }

      if (!edgePulses.length || width < 24 || height < 24) return;
      const inset = 5;
      const center = width / 2;
      const bottom = height - inset;
      const radius = Math.min(32, (width - 2 * inset) / 4, (height - 2 * inset) / 2);
      const halfPerimeter = width + height - 4 * inset - (4 - Math.PI) * radius;
      ctx.save();
      ctx.beginPath();
      for (const side of [inset, width - inset]) {
        ctx.moveTo(center, bottom);
        ctx.arcTo(side, bottom, side, inset, radius);
        ctx.arcTo(side, inset, center, inset, radius);
        ctx.lineTo(center, inset);
      }
      ctx.lineCap = 'round';
      const shift = hue - THEMES.amber.h;
      const color = ctx.createLinearGradient(0, inset, 0, bottom);
      color.addColorStop(0, hsl(188 + shift, 100, 59));
      color.addColorStop(0.32, hsl(214 + shift, 100, 65));
      color.addColorStop(0.65, hsl(265 + shift, 96, 68));
      color.addColorStop(1, hsl(329 + shift, 100, 63));
      ctx.strokeStyle = color;

      for (const pulse of edgePulses) {
        const progress = (timestamp - pulse.started) / pulse.duration;
        const fade = 1 - Math.max(0, progress - 0.58) / 0.42;
        const brightness = pulse.strength * fade ** 2;
        const travel = Math.min(1, progress / 0.78);
        const front = halfPerimeter * (0.025 + 0.975 * travel * travel * (3 - 2 * travel));

        // A dim wake follows each brighter moving section and its rounded tip.
        const strokeTrail = (length, width, opacity) => {
          const start = Math.max(0, front - halfPerimeter * length);
          ctx.setLineDash([front - start, halfPerimeter]);
          ctx.lineDashOffset = -start;
          ctx.lineWidth = width;
          ctx.globalAlpha = brightness * opacity;
          ctx.stroke();
        };

        strokeTrail(0.65, 25, 0.035);
        strokeTrail(0.52, 14, 0.10);
        strokeTrail(0.64, 4, 0.17);
        strokeTrail(0.30, 9, 0.24);
        strokeTrail(0.30, 6, 0.92);
        strokeTrail(0.07, 3, 1);
      }
      ctx.restore();
    }

    function draw(timestamp = performance.now()) {
      animId = requestAnimationFrame(draw); 
      
      const W = mc.width; const H = mc.height;

      if (!analyser || audio.paused || audio.src === '') {
        ctx.fillStyle = mode === 'edge_lighting' ? '#000' : 'rgba(6,4,2,0.15)';
        ctx.fillRect(0, 0, W, H);
        for (const band of edgeBands) {
          band.baseline = 0;
          band.previous = 0;
        }
        edgePulses.length = 0;
        lastEdgePulse = -Infinity;
        lastBeatTime = 0;
        previousBass = 0;
        bassBaseline = 0;
        bpmHistory.length = 0;
        flashAlpha = 0;
        flash.style.opacity = '0';
        container.querySelector('#l-beat')?.classList.remove('on-amber');
        drawVu(0);
        const sigLed = containerRef.current?.querySelector('#l-sig');
        if (sigLed) sigLed.className = 'led';
        return;
      }

      if (hueCycle) phaseHue = (phaseHue + 0.3) % 360;
      const tH = hueCycle ? phaseHue : theme.h;
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
      const energy = Math.min(energySmooth, 1);
      const energyInner = container?.querySelector('#energy-inner');
      if (energyInner) {
        energyInner.style.width = (energy * 100).toFixed(0) + '%';
        energyInner.style.background = energy > 0.8 ? '#ff2200' : energy > 0.5 ? th(55, 60) : th(45);
      }

      detectBeat(freq, timestamp);
      const sinceBeat = lastBeatTime ? timestamp - lastBeatTime : Infinity;
      container.querySelector('#l-beat')?.classList.toggle('on-amber', beatFlashRef.current && sinceBeat < 80);
      
      if (mode !== 'edge_lighting' && beatFlashRef.current && flashAlpha > 0) {
        flash.style.background = theme.flash + flashAlpha + ')';
        flash.style.opacity = '1';
        flashAlpha = Math.max(0, flashAlpha - 0.025);
      } else {
        flash.style.opacity = '0';
        flashAlpha = 0;
      }

      drawVu(Math.min(avg * gain * 2.5, 1));

      const sigLed = container?.querySelector('#l-sig');
      if (sigLed) sigLed.className = 'led' + (avg > 0.01 ? ' on-green' : '');

      if (autoOn) {
        autoTimer++;
        if (autoTimer > autoInterval / 16) { autoTimer = 0; const idx = (modes.indexOf(mode) + 1) % modes.length; setMode(modes[idx]); }
      }

      const shakeFrame = mode !== 'edge_lighting' && (shakeX || shakeY);
      if (shakeFrame) { ctx.save(); ctx.translate(shakeX, shakeY); }
      shakeX *= 0.7; shakeY *= 0.7;

      if (mode === 'edge_lighting') {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      } else if (trailsOn && mode !== 'waterfall' && mode !== 'pixel_matrix') {
        ctx.fillStyle = 'rgba(6,4,2,0.35)'; ctx.fillRect(0, 0, W, H);
      } else {
        ctx.fillStyle = '#060402'; ctx.fillRect(0, 0, W, H);
      }

      if (mode !== 'pixel_matrix' && mode !== 'aurora' && mode !== 'edge_lighting') drawGrid(W, H);

      const C = hueCycle ? tH : theme.h;

      // VISUALIZATION RENDERERS
      if (mode === 'edge_lighting') {
        drawEdgeLighting(W, H, C, freq, time, timestamp);
      } else if (mode === 'bars') {
        const bars = 80; const bw = (W / bars) * 0.75;
        for (let i = 0; i < bars; i++) {
          const v = Math.min((freq[Math.floor((i / bars) * zBins)] / 255) * gain, 1.3);
          const h = v * (H - 30); const x = (i / bars) * W + (W / bars) * 0.125;
          ctx.fillStyle = v > 1 ? '#ff2200' : hsl(C + (i / bars) * 40, theme.s, 15 + v * 35);
          ctx.fillRect(x, H - h - 20, bw, h);
          ctx.fillStyle = `rgba(${hexR(theme.base)},${hexG(theme.base)},${hexB(theme.base)},0.4)`;
          ctx.fillRect(x, H - h - 22, bw, 2);
        }
      } else if (mode === 'mirror_bars') {
        const bars = 80; const bw = (W / bars) * 0.75;
        for (let i = 0; i < bars; i++) {
          const v = Math.min((freq[Math.floor((i / bars) * zBins)] / 255) * gain, 1.3);
          const h = v * (H / 2 - 12); const x = (i / bars) * W + (W / bars) * 0.125;
          ctx.fillStyle = v > 1 ? '#ff2200' : hsl(C + (i / bars) * 40, theme.s, 15 + v * 35);
          ctx.fillRect(x, H / 2 - h, bw, h); ctx.fillRect(x, H / 2, bw, h);
        }
        ctx.strokeStyle = `hsla(${C},${theme.s}%,30%,0.4)`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
      } else if (mode === 'waterfall') {
        if (!wfBuf) {
          wfBuf = document.createElement('canvas'); wfBuf.width = W; wfBuf.height = H;
          wfCtx = wfBuf.getContext('2d', { alpha: false }); wfCtx.fillStyle = '#060402'; wfCtx.fillRect(0, 0, W, H);
        }
        const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
        const tc = tmp.getContext('2d', { alpha: false }); tc.drawImage(wfBuf, 0, 1);
        const row = tc.createImageData(W, 1);
        for (let i = 0; i < W; i++) {
          const v = Math.min((freq[Math.floor((i / W) * zBins)] / 255) * gain, 1);
          const r = i * 4; const lv = hueCycle ? (tH / 360) * 255 : v * 180 + 30;
          row.data[r] = lv; row.data[r + 1] = v * 60; row.data[r + 2] = hueCycle ? v * 200 : 0; row.data[r + 3] = 255;
        }
        tc.putImageData(row, 0, 0); wfCtx.drawImage(tmp, 0, 0); ctx.drawImage(wfBuf, 0, 0);
      } else if (mode === 'bars3d') {
        const rows = 5; const cols = 40; const dz = 16;
        for (let r = rows - 1; r >= 0; r--) {
          for (let c = 0; c < cols; c++) {
            const idx = Math.floor(((c / cols) + (r / (rows * 5))) * zBins);
            const v = Math.min((freq[idx] / 255) * gain, 1.2); const bh = v * (H * 0.6);
            const ox = r * dz; const oy = r * dz * 0.5;
            const x = (c / cols) * W + (W / cols) * 0.1 + ox; const bw = (W / cols) * 0.75; const yb = H - 20 - oy;
            ctx.fillStyle = hsl(C + r * 12, theme.s, 12 + v * 28); ctx.fillRect(x, yb - bh, bw, bh);
            ctx.fillStyle = hsl(C + r * 12, theme.s, 25 + v * 20); ctx.fillRect(x, yb - bh, bw, 3);
          }
        }
      } else if (mode === 'wave') {
        const step = Math.max(1, Math.floor(time.length / W));
        ctx.beginPath(); ctx.strokeStyle = `hsla(${C},${theme.s}%,50%,0.15)`; ctx.lineWidth = 5;
        for (let i = 0; i < W; i++) { const v = (time[i * step] / 128 - 1) * gain; i ? ctx.lineTo(i, H / 2 + v * (H / 2 - 20)) : ctx.moveTo(i, H / 2 + v * (H / 2 - 20)); } ctx.stroke();
        ctx.beginPath(); ctx.strokeStyle = hsl(C, theme.s, 55); ctx.lineWidth = 1.5;
        for (let i = 0; i < W; i++) { const v = (time[i * step] / 128 - 1) * gain; i ? ctx.lineTo(i, H / 2 + v * (H / 2 - 20)) : ctx.moveTo(i, H / 2 + v * (H / 2 - 20)); } ctx.stroke();
      } else if (mode === 'mirror_wave') {
        const step = Math.max(1, Math.floor(time.length / W));
        for (let p = 0; p < 2; p++) {
          ctx.beginPath(); ctx.strokeStyle = p ? hsl(C, theme.s, 55) : `hsla(${C},${theme.s}%,50%,0.2)`; ctx.lineWidth = p ? 1.5 : 4;
          for (let i = 0; i < W; i++) { const v = (time[i * step] / 128 - 1) * gain; const y = H / 2 + (p ? 1 : -1) * v * (H / 4 - 10); i ? ctx.lineTo(i, y) : ctx.moveTo(i, y); } ctx.stroke();
        }
      } else if (mode === 'tunnel') {
        const cx = W / 2; const cy = H / 2; const rings = 20;
        for (let r = rings; r >= 1; r--) {
          const t = r / rings; const idx = Math.floor(t * zBins * 0.5); const v = Math.min((freq[idx] / 255) * gain, 1.2); const radius = t * Math.min(W, H) * 0.52; const pts = 64;
          ctx.beginPath();
          for (let p = 0; p <= pts; p++) {
            const a = (p / pts) * Math.PI * 2; const wv = (time[Math.floor((p / pts) * time.length) % time.length] / 128 - 1) * gain * 0.15 * radius;
            const px = cx + Math.cos(a) * (radius + wv); const py = cy + Math.sin(a) * (radius + wv);
            p ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.strokeStyle = hsl(C + v * 30, theme.s, 8 + v * 32); ctx.lineWidth = 1 + v * 1.5; ctx.stroke();
        }
      } else if (mode === 'lissajous') {
        const half = Math.floor(time.length / 2);
        if (lissHist.length > 100) lissHist.shift();
        lissHist.push({ L: Array.from(time.slice(0, half)), R: Array.from(time.slice(half)) });
        lissHist.forEach((h, hi) => {
          ctx.beginPath(); ctx.strokeStyle = `hsla(${C + (hi / lissHist.length) * 60},${theme.s}%,55%,${(hi / lissHist.length) * 0.6})`; ctx.lineWidth = 1;
          for (let i = 0; i < half; i += 2) {
            const x = W / 2 + ((h.L[i] / 128 - 1) * gain) * (W / 2 - 20); const y = H / 2 + ((h.R[i] || 128) / 128 - 1) * gain * (H / 2 - 20);
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          } ctx.stroke();
        });
      } else if (mode === 'radial') {
        const cx = W / 2; const cy = H / 2; const R = Math.min(W, H) / 2 - 18;
        ctx.strokeStyle = `hsla(${C},${theme.s}%,15%,1)`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.3, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 128; i++) {
          const a = (i / 128) * Math.PI * 2 - Math.PI / 2; const v = Math.min((freq[Math.floor((i / 128) * zBins)] / 255) * gain, 1.2);
          ctx.strokeStyle = v > 1 ? '#ff2200' : hsl(C + (i / 128) * 60, theme.s, 50); ctx.lineWidth = W / 170;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.3, cy + Math.sin(a) * R * 0.3); ctx.lineTo(cx + Math.cos(a) * (R * 0.3 + v * R * 0.7), cy + Math.sin(a) * (R * 0.3 + v * R * 0.7)); ctx.stroke();
        }
      } else if (mode === 'kaleidoscope') {
        const cx = W / 2; const cy = H / 2; const slices = 8; const R = Math.min(W, H) / 2 - 8;
        for (let s = 0; s < slices; s++) {
          ctx.save(); ctx.translate(cx, cy); ctx.rotate((s / slices) * Math.PI * 2);
          ctx.beginPath(); ctx.moveTo(0, 0);
          for (let i = 0; i <= 60; i++) {
            const a = (i / 60) * (Math.PI / slices); const v = Math.min((freq[Math.floor((i / 60) * zBins * 0.6)] / 255) * gain, 1.2);
            ctx.lineTo(Math.cos(a) * v * R, Math.sin(a) * v * R);
          }
          ctx.closePath(); ctx.fillStyle = hsl(C + (s * 30 + avg * 120), theme.s, 10 + avg * gain * 25); ctx.fill();
          ctx.strokeStyle = hsl(C + s * 20, theme.s, 35); ctx.lineWidth = 0.7; ctx.stroke(); ctx.restore();
        }
      } else if (mode === 'mandala') {
        const cx = W / 2; const cy = H / 2;
        [0.05, 0.15, 0.3, 0.5, 0.7].forEach((bf, bi) => {
          const R = (bi + 1) * (Math.min(W, H) / 12); const v = Math.min((freq[Math.floor(bf * zBins)] / 255) * gain, 1.2); const pts = 8 + bi * 4;
          ctx.beginPath();
          for (let p = 0; p <= pts; p++) {
            const a = (p / pts) * Math.PI * 2 + bi * 0.3; const x = cx + Math.cos(a) * R * (0.6 + v * 0.4); const y = cy + Math.sin(a) * R * (0.6 + v * 0.4);
            p ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.strokeStyle = hsl(C + bi * 18, theme.s, 18 + v * 32); ctx.lineWidth = 0.6 + v; ctx.stroke();
        });
      } else if (mode === 'polygon') {
        const cx = W / 2; const cy = H / 2; const R = Math.min(W, H) * 0.38; const SIDES = 6;
        for (let ring = 1; ring <= 6; ring++) {
          const rv = Math.min((freq[Math.floor(zBins * (ring / 8))] / 255) * gain, 1.2); const rr = R * (ring / 6) * (0.6 + rv * 0.5);
          ctx.beginPath();
          for (let p = 0; p <= SIDES; p++) {
            const a = (p / SIDES) * Math.PI * 2 - Math.PI / 2 + avg * 2;
            p ? ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
          }
          ctx.strokeStyle = hsl(C + rv * 50, theme.s, 12 + rv * 38); ctx.lineWidth = 1 + rv; ctx.stroke();
        }
      } else if (mode === 'dna') {
        const amp = H * 0.28; const spd = Date.now() * 0.002;
        for (let p = 0; p < 2; p++) {
          ctx.beginPath(); ctx.strokeStyle = p ? hsl(C, theme.s, 55) : hsl((C + 180) % 360, theme.s, 45); ctx.lineWidth = 2;
          for (let i = 0; i < W; i++) {
            const v = Math.min((freq[Math.floor((i / W) * zBins)] / 255) * gain, 1.2); const a = (i / W) * Math.PI * 6 + spd + p * Math.PI; const y = H / 2 + Math.sin(a) * amp * (0.3 + v * 0.7);
            i ? ctx.lineTo(i, y) : ctx.moveTo(i, y);
          } ctx.stroke();
        }
        for (let i = 0; i < W; i += 14) {
          const v = Math.min((freq[Math.floor((i / W) * zBins)] / 255) * gain, 1.2); const a = (i / W) * Math.PI * 6 + spd;
          const y1 = H / 2 + Math.sin(a) * amp * (0.3 + v * 0.7); const y2 = H / 2 + Math.sin(a + Math.PI) * amp * (0.3 + v * 0.7);
          ctx.strokeStyle = hsl(C + 20, theme.s, 25 + v * 25); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(i, y1); ctx.lineTo(i, y2); ctx.stroke();
          ctx.fillStyle = hsl(C, theme.s, 50); ctx.beginPath(); ctx.arc(i, y1, 2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(i, y2, 2, 0, Math.PI * 2); ctx.fill();
        }
      } else if (mode === 'particles') {
        if (particles.length < 300 && avg > 0.04) {
          const angle = Math.random() * Math.PI * 2; const spd = 0.5 + avg * gain * 5;
          particles.push({ x: W / 2, y: H / 2, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life: 1, hue: C + Math.random() * 60, size: 1 + bass * gain * 4 });
        }
        particles = particles.filter(p => p.life > 0.01);
        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.vx *= 0.985; p.vy *= 0.985; p.life -= 0.01;
          ctx.fillStyle = `hsla(${p.hue},80%,${40 + p.life * 20}%,${p.life})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
        });
      } else if (mode === 'starfield') {
        const cx = W / 2; const cy = H / 2; const spd = 1 + bass * gain * 10;
        stars.forEach(s => {
          s.z -= spd;
          if (s.z <= 0) { s.x = (Math.random() - 0.5) * W; s.y = (Math.random() - 0.5) * H; s.z = W / 2; }
          const sx = cx + (s.x / s.z) * W * 0.5; const sy = cy + (s.y / s.z) * H * 0.5; const sz = 1 - s.z / (W / 2);
          ctx.fillStyle = `hsl(${C},${theme.s}%,${sz * 60 + 20}%)`; ctx.beginPath(); ctx.arc(sx, sy, Math.max(0.5, sz * 2.5), 0, Math.PI * 2); ctx.fill();
        });
      } else if (mode === 'aurora') {
        const layers = 6;
        for (let l = 0; l < layers; l++) {
          const t = Date.now() * 0.0005 + l * 0.8; ctx.beginPath();
          for (let i = 0; i <= W; i += 4) {
            const idx = Math.floor((i / W) * zBins * 0.5); const v = Math.min((freq[idx] / 255) * gain, 1.2); const baseY = H * (0.2 + l * 0.12);
            const wave = Math.sin((i / W) * Math.PI * 3 + t) * H * 0.08 + Math.sin((i / W) * Math.PI * 7 + t * 1.3) * H * 0.04; const y = baseY + wave + v * H * 0.15;
            i ? ctx.lineTo(i, y) : ctx.moveTo(i, y);
          }
          ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fillStyle = `hsla(${(C + l * 25) % 360},${theme.s}%,${15 + l * 5}%,${0.06 + avg * gain * 0.15})`; ctx.fill();
        }
        for (let i = 0; i < W; i += 3) {
          const idx = Math.floor((i / W) * zBins * 0.5); const v = Math.min((freq[idx] / 255) * gain, 1.2);
          if (v > 0.4) { ctx.fillStyle = `hsla(${C + (i / W) * 80},${theme.s}%,70%,${v * 0.15})`; ctx.fillRect(i, 0, 2, H * (0.8 + v * 0.2)); }
        }
      } else if (mode === 'blackhole') {
        const cx = W / 2; const cy = H / 2; const maxR = Math.min(W, H) * 0.45; const spin = Date.now() * 0.001;
        for (let ring = 30; ring >= 1; ring--) {
          const t = ring / 30; const idx = Math.floor(t * zBins * 0.6); const v = Math.min((freq[idx] / 255) * gain, 1.2); const r = t * maxR * (0.5 + avg * 0.5); const pts = 80;
          ctx.beginPath();
          for (let p = 0; p <= pts; p++) {
            const a = (p / pts) * Math.PI * 2 + spin * t * 2; const dr = (Math.random() - 0.5) * v * r * 0.15;
            const rx = cx + Math.cos(a) * (r + dr); const ry = cy + Math.sin(a) * (r + dr) * 0.6;
            p ? ctx.lineTo(rx, ry) : ctx.moveTo(rx, ry);
          }
          ctx.strokeStyle = `hsla(${C + t * 40},${theme.s}%,${5 + v * 20 * t}%,${t * 0.8})`; ctx.lineWidth = 0.5 + v; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(cx, cy, maxR * 0.06 + bass * gain * maxR * 0.04, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, maxR * 0.06 + bass * gain * maxR * 0.04, 0, Math.PI * 2); ctx.strokeStyle = hsl(C, theme.s, 40); ctx.lineWidth = 1.5; ctx.stroke();
      } else if (mode === 'vinyl') {
        const cx = W / 2; const cy = H / 2; const maxR = Math.min(W, H) * 0.45; const minR = maxR * 0.14; const spin = Date.now() * 0.001 * avg * gain;
        for (let r = maxR; r > minR; r -= 2.5) {
          const t = (r - minR) / (maxR - minR); const idx = Math.floor(t * zBins * 0.5); const v = Math.min((freq[idx] / 255) * gain, 1.2);
          ctx.beginPath(); const pts = 120;
          for (let p = 0; p <= pts; p++) {
            const a = (p / pts) * Math.PI * 2 + spin; const dr = v * 2.5 * Math.sin(p * 8);
            p ? ctx.lineTo(cx + Math.cos(a) * (r + dr), cy + Math.sin(a) * (r + dr)) : ctx.moveTo(cx + Math.cos(a) * (r + dr), cy + Math.sin(a) * (r + dr));
          }
          ctx.strokeStyle = hsl(C + (1 - t) * 20, theme.s * 0.5, 6 + v * 16); ctx.lineWidth = 0.7; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(cx, cy, minR * 0.7, 0, Math.PI * 2); ctx.fillStyle = '#0d0a06'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fillStyle = hsl(C, theme.s, 55); ctx.fill();
      } else if (mode === 'pixel_matrix') {
        const cols = 60; const rows = 28; const cw = W / cols; const ch = H / rows;
        for (let c = 0; c < cols; c++) {
          const v = Math.min((freq[Math.floor((c / cols) * zBins)] / 255) * gain, 1); const litR = Math.floor(v * rows);
          for (let r = 0; r < rows; r++) {
            const active = r >= rows - litR; const bright = active ? 0.4 + ((rows - r) / rows) * 0.6 : 0.04;
            ctx.fillStyle = active ? hsl(C + (r / rows) * 30, theme.s, bright * 60) : `hsl(${C},15%,4%)`;
            ctx.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
          }
        }
      }

      if (shakeFrame) ctx.restore();
    }

    const controls = new AbortController();
    const { signal } = controls;
    // UI Listeners
    const themeDots = containerRef.current?.querySelectorAll('.theme-dot');
    if (themeDots) {
      themeDots.forEach(d => {
        d.addEventListener('click', () => {
          themeDots.forEach(x => x.classList.remove('active'));
          d.classList.add('active');
          theme = THEMES[d.dataset.theme]; wfBuf = null;
        }, { signal });
      });
    }

    const modeBtns = containerRef.current?.querySelectorAll('.mbtn');
    if (modeBtns) {
      modeBtns.forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode), { signal }));
    }

    const autoBtn = containerRef.current?.querySelector('#btn-auto');
    if (autoBtn) autoBtn.addEventListener('click', function() { autoOn = !autoOn; this.classList.toggle('active', autoOn); const autoLed = containerRef.current?.querySelector('#l-auto'); if (autoLed) autoLed.className = 'led' + (autoOn ? ' on-amber' : ''); }, { signal });
    const shakeBtn = containerRef.current?.querySelector('#btn-shake');
    if (shakeBtn) shakeBtn.addEventListener('click', function() { shakeOn = !shakeOn; this.classList.toggle('active', shakeOn); }, { signal });
    const trailsBtn = containerRef.current?.querySelector('#btn-trails');
    if (trailsBtn) trailsBtn.addEventListener('click', function() { trailsOn = !trailsOn; this.classList.toggle('active', trailsOn); }, { signal });
    const hueBtn = containerRef.current?.querySelector('#btn-hue');
    if (hueBtn) hueBtn.addEventListener('click', function() { hueCycle = !hueCycle; this.classList.toggle('active', hueCycle); });
    
    const shotBtn = containerRef.current?.querySelector('#btn-shot');
    if (shotBtn) {
      shotBtn.addEventListener('click', () => {
        const a = document.createElement('a'); a.download = 'sonoscope.png'; a.href = mc.toDataURL('image/png'); a.click();
      }, { signal });
    }

    function setupKnob(kId, dId, vId, min, max, dec, init, cb) {
      const k = containerRef.current?.querySelector(`#${kId}`); const d = containerRef.current?.querySelector(`#${dId}`); const v = containerRef.current?.querySelector(`#${vId}`);
      if (!k || !d || !v) return;
      let val = init; let active = false; let sy = 0; let sv = 0;
      function set(nv) {
        val = Math.min(max, Math.max(min, nv));
        d.style.transform = `translateX(-50%) rotate(${-135 + ((val - min) / (max - min)) * 270}deg) translateY(-8px)`;
        v.textContent = val.toFixed(dec); cb(val);
      }
      set(init);
      k.addEventListener('mousedown', (e) => { active = true; sy = e.clientY; sv = val; e.preventDefault(); }, { signal });
      k.addEventListener('touchstart', (e) => { active = true; sy = e.touches[0].clientY; sv = val; }, { passive: true, signal });
      document.addEventListener('mousemove', (e) => { if (active) set(sv + (sy - e.clientY) * ((max - min) / 80)); }, { signal });
      document.addEventListener('touchmove', (e) => { if (active) set(sv + (sy - e.touches[0].clientY) * ((max - min) / 80)); }, { passive: true, signal });
      document.addEventListener('mouseup', () => (active = false), { signal }); document.addEventListener('touchend', () => (active = false), { signal });
    }

    setupKnob('k-gain', 'kd-gain', 'kv-gain', 0.5, 4, 1, 1.5, (v) => { 
      gain = v; 
      if (audio?.gainNode) audio.gainNode.gain.value = v; 
    });
    setupKnob('k-smooth', 'kd-smooth', 'kv-smooth', 0, 0.97, 2, 0.8, (v) => { 
      smooth = v; 
      if (audio?.analyserNode) audio.analyserNode.smoothingTimeConstant = v; 
    });
    setupKnob('k-zoom', 'kd-zoom', 'kv-zoom', 0.1, 1, 1, 1, (v) => { zoom = v; });

    const handleKeyDown = async (e) => {
      if (e.key === 'ArrowRight') { const idx = (modes.indexOf(mode) + 1) % modes.length; setMode(modes[idx]); }
      else if (e.key === 'ArrowLeft') { const idx = (modes.indexOf(mode) - 1 + modes.length) % modes.length; setMode(modes[idx]); }
      else if (e.key === 's' || e.key === 'S') containerRef.current?.querySelector('#btn-shot')?.click();
    };

    document.addEventListener('keydown', handleKeyDown, { signal });
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mc);
    observer.observe(vc);
    
    // Start drawing
    draw();

    return () => {
      controls.abort();
      observer.disconnect();
      audio.removeEventListener('play', handlePlayResume);
      if (animId) { cancelAnimationFrame(animId); animId = null; }
    };
  }, [audioRef]);

  return (
    <div ref={containerRef} className={`sonoscope-container ${fullscreen ? 'sonoscope-fullscreen' : ''} ${fullscreen === 'viewport' ? 'sonoscope-viewport' : ''}`}>
      <div id="topbar">
        <div>
          <div className="brand">Sonoscope</div>
          <div className="model-tag">AV-2077 · DOPAMINE EDITION · 20 MODES</div>
        </div>
        <div className="leds">
          <div className="led on-amber" id="l-pwr"></div><span className="led-lbl">PWR</span>
          <div className="led" id="l-sig"></div><span className="led-lbl">SIG</span>
          <div className="led" id="l-beat"></div><span className="led-lbl">BEAT</span>
          <div className="led" id="l-peak"></div><span className="led-lbl">PEAK</span>
          <div className="led" id="l-auto"></div><span className="led-lbl">AUTO</span>
        </div>
        <button ref={fullscreenButtonRef} type="button" aria-label="Enter fullscreen" title="Enter fullscreen" className="fs-btn" onClick={() => toggleFullscreen().catch(console.warn)}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" fill="currentColor"/></svg>
        </button>
      </div>

      <div id="canvas-wrap">
        <canvas
          ref={canvasRef}
          id="main-canvas"
          role={fullscreen ? 'button' : undefined}
          aria-label={fullscreen ? 'Exit fullscreen' : undefined}
          tabIndex={fullscreen ? 0 : undefined}
          onClick={fullscreen ? exitFullscreen : undefined}
          onKeyDown={fullscreen ? event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              exitFullscreen();
            }
          } : undefined}
        />
        <div id="flash-overlay"></div>
      </div>

      <div id="vu-row">
        <span className="vu-lbl">VU</span>
        <canvas ref={vuCanvasRef} id="vu-canvas"></canvas>
      </div>

      <div id="bpm-row">
        <div><div id="bpm-display">---</div><div id="bpm-label">BPM</div></div>
        <div id="bpm-bar"><div id="bpm-fill"></div></div>
        <div id="energy-bar-wrap">
          <span id="energy-lbl">ENERGY</span>
          <div id="energy-outer"><div id="energy-inner"></div></div>
        </div>
      </div>

      <div id="theme-row">
        <span className="theme-lbl">THEME:</span>
        <div className="theme-dot active" data-theme="amber" style={{ background: '#d4a042' }}></div>
        <div className="theme-dot" data-theme="synthwave" style={{ background: '#cc44ff' }}></div>
        <div className="theme-dot" data-theme="acid" style={{ background: '#44ff00' }}></div>
        <div className="theme-dot" data-theme="blood" style={{ background: '#ff2200' }}></div>
        <div className="theme-dot" data-theme="ice" style={{ background: '#00ccff' }}></div>
        <div className="theme-dot" data-theme="gold" style={{ background: '#ffdd00' }}></div>
        <div className="theme-dot" data-theme="rose" style={{ background: '#ff44aa' }}></div>
      </div>

      <div id="mode-wrap">
        <div id="mode-btns">
          <button className="mbtn active" data-mode="edge_lighting">EDGE LIGHTING</button>
          <button className="mbtn" data-mode="bars">BARS</button>
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

      <div id="ctrl-row">
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
        <div id="right-ctrl">
          <div className="icon-btns">
            <button className="ibtn" id="btn-auto">AUTO</button>
            <button className="ibtn" id="btn-shake">SHAKE</button>
            <button type="button" className={`ibtn ${beatFlash ? 'active' : ''}`} aria-pressed={beatFlash} onClick={toggleBeatFlash}>
              BEAT FLASH
            </button>
            <button className="ibtn" id="btn-trails">TRAILS</button>
            <button className="ibtn" id="btn-hue">HUE CYCLE</button>
            <button className="ibtn" id="btn-shot">SNAP</button>
          </div>
        </div>
      </div>

      {/* ✅ NEW: Player Controls Section - Hidden in readOnly mode (for listeners) */}
      {!readOnly && (
      <div className="player-controls-section">
        {/* Seekbar with time display */}
        <div className="playback-info">
          <div className="time-display">{formatTime(currentTime)}</div>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              onClick={(e) => {
                if (duration <= 0) return;
                const rect = e.currentTarget.getBoundingClientRect();
                onSeek(((e.clientX - rect.left) / rect.width) * duration);
              }}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              <div
                className="progress-fill"
                style={{ width: `${((currentTime || 0) / (duration || 0)) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="time-display duration-display">-{formatTime(duration - currentTime)}</div>
        </div>

        {/* Transport Controls */}
        <div className="transport-controls">
          <button 
            className="transport-btn" 
            onClick={onSkipPrevious} 
            disabled={playlist.length === 0}
            title="Previous Track"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6z" fill="currentColor"/>
            </svg>
          </button>
          
          <button 
            className={`transport-btn play-pause ${isPlaying ? 'playing' : ''}`}
            onClick={onPlayPause}
            disabled={playlist.length === 0}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" fill="currentColor"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path d="M8 5v14l11-7z" fill="currentColor"/>
              </svg>
            )}
          </button>
          
          <button 
            className="transport-btn" 
            onClick={onSkipNext}
            disabled={playlist.length === 0}
            title="Next Track"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M16 18h2V6h-2v12zM2 18l8.5-6L2 6z" fill="currentColor"/>
            </svg>
          </button>

          <div className="track-info">
            <div className="current-track">{currentTrack?.title || 'No track selected'}</div>
            <div className="freq-info">{currentFrequency ? `Frequency: ${currentFrequency} FM` : ''}</div>
          </div>
        </div>

        {/* Upload Button */}
        <div className="upload-section">
          <input
            id="player-audio-upload"
            type="file"
            multiple
            accept="audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/aac,audio/mp4,.mp3,.wav,.ogg,.webm,.aac,.m4a"
            onChange={onFileUpload}
            style={{ display: 'none' }}
          />
          <label htmlFor="player-audio-upload" className="upload-label">
            📁 Upload Audio
          </label>
        </div>
      </div>
      )}

      {/* ✅ NEW: Playlist Section */}
      {playlist.length > 0 && (
        <div className="embedded-playlist">
          <div className="playlist-header">
            <span className="playlist-title">Playlist ({playlist.length} tracks)</span>
            {listenerCount !== undefined && <span className="listener-badge">👥 {listenerCount} listening</span>}
          </div>
          <div className="playlist-items">
            {playlist.map((track, index) => (
              <div
                key={track.id}
                className={`playlist-item ${currentTrack?.id === track.id ? 'active' : ''}`}
                onClick={() => onTrackSelect(index)}
                title={`${track.title} - ${formatTime(track.duration)}`}
              >
                <span className="track-number">{index + 1}</span>
                <span className="track-title">{track.title}</span>
                <span className="track-duration">{formatTime(track.duration)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div id="botbar">
        <div id="track-name" className={trackName ? 'on' : ''}>{trackName || 'WAITING FOR SIGNAL...'}</div>
        <div id="mode-name">EDGE LIGHTING</div>
        <div id="keys-hint">← → MODE · S SNAP · F FULLSCREEN · TAP / ESC TO EXIT</div>
      </div>
    </div>
  );

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
};