import React from 'react';

interface AudioWaveformProps {
  isActive: boolean;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ isActive }) => {
  if (!isActive) return null;

  // Create an array of bars with different heights and delays
  const bars = Array.from({ length: 12 }, (_, i) => ({
    height: Math.floor(Math.random() * 20) + 5,
    delay: `${i * 0.1}s`
  }));

  return (
    <div className="flex items-center justify-center h-12 my-2">
      {bars.map((bar, index) => (
        <div
          key={index}
          className="waveform-bar"
          style={{
            height: `${bar.height}px`,
            width: '3px',
            animationDelay: bar.delay
          }}
        />
      ))}
    </div>
  );
};

export default AudioWaveform;
