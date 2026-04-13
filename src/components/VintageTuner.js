import React, { useState, useRef, useEffect } from 'react';
import './VintageTuner.css';

// Helper function to quantize frequency to step increments
const quantizeFrequency = (freq, step) => {
  return Math.round(freq / step) * step;
};

// Calculate angle from center
const calculateAngle = (clientX, clientY, rect) => {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  return Math.atan2(clientY - centerY, clientX - centerX);
};

export const VintageTuner = ({ onTune, minFrequency = 0, maxFrequency = 100, step = 0.5, title = "Select Station", showFrequencyInput = false }) => {
  const initialFreq = quantizeFrequency((minFrequency + maxFrequency) / 2, step);
  const [frequency, setFrequency] = useState(initialFreq.toFixed(1));
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dialRef = useRef(null);
  const containerRef = useRef(null);

  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleFrequencyInputChange = (e) => {
    let value = e.target.value;
    if (value === '') {
      setFrequency('');
      return;
    }
    
    const freq = parseFloat(value);
    if (!isNaN(freq)) {
      if (freq >= minFrequency && freq <= maxFrequency) {
        const quantized = quantizeFrequency(freq, step);
        setFrequency(quantized.toFixed(1));
        
        // Update rotation based on frequency
        const normalizedFreq = (freq - minFrequency) / (maxFrequency - minFrequency);
        const newRotation = normalizedFreq * 360;
        setRotation(newRotation);
      }
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleDragMove = (clientX, clientY) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const angle = calculateAngle(clientX, clientY, rect);

      let newRotation = (angle * 180) / Math.PI + 90;
      if (newRotation < 0) newRotation += 360;

      setRotation(newRotation);

      // Convert rotation to frequency
      const normalizedRotation = (newRotation % 360) / 360;
      const rawFreq = minFrequency + normalizedRotation * (maxFrequency - minFrequency);
      const quantizedFreq = quantizeFrequency(rawFreq, step);
      setFrequency(quantizedFreq.toFixed(1));
    };

    const handleMouseMove = (e) => {
      handleDragMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, minFrequency, maxFrequency, step]);

  const handleTune = () => {
    onTune(parseFloat(frequency));
  };

  return (
    <div className="vintage-tuner-container">
      <h2 className="tuner-title">{title}</h2>
      
      <div className="tuner-panel">
        <div className="tuner-display">
          <div className="frequency-display">
            <div className="freq-label">FM</div>
            {showFrequencyInput ? (
              <input
                type="number"
                className="freq-input"
                value={frequency}
                onChange={handleFrequencyInputChange}
                step={step}
                min={minFrequency}
                max={maxFrequency}
                placeholder="0.0"
              />
            ) : (
              <div className="freq-value">{frequency}</div>
            )}
          </div>
          <div className="freq-range">
            <span>{minFrequency}</span>
            <span>{maxFrequency}</span>
          </div>
        </div>

        <div 
          ref={containerRef}
          className="tuner-dial-container"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div className="tuner-outer-ring">
            {/* Frequency markers */}
            {[...Array(61)].map((_, i) => {
              const angle = (i / 60) * 360;
              const isMajor = i % 10 === 0;
              return (
                <div
                  key={i}
                  className={`frequency-marker ${isMajor ? 'major' : ''}`}
                  style={{
                    transform: `rotate(${angle}deg) translateY(-85px)`,
                  }}
                />
              );
            })}
          </div>

          <div
            ref={dialRef}
            className="tuner-dial"
            style={{ transform: `rotate(${rotation}deg)` }}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            <div className="needle"></div>
            <div className="dial-center"></div>
          </div>

          <div className="tuner-pointer"></div>
        </div>

        <button className="tuner-button" onClick={handleTune}>
          🎙️ TUNE IN
        </button>
      </div>
    </div>
  );
};
