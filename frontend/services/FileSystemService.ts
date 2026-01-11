
import { MediaLibrary, MediaSegment, StreamEvent } from '../types';

type LibraryEntry = {
  path: string;
  source: MediaSegment;
};

const PUBLIC_PROCESSED_GLOB = import.meta.glob('../public/processed/**/*.mp4', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

export function processPublicFolderFiles(): { library: MediaLibrary, events: StreamEvent[] } {
  const entries = Object.entries(PUBLIC_PROCESSED_GLOB).map(([path, url]) => ({
    path,
    source: url
  }));

  return buildLibrary(entries);
}

export function processFolderFiles(files: FileList): { library: MediaLibrary, events: StreamEvent[] } {
  const entries = Array.from(files).map(file => ({
    path: file.webkitRelativePath || file.name,
    source: file
  }));

  return buildLibrary(entries);
}

function buildLibrary(entries: LibraryEntry[]): { library: MediaLibrary, events: StreamEvent[] } {
  const library: MediaLibrary = {};
  const sessionData: Record<string, { cams: Set<string>, minSeg: number, maxSeg: number }> = {};

  entries.forEach(entry => {
    const normalizedPath = entry.path.replace(/\\/g, '/');
    const pathParts = normalizedPath.split('/');
    const fileName = pathParts[pathParts.length - 1] || '';

    if (!fileName.toLowerCase().endsWith('.mp4')) return;

    // RULE: Do not look within 'segments' subfolder.
    if (pathParts.some(part => part.toLowerCase() === 'segments')) return;

    /**
     * We expect exactly: .../[Session]/[Camera]/[File].mp4
     * We look at the last 3 components of the path.
     */
    if (pathParts.length < 3) return;

    const fileIdx = pathParts.length - 1;
    const filePart = pathParts[fileIdx];
    const camName = pathParts[fileIdx - 1];
    const sessionName = pathParts[fileIdx - 2];

    if (!sessionName || !camName || !filePart) return;

    if (!library[sessionName]) library[sessionName] = { cams: {} };
    if (!library[sessionName].cams[camName]) library[sessionName].cams[camName] = { segments: {} };

    if (!sessionData[sessionName]) {
      sessionData[sessionName] = { cams: new Set(), minSeg: Infinity, maxSeg: -Infinity };
    }
    sessionData[sessionName].cams.add(camName);

    const segId = extractSegmentId(filePart);
    library[sessionName].cams[camName].segments[segId] = entry.source;
    sessionData[sessionName].minSeg = Math.min(sessionData[sessionName].minSeg, segId);
    sessionData[sessionName].maxSeg = Math.max(sessionData[sessionName].maxSeg, segId);
  });

  const events: StreamEvent[] = Object.keys(library).map(sessionId => {
    const meta = sessionData[sessionId];
    return {
      id: sessionId,
      title: `Broadcast: ${sessionId}`,
      thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=400',
      date: `RANGE: ${meta.minSeg} - ${meta.maxSeg}`,
      status: 'ARCHIVE',
      availableCams: Array.from(meta.cams),
      // Custom property to inform App.tsx of the valid start segment for this session
      startSeg: meta.minSeg === Infinity ? 1 : meta.minSeg
    } as any;
  });

  return { library, events };
}

function extractSegmentId(fileName: string): number {
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const parts = baseName.split('_');
  const lastPart = parts[parts.length - 1];

  if (lastPart && /^\d+$/.test(lastPart)) {
    return parseInt(lastPart, 10);
  }

  const segMatch = baseName.match(/(?:^|[_-])seg(\d+)$/i);
  if (segMatch) {
    return parseInt(segMatch[1], 10);
  }

  return 1;
}
