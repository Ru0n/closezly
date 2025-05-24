import React from 'react';
import { MessageCircle } from 'lucide-react';

interface QuestionProps {
  text: string;
}

const Question: React.FC<QuestionProps> = ({ text }) => {
  if (!text) return null;
  
  return (
    <div className="flex items-start space-x-3 p-4">
      <div className="flex-shrink-0 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white">
        <MessageCircle size={16} />
      </div>
      <div className="flex-1">
        <p className="text-gray-100 text-base">{text}</p>
      </div>
    </div>
  );
};

export default Question;
