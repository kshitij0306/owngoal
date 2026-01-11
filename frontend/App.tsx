
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, SegmentDecision, PlaybackState, StreamEvent, MediaLibrary } from './types';
import { INITIAL_CAM } from './constants';
import Login from './components/Login';
import EventSelection from './components/EventSelection';
import SegmentPlayer from './components/SegmentPlayer';

type CameraDecision = {
  VideoID: string;
  User: string;
  Timestamp: string;
  Camera: string;
};

type NormalizedDecision = {
  timeSec: number;
  cam: string;
  label: string;
};

const parseTimestampToSeconds = (value: string): number => {
  const [mins, secs] = value.split(':').map(part => Number(part));
  if (!Number.isFinite(mins) || !Number.isFinite(secs)) return NaN;
  return mins * 60 + secs;
};

const normalizeCameraName = (value: string): string => {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleaned.startsWith('cam')) return cleaned;

  const mapping: Record<string, string> = {
    '2cam': 'cam2',
    '4cam': 'cam4',
    '5cam': 'cam5',
    '11cam': 'cam11',
    'brep': 'brep',
    'arep': 'arep'
  };

  return mapping[cleaned] ?? value.toLowerCase();
};

const COMPARE_USERS = ['User1', 'User2'] as const;
type CompareUser = typeof COMPARE_USERS[number];

