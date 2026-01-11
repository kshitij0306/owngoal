
import React from 'react';
import { VideoSource } from '../types';

interface AnglePreviewProps {
  source: VideoSource;
  isActive: boolean;
  onClick: () => void;
}

const AnglePreview: React.FC<AnglePreviewProps> = ({ source, isActive, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`relative cursor-pointer transition-all duration-300 rounded-lg overflow-hidden border-2 ${
        isActive ? 'border-red-500 scale-105 shadow-lg shadow-red-500/20' : 'border-gray-700 hover:border-gray-500'
      }`}
    >
      <video 
        muted 
        className="w-full aspect-video object-cover opacity-60 group-hover:opacity-100"
        src={source.url}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
        <span className="text-[10px] font-bold uppercase tracking-wider">{source.label}</span>
      </div>
      {isActive && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[8px] font-bold text-red-500 uppercase">Live</span>
        </div>
      )}
    </div>
  );
};

export default AnglePreview;
