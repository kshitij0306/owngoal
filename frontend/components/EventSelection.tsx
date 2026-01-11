
import React, { useState } from 'react';
import { StreamEvent, MediaLibrary } from '../types';
import { processPublicFolderFiles } from '../services/FileSystemService';

interface EventSelectionProps {
  onSelect: (event: StreamEvent, library: MediaLibrary) => void;
  userName: string;
}

const EventSelection: React.FC<EventSelectionProps> = ({ onSelect, userName }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredEvents, setDiscoveredEvents] = useState<StreamEvent[]>([]);
  const [tempLibrary, setTempLibrary] = useState<MediaLibrary | null>(null);

  const handleMountClick = () => {
    setIsScanning(true);
    // Use a small timeout to let the UI show the loading state
    setTimeout(() => {
      try {
        const { library, events } = processPublicFolderFiles();
        setDiscoveredEvents(events);
        setTempLibrary(library);
      } catch (err) {
        console.error(err);
        alert("Error parsing folder structure in public/processed. Ensure it matches session/camera/file.mp4");
      } finally {
        setIsScanning(false);
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white p-8 flex flex-col items-center justify-start overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl w-full py-12">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-600 text-white px-3 py-1 rounded font-black text-xs italic tracking-tighter shadow-lg shadow-red-600/20">OWN GOAL</div>
                <h1 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em]">SYSTEM_OPERATOR: {userName}</h1>
            </div>
            <h2 className="text-6xl font-black italic tracking-tighter uppercase leading-none">Broadcast Control</h2>
          </div>
          
          <div className="relative">
            <button 
              onClick={handleMountClick}
              disabled={isScanning}
              className={`flex items-center gap-4 px-8 py-4 rounded-xl border-2 transition-all duration-500 ${
                isScanning 
                ? 'border-blue-500 bg-blue-500/10 text-blue-500 cursor-not-allowed' 
                : 'border-red-600 bg-red-600 text-white hover:bg-red-500 shadow-[0_0_25px_rgba(220,38,38,0.15)]'
              }`}
            >
              {isScanning ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  <span className="text-xs font-black uppercase tracking-widest">Processing Library...</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>
                  <span className="text-xs font-black uppercase tracking-widest">Index /processed Library</span>
                </>
              )}
            </button>
          </div>
        </header>

        {discoveredEvents.length === 0 && !isScanning && (
          <div className="py-32 text-center bg-[#050505] rounded-3xl border border-dashed border-white/5">
            <div className="text-gray-900 text-8xl font-black mb-6 select-none opacity-20 italic tracking-tighter">OFFLINE</div>
            <p className="text-gray-600 text-xs uppercase tracking-[0.4em] font-black max-w-sm mx-auto leading-relaxed">
              Index <span className="text-blue-500">public/processed</span> to load broadcast assets.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {discoveredEvents.map((event) => (
            <div 
              key={event.id}
              onClick={() => tempLibrary && onSelect(event, tempLibrary)}
              className="group bg-[#080808] border border-white/5 rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:border-blue-500/50 hover:-translate-y-2 shadow-2xl flex flex-col"
            >
              <div className="aspect-video bg-black relative overflow-hidden">
                <img src={event.thumbnail} className="w-full h-full object-cover opacity-10 group-hover:opacity-40 transition-opacity grayscale" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-blue-600/10 border border-blue-500/20 text-blue-500 px-4 py-2 rounded-lg text-[10px] font-black tracking-widest uppercase scale-90 group-hover:scale-100 transition-transform">
                      Open Session
                    </div>
                </div>
                <div className="absolute bottom-4 left-4 flex gap-1.5">
                    {event.availableCams.map(cam => (
                        <span key={cam} className="px-2 py-1 rounded bg-black/90 border border-white/10 text-[8px] font-black text-gray-500 uppercase tracking-tighter">
                            {cam}
                        </span>
                    ))}
                </div>
              </div>

              <div className="p-8">
                <div className="text-[9px] font-mono text-gray-700 mb-2 uppercase tracking-widest font-bold">Local File Link</div>
                <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-6 group-hover:text-blue-500 transition-colors leading-none">
                  {event.id}
                </h3>
                <div className="flex justify-between items-center text-[10px] text-gray-600 font-black uppercase tracking-widest border-t border-white/5 pt-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {event.availableCams.length} Angles
                  </div>
                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">Launch →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventSelection;
