import React from 'react';
import { Lightbulb } from 'lucide-react';

interface Suggestion {
  id: string;
  text: string;
  type: string;
  source?: string;
}

interface SuggestionsProps {
  suggestions: Suggestion[];
}

const Suggestions: React.FC<SuggestionsProps> = ({ suggestions }) => {
  if (suggestions.length === 0) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-medium text-gray-800 mb-2">Suggestions</h2>
        <p className="text-gray-500 text-sm">No suggestions available</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-medium text-gray-100 mb-2">Suggestions</h2>
      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="bg-gray-800 rounded-lg border border-gray-700 p-3 shadow-sm">
            <div className="flex items-center mb-1">
              <Lightbulb size={14} className="text-primary-400 mr-1.5" />
              <span className="text-xs font-medium text-primary-300 uppercase">{suggestion.type}</span>
            </div>
            <p className="text-sm text-gray-100 mb-1">{suggestion.text}</p>
            {suggestion.source && (
              <p className="text-xs text-gray-500 italic">Source: {suggestion.source}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Suggestions;
