import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AudioInputControlProps {
  isRecording: boolean;
  recordingTime: number; // in seconds
  onToggleRecording: () => void;
  className?: string;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const AudioInputControl: React.FC<AudioInputControlProps> = ({
  isRecording,
  recordingTime,
  onToggleRecording,
  className,
}) => {
  return (
    <div className={cn('flex items-center space-x-2 p-2 bg-background rounded-lg shadow', className)}>
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-700 hover:bg-gray-600 text-white hover:text-white"
        onClick={onToggleRecording}
      >
        {isRecording ? <Mic size={20} /> : <MicOff size={20} />}
      </Button>
      <div className="text-sm font-mono text-foreground">
        {formatTime(recordingTime)}
      </div>
    </div>
  );
};

export default AudioInputControl;
