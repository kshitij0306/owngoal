
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, SegmentDecision, PlaybackState } from './types';
import { VIDEO_ID, INITIAL_CAM, CAM_LIST, SEGMENT_DURATION_MS } from './constants';
import Login from './components/Login';
import SegmentPlayer from './components/SegmentPlayer';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>({
    currentSegment: 1,
    currentCam: INITIAL_CAM,
    isBuffering: false,
    isPaused: false,
    videoId: VIDEO_ID
  });

  const [decisionBuffer, setDecisionBuffer] = useState<Record<number, SegmentDecision>>({});
  const [logs, setLogs] = useState<{msg: string, type: 'ws' | 'info'}[]>([]);

  const addLog = (msg: string, type: 'ws' | 'info' = 'info') => {
    setLogs(prev => [{ msg, type }, ...prev].slice(0, 20));
  };

  // WS Simulation
  useEffect(() => {
    if (!currentUser) return;

    const simulateWS = setInterval(() => {
      // Simulate decisions for current and future segments
      const targetSeg = playback.currentSegment + Math.floor(Math.random() * 2);
      
      // Randomly pick a user ID (50% chance it's for current user)
      const msgUserId = Math.random() > 0.5 ? currentUser.id : 'OTHER_USER_' + Math.floor(Math.random() * 10);
      const camChoice = CAM_LIST[Math.floor(Math.random() * CAM_LIST.length)].id;
      
      const msg: SegmentDecision = {
        user_id: msgUserId,
        seg: targetSeg,
        cam: camChoice,
        confidence: Number(Math.random().toFixed(4))
      };

      // Filtering Logic
      if (msg.user_id !== currentUser.id) {
        addLog(`WS: Ignored msg for ${msg.user_id}`, 'ws');
        return;
      }

      addLog(`WS: Received cam decision for Seg ${msg.seg} -> ${msg.cam}`, 'ws');
      setDecisionBuffer(prev => ({ ...prev, [msg.seg]: msg }));
    }, 1500);

    return () => clearInterval(simulateWS);
  }, [currentUser, playback.currentSegment]);

  const handleSegmentEnd = useCallback(() => {
    setPlayback(prev => {
      const nextSeg = prev.currentSegment + 1;
      const decision = decisionBuffer[nextSeg];
      
      return {
        ...prev,
        currentSegment: nextSeg,
        currentCam: decision ? decision.cam : prev.currentCam, // Fallback to current if no decision
      };
    });
  }, [decisionBuffer]);

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white font-sans overflow-hidden">
      {/* Top Header */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a0a]">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 text-white px-2 py-0.5 rounded font-black text-sm italic tracking-tighter">
            OWN GOAL
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-bold">Live Stream Director</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-gray-600 uppercase tracking-widest">Active Operator</span>
            <span className="text-[11px] font-mono text-blue-400">{currentUser.id}</span>
          </div>
          <button 
            onClick={() => setCurrentUser(null)}
            className="text-[10px] font-bold text-gray-500 hover:text-white transition-colors"
          >
            LOGOUT
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden">
        {/* Playback Container */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          <div className="flex-1 relative">
            <SegmentPlayer 
              currentSegment={playback.currentSegment}
              currentCam={playback.currentCam}
              onSegmentEnd={handleSegmentEnd}
              onBufferStatus={(isBuffering) => setPlayback(p => ({ ...p, isBuffering }))}
            />
            
            {playback.isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-white/10 border-t-red-500 rounded-full animate-spin" />
                  <span className="text-[10px] tracking-widest font-bold">SYNCING FEED</span>
                </div>
              </div>
            )}
          </div>

          {/* Status Indicators */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 flex justify-between items-center">
             <div className="flex gap-8">
               <div className="flex flex-col">
                 <span className="text-[9px] text-gray-600 uppercase tracking-widest font-bold mb-1">Current Segment</span>
                 <span className="text-xl font-mono">{playback.currentSegment.toString().padStart(5, '0')}</span>
               </div>
               <div className="flex flex-col">
                 <span className="text-[9px] text-gray-600 uppercase tracking-widest font-bold mb-1">Active Angle</span>
                 <span className="text-xl font-bold text-red-500">{playback.currentCam}</span>
               </div>
               <div className="flex flex-col">
                 <span className="text-[9px] text-gray-600 uppercase tracking-widest font-bold mb-1">Decision Confidence</span>
                 <span className="text-xl font-mono text-green-500">{(decisionBuffer[playback.currentSegment]?.confidence * 100 || 0).toFixed(1)}%</span>
               </div>
             </div>
             
             <div className="flex gap-2">
                {CAM_LIST.map(cam => (
                  <div 
                    key={cam.id}
                    className={`px-3 py-1 rounded text-[9px] font-bold border ${
                      playback.currentCam === cam.id 
                      ? 'bg-red-500/10 border-red-500 text-red-500' 
                      : 'bg-white/5 border-white/5 text-gray-600'
                    }`}
                  >
                    {cam.label}
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Console / Sidebars */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 overflow-hidden">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">WS Message Terminal</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] text-green-500 font-bold">CONNECTED</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-2">
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-3 ${log.type === 'ws' ? 'text-gray-400' : 'text-blue-400'}`}>
                  {/* Fixed: Removed fractionalSecondDigits to comply with available DateTimeFormatOptions in the environment */}
                  <span className="text-gray-700">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                  <span className="flex-1 break-all">{log.msg}</span>
                </div>
              ))}
              {logs.length === 0 && <div className="text-gray-800 italic">No incoming data packets...</div>}
            </div>
          </div>

          {/* Pending Decisions Card */}
          <div className="h-48 bg-[#0a0a0a] border border-white/5 rounded-xl p-4 overflow-hidden flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-white/5 pb-2 block">Decision Stack</span>
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-2">
                {Object.values(decisionBuffer).sort((a,b) => b.seg - a.seg).slice(0, 10).map(d => (
                  <div key={d.seg} className="bg-white/5 rounded p-2 border border-white/5">
                    <div className="text-[8px] text-gray-600 mb-1">SEG {d.seg}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold">{d.cam}</span>
                      <span className="text-[9px] text-green-500">{(d.confidence*100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="h-10 border-t border-white/5 bg-[#050505] flex items-center justify-between px-6 text-[9px] font-bold text-gray-600 tracking-widest uppercase">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Segment Hash: Valid
          </div>
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
             Buffer: {Math.max(0, Object.keys(decisionBuffer).length)} Packets
          </div>
        </div>
        <div>
          Auth User: {currentUser.id} • Path Resolution: Native
        </div>
      </footer>
    </div>
  );
};

export default App;
