import React from 'react';
import { motion } from 'framer-motion';
import AudioWaveform from './AudioWaveform'; // Assuming path is correct

interface RecordingFeedbackPopupProps {
  statusText: string;
}

const RecordingFeedbackPopup: React.FC<RecordingFeedbackPopupProps> = ({ statusText }) => {
  return (
    <motion.div
      className="z-50 pointer-events-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="bg-neutral-800 p-6 rounded-xl shadow-2xl text-center w-auto max-w-sm"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, duration: 0.2 }}
      >
        <p className="text-white text-xl mb-4 font-medium animate-pulse">
          {statusText}
        </p>
        {/* Integrate AudioWaveform component here */}
        {/* For now, a placeholder if AudioWaveform isn't ready for direct integration or needs specific props */}
        <div className="w-full h-20 bg-neutral-700/50 rounded-lg flex items-center justify-center text-sm text-neutral-400 overflow-hidden">
          {/* 
            Assuming AudioWaveform takes props like 'isRecording' or 'audioData'.
            For this popup, it's always in a 'recording' context.
            If AudioWaveform needs live data, that needs to be plumbed through App.tsx.
            For a simple visual, we might just show a generic animation or the component itself if it handles its own state.
          */}
          <AudioWaveform isActive={true} /> 
        </div>
      </motion.div>
    </motion.div>
  );
};

export default RecordingFeedbackPopup;
