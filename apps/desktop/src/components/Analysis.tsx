import React from 'react';
import { AlertCircle } from 'lucide-react';

interface AnalysisProps {
  isProcessing: boolean;
  text: string;
}

const Analysis: React.FC<AnalysisProps> = ({ isProcessing, text }) => {
  if (isProcessing) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="flex items-center space-x-2">
          <AlertCircle size={18} className="text-gray-400" />
          <span className="text-gray-300">Analyzing screen...</span>
        </div>
      </div>
    );
  }

  if (!text) return null;

  return (
    <div className="p-4">
      <p className="text-gray-100 text-base">{text}</p>
    </div>
  );
};

export default Analysis;