const formatTime = (value: number): string => {
  const safe = Math.max(0, Math.floor(value));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<StreamEvent | null>(null);
  const [mediaLibrary, setMediaLibrary] = useState<MediaLibrary | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>({
    currentSegment: 1,
    currentCam: INITIAL_CAM,
    isBuffering: false,
    isPaused: false,
    videoId: ''
  });

  const isCompareMode = currentUser?.id.trim() === '';
  const [comparePlayback, setComparePlayback] = useState<Record<CompareUser, PlaybackState>>({
    User1: {
      currentSegment: 1,
      currentCam: INITIAL_CAM,
      isBuffering: false,
      isPaused: false,
      videoId: ''
    },
    User2: {
      currentSegment: 1,
      currentCam: INITIAL_CAM,
      isBuffering: false,
      isPaused: false,
      videoId: ''
    }
  });
  const [compareTimes, setCompareTimes] = useState<Record<CompareUser, number>>({
    User1: 0,
    User2: 0
  });
  const [compareNextIndex, setCompareNextIndex] = useState<Record<CompareUser, number>>({
    User1: 0,
    User2: 0
  });

  const [decisionBuffer, setDecisionBuffer] = useState<Record<number, SegmentDecision>>({});
  const [decisionSchedule, setDecisionSchedule] = useState<CameraDecision[]>([]);
  const [playbackTimeSec, setPlaybackTimeSec] = useState(0);
  const [nextDecisionIndex, setNextDecisionIndex] = useState(0);
  const [logs, setLogs] = useState<{msg: string, type: 'ws' | 'info' | 'error' | 'fallback'}[]>([]);

  const addLog = (msg: string, type: 'ws' | 'info' | 'error' | 'fallback' = 'info') => {
    setLogs(prev => [{ msg, type }, ...prev].slice(0, 20));
  };

  const handleEventSelect = (event: StreamEvent, library: MediaLibrary) => {
    setMediaLibrary(library);
    setSelectedEvent(event);
    setPlayback(prev => ({ 
      ...prev, 
      videoId: event.id, 
      currentCam: event.availableCams.includes(INITIAL_CAM) ? INITIAL_CAM : event.availableCams[0] 
    }));
    addLog(`SYSTEM: Dynamic Discovery Complete for ${event.id}`, 'info');
  };

  useEffect(() => {
    if (!selectedEvent || !isCompareMode) return;
    const defaultCam = selectedEvent.availableCams.includes(INITIAL_CAM)
      ? INITIAL_CAM
      : (selectedEvent.availableCams[0] ?? '');

    setComparePlayback(prev => ({
      User1: {
        ...prev.User1,
        videoId: selectedEvent.id,
        currentSegment: 1,
        currentCam: defaultCam
      },
      User2: {
        ...prev.User2,
        videoId: selectedEvent.id,
        currentSegment: 1,
        currentCam: defaultCam
      }
    }));
    setCompareTimes({ User1: 0, User2: 0 });
    setCompareNextIndex({ User1: 0, User2: 0 });
  }, [selectedEvent?.id, isCompareMode]);

  // Load schedule JSON when an event is selected.
  useEffect(() => {
    if (!selectedEvent) return;
    let isActive = true;

    fetch('/decisionSchedule.json')
      .then(response => response.json())
      .then(data => {
        if (!isActive) return;
        if (Array.isArray(data)) {
          setDecisionSchedule(data);
        } else {
          console.warn('decisionSchedule.json is not an array');
          setDecisionSchedule([]);
        }
      })
      .catch(error => {
        console.error('Failed to load decision schedule', error);
        if (isActive) setDecisionSchedule([]);
      });

    return () => {
      isActive = false;
    };
  }, [selectedEvent?.id]);

  const userSchedule = useMemo<NormalizedDecision[]>(() => {
    if (!currentUser || !selectedEvent) return [];

    return decisionSchedule
      .filter(entry => entry.VideoID === selectedEvent.id && entry.User === currentUser.id)
      .map(entry => {
        const timeSec = parseTimestampToSeconds(entry.Timestamp);
        return {
          timeSec,
          cam: normalizeCameraName(entry.Camera),
          label: entry.Timestamp
        };
      })
      .filter(entry => Number.isFinite(entry.timeSec))
      .sort((a, b) => a.timeSec - b.timeSec);
  }, [decisionSchedule, currentUser, selectedEvent]);

  const compareSchedules = useMemo<Record<CompareUser, NormalizedDecision[]>>(() => {
    if (!selectedEvent) {
      return { User1: [], User2: [] };
    }

    const buildSchedule = (userId: CompareUser) => (
      decisionSchedule
        .filter(entry => entry.VideoID === selectedEvent.id && entry.User === userId)
        .map(entry => {
          const timeSec = parseTimestampToSeconds(entry.Timestamp);
          return {
            timeSec,
            cam: normalizeCameraName(entry.Camera),
            label: entry.Timestamp
          };
        })
        .filter(entry => Number.isFinite(entry.timeSec))
        .sort((a, b) => a.timeSec - b.timeSec)
    );

    return {
      User1: buildSchedule('User1'),
      User2: buildSchedule('User2')
    };
  }, [decisionSchedule, selectedEvent]);

  useEffect(() => {
    setNextDecisionIndex(0);
  }, [currentUser?.id, selectedEvent?.id, userSchedule.length]);

  useEffect(() => {
    if (!selectedEvent || userSchedule.length === 0) return;
    const nextDecision = userSchedule[nextDecisionIndex];
    if (!nextDecision) return;

    if (playbackTimeSec >= nextDecision.timeSec) {
      if (selectedEvent.availableCams.includes(nextDecision.cam)) {
        setPlayback(prev => ({ ...prev, currentCam: nextDecision.cam }));
        addLog(`SCHEDULE: ${nextDecision.label} -> ${nextDecision.cam}`, 'info');
      } else {
        addLog(`SCHEDULE_SKIP: ${nextDecision.cam} not available`, 'error');
      }
      setNextDecisionIndex(prev => prev + 1);
    }
  }, [playbackTimeSec, userSchedule, nextDecisionIndex, selectedEvent]);

  useEffect(() => {
    if (!isCompareMode || !selectedEvent) return;
    const schedule = compareSchedules.User1;
    const nextDecision = schedule[compareNextIndex.User1];
    if (!nextDecision) return;

    if (compareTimes.User1 >= nextDecision.timeSec) {
      if (selectedEvent.availableCams.includes(nextDecision.cam)) {
        setComparePlayback(prev => ({
          ...prev,
          User1: {
            ...prev.User1,
            currentCam: nextDecision.cam
          }
        }));
        addLog(`SCHEDULE[User1]: ${nextDecision.label} -> ${nextDecision.cam}`, 'info');
      } else {
        addLog(`SCHEDULE_SKIP[User1]: ${nextDecision.cam} not available`, 'error');
      }
      setCompareNextIndex(prev => ({ ...prev, User1: prev.User1 + 1 }));
    }
  }, [
    isCompareMode,
    selectedEvent,
    compareSchedules.User1,
    compareNextIndex.User1,
    compareTimes.User1
  ]);

  useEffect(() => {
    if (!isCompareMode || !selectedEvent) return;
    const schedule = compareSchedules.User2;
    const nextDecision = schedule[compareNextIndex.User2];
    if (!nextDecision) return;

    if (compareTimes.User2 >= nextDecision.timeSec) {
      if (selectedEvent.availableCams.includes(nextDecision.cam)) {
        setComparePlayback(prev => ({
          ...prev,
          User2: {
            ...prev.User2,
            currentCam: nextDecision.cam
          }
        }));
        addLog(`SCHEDULE[User2]: ${nextDecision.label} -> ${nextDecision.cam}`, 'info');
      } else {
        addLog(`SCHEDULE_SKIP[User2]: ${nextDecision.cam} not available`, 'error');
      }
      setCompareNextIndex(prev => ({ ...prev, User2: prev.User2 + 1 }));
    }
  }, [
    isCompareMode,
    selectedEvent,
    compareSchedules.User2,
    compareNextIndex.User2,
    compareTimes.User2
  ]);

  const handleSegmentEnd = useCallback(() => {
    setPlayback(prev => {
      const nextSeg = prev.currentSegment + 1;
      const session = mediaLibrary?.[prev.videoId];
      const hasNextSegment = session
        ? Object.values(session.cams).some(cam => cam.segments[nextSeg])
        : false;

      if (!hasNextSegment) {
        addLog(`END: No segment ${nextSeg} for ${prev.videoId}`, 'info');
        return prev;
      }
      const decision = decisionBuffer[nextSeg];
      
      if (!decision) {
        addLog(`FALLBACK: Seg ${nextSeg} default to ${prev.currentCam}`, 'fallback');
        return { ...prev, currentSegment: nextSeg };
      }

      addLog(`SWITCH: Seg ${nextSeg} -> ${decision.cam}`, 'info');
      return {
        ...prev,
        currentSegment: nextSeg,
        currentCam: decision.cam
      };
    });
  }, [decisionBuffer, mediaLibrary]);

  if (!currentUser) return <Login onLogin={setCurrentUser} />;
  if (!selectedEvent || !mediaLibrary) return <EventSelection userName={currentUser.name} onSelect={handleEventSelect} />;
  if (isCompareMode) {
    const defaultCam = selectedEvent.availableCams.includes(INITIAL_CAM)
      ? INITIAL_CAM
      : (selectedEvent.availableCams[0] ?? '');
    const getCompareCam = (userId: CompareUser) => comparePlayback[userId].currentCam || defaultCam;

    return (
      <div className="flex flex-col h-screen bg-[#020202] text-white font-sans overflow-hidden">
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#080808] z-50">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 text-white px-2 py-0.5 rounded font-black text-sm italic tracking-tighter">OWN GOAL</div>
            <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase text-blue-500 leading-none tracking-widest">{selectedEvent.id}</span>
               <span className="text-[8px] uppercase tracking-[0.2em] text-gray-600 font-bold">Dual Viewer Compare</span>
            </div>
          </div>
          <button 
            onClick={() => { 
              setSelectedEvent(null);
              setPlayback(p => ({ ...p, currentSegment: 1 }));
              setDecisionBuffer({});
              setCompareTimes({ User1: 0, User2: 0 });
              setCompareNextIndex({ User1: 0, User2: 0 });
            }}
            className="text-[9px] font-black text-gray-500 hover:text-white border border-white/10 px-3 py-1 rounded transition-all"
          >
            DISCONNECT UPLINK
          </button>
        </header>

        <main className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden bg-[radial-gradient(circle_at_center,_#0a0a0a_0%,_#020202_100%)]">
          <div className="col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {COMPARE_USERS.map(userId => {
              const cam = getCompareCam(userId);
              return (
                <div key={userId} className="bg-[#080808] border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${userId === 'User1' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
                        {userId}
                      </div>
                      <div className="text-[9px] text-gray-500 uppercase tracking-widest">CAM</div>
                      <div className="text-[10px] font-black text-white uppercase">{cam}</div>
                    </div>
                    <div className="text-[10px] font-mono text-gray-500">{formatTime(compareTimes[userId])}</div>
                  </div>
                  <div className="flex-1 relative min-h-[260px]">
                    <SegmentPlayer 
                      videoId={selectedEvent.id}
                      currentSegment={comparePlayback[userId].currentSegment}
                      currentCam={cam}
                      library={mediaLibrary}
                      onSegmentEnd={() => {}}
                      onBufferStatus={(isBuffering) => setComparePlayback(prev => ({
                        ...prev,
                        [userId]: { ...prev[userId], isBuffering }
                      }))}
                      onTimeUpdate={(time) => setCompareTimes(prev => ({ ...prev, [userId]: time }))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#020202] text-white font-sans overflow-hidden">
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#080808] z-50">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 text-white px-2 py-0.5 rounded font-black text-sm italic tracking-tighter">OWN GOAL</div>
          <div className="flex flex-col">
             <span className="text-[10px] font-black uppercase text-blue-500 leading-none tracking-widest">{selectedEvent.id}</span>
             <span className="text-[8px] uppercase tracking-[0.2em] text-gray-600 font-bold">Local File Access Mode</span>
          </div>
        </div>
        <button 
          onClick={() => { setSelectedEvent(null); setPlayback(p => ({ ...p, currentSegment: 1 })); setDecisionBuffer({}); }}
          className="text-[9px] font-black text-gray-500 hover:text-white border border-white/10 px-3 py-1 rounded transition-all"
        >
          DISCONNECT UPLINK
        </button>
      </header>

      <main className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden bg-[radial-gradient(circle_at_center,_#0a0a0a_0%,_#020202_100%)]">
        <div className="col-span-12 lg:col-span-9 flex flex-col gap-4">
          <div className="flex-1 relative shadow-2xl rounded-2xl overflow-hidden border border-white/5">
            <SegmentPlayer 
              videoId={playback.videoId}
              currentSegment={playback.currentSegment}
              currentCam={playback.currentCam}
              library={mediaLibrary}
              onSegmentEnd={handleSegmentEnd}
              onBufferStatus={(isBuffering) => setPlayback(p => ({ ...p, isBuffering }))}
              onTimeUpdate={setPlaybackTimeSec}
            />
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-6 flex justify-between items-center">
             <div className="flex gap-12">
               <div>
                 <div className="text-[9px] text-gray-600 uppercase font-black mb-1">Index</div>
                 <div className="text-2xl font-mono font-bold">{playback.currentSegment.toString().padStart(5, '0')}</div>
               </div>
               <div>
                 <div className="text-[9px] text-gray-600 uppercase font-black mb-1">Source</div>
                 <div className="text-2xl font-black text-red-500 italic uppercase">{playback.currentCam}</div>
               </div>
             </div>
             <div className="flex gap-2">
                {selectedEvent.availableCams.map(cam => (
                  <button
                    key={cam}
                    type="button"
                    onClick={() => setPlayback(prev => ({ ...prev, currentCam: cam }))}
                    className={`px-4 py-2 rounded text-[10px] font-black border transition-all ${playback.currentCam === cam ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-white/5 border-white/5 text-gray-700 hover:border-white/20 hover:text-gray-300'}`}
                  >
                    {cam}
                  </button>
                ))}
             </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 overflow-hidden">
          <div className="bg-[#080808] border border-white/5 rounded-xl flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 text-[10px] font-black text-gray-600 uppercase tracking-widest">Decision Stream</div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-2 custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-3 leading-relaxed ${log.type === 'error' ? 'text-red-500' : log.type === 'fallback' ? 'text-yellow-600' : 'text-blue-400'}`}>
                  <span className="text-gray-800 shrink-0">{i}</span>
                  <span className="flex-1">{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
