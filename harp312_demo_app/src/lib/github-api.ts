const REPO_OWNER = 'rlpb';
const REPO_NAME = 'HARP-312';
const API_BASE = 'https://api.github.com';
const RAW_BASE = 'https://raw.githubusercontent.com';

// Lightweight API availability check
export async function checkApiAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/rate_limit`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!response.ok) return false;
    const data = await response.json();
    // Check if we have remaining requests for the core API
    return data?.resources?.core?.remaining > 0;
  } catch {
    return false;
  }
}

export interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
  size?: number;
}

export interface Song {
  id: string;
  name: string;
  displayName: string;
  files: SongFiles;
  sampleRate: number;
  channels: number;
}

export interface SongFiles {
  original?: GitHubFile;
  musicgen_pc?: GitHubFile;  // precond output
  apollo?: GitHubFile;
  audiosr?: GitHubFile;
  premaster?: GitHubFile;    // stereoize output
  master?: GitHubFile;
}

export interface AnalysisArtifacts {
  radar?: any;
  heatmap?: any;
}

// Fallback song list when GitHub API is rate-limited
const FALLBACK_SONGS: { id: string; displayName: string }[] = [
  { id: '1 Lo-Fi Study Beat', displayName: 'Lo – Fi Study Beat' },
  { id: '2 Acoustic Folk Ballad', displayName: 'Acoustic Folk Ballad' },
  { id: '3 Calssic Rock Anthem', displayName: 'Classic Rock Anthem' },
  { id: '4 House Music Groove', displayName: 'House Music Groove' },
  { id: '5 Epic Orchestral Score', displayName: 'Epic Orchestral Score' },
  { id: '6 90s Boom Bap Hip Hop', displayName: '90s Boom Bap Hip Hop' },
];

// Standard file names expected in each song folder
const STANDARD_FILES = [
  { key: 'original', name: '01_original_musicgen_32khz.wav' },
  { key: 'musicgen_pc', name: '02_musicgen_pc_32khz.wav' },
  { key: 'apollo', name: '03_apollo_44khz.wav' },
  { key: 'audiosr', name: '04_audiosr_48khz.wav' },
  { key: 'premaster', name: '05_premaster_48khz.wav' },
  { key: 'master', name: '06_master_48khz.wav' },
];

// Build songs from fallback list with direct raw URLs
function buildFallbackSongs(): Song[] {
  return FALLBACK_SONGS.map(({ id, displayName }) => {
    const files: SongFiles = {};
    const encodedId = encodeURIComponent(id);
    
    for (const { key, name } of STANDARD_FILES) {
      const encodedName = encodeURIComponent(name);
      files[key as keyof SongFiles] = {
        name,
        path: `samples/${id}/${name}`,
        type: 'file',
        download_url: `${RAW_BASE}/${REPO_OWNER}/${REPO_NAME}/main/samples/${encodedId}/${encodedName}`,
      };
    }
    
    return {
      id,
      name: id,
      displayName,
      files,
      sampleRate: 32000,
      channels: 1,
    };
  });
}

const AUDIO_EXTENSIONS = ['.wav', '.mp3', '.flac', '.ogg', '.m4a'];

function isAudioFile(name: string): boolean {
  return AUDIO_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));
}

function categorizeFile(name: string): keyof SongFiles | null {
  const lower = name.toLowerCase();
  
  // Order matters - more specific matches first
  if (lower.includes('master') && !lower.includes('premaster')) return 'master';
  if (lower.includes('premaster') || lower.includes('stereoize') || lower.includes('stereo_')) return 'premaster';
  if (lower.includes('audiosr') || lower.includes('audio_sr')) return 'audiosr';
  if (lower.includes('apollo')) return 'apollo';
  if (lower.includes('musicgen_pc') || lower.includes('precond') || lower.includes('pre-cond') || lower.includes('pre_cond')) return 'musicgen_pc';
  if (lower.includes('original') || lower.includes('input') || lower.includes('musicgen')) return 'original';
  
  return null;
}

function extractSampleRateFromName(name: string): number {
  // Try to extract sample rate from filename like "32khz" or "44100hz"
  const khzMatch = name.match(/(\d+)\s*khz/i);
  if (khzMatch) return parseInt(khzMatch[1]) * 1000;
  
  const hzMatch = name.match(/(\d{4,5})\s*hz/i);
  if (hzMatch) return parseInt(hzMatch[1]);
  
  return 32000; // Default
}

function extractChannelsFromName(name: string): number {
  const lower = name.toLowerCase();
  if (lower.includes('stereo')) return 2;
  if (lower.includes('mono')) return 1;
  return 1; // Default to mono
}

export async function fetchDirectoryContents(path: string): Promise<GitHubFile[]> {
  try {
    const response = await fetch(`${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch ${path}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error fetching ${path}:`, error);
    return [];
  }
}

export interface DiscoverSongsResult {
  songs: Song[];
  isFromFallback: boolean;
}

export async function discoverSongs(): Promise<DiscoverSongsResult> {
  const songs: Song[] = [];
  
  // List samples directory
  const response = await fetch(`${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/samples`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
    },
  });
  
  // Check for rate limit or other errors - use fallback list
  if (!response.ok) {
    if (response.status === 403) {
      console.log('[Songs] GitHub rate limited, using fallback song list');
      return { songs: buildFallbackSongs(), isFromFallback: true };
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }
  
  const samplesContents = await response.json();
  if (!Array.isArray(samplesContents)) return { songs: [], isFromFallback: false };
  
  // Find song directories
  const songDirs = samplesContents.filter((item: any) => item.type === 'dir');
  
  for (const dir of songDirs) {
    // List files in each song directory
    const songFiles = await fetchDirectoryContents(dir.path);
    const audioFiles = songFiles.filter(f => f.type === 'file' && isAudioFile(f.name));
    
    if (audioFiles.length === 0) continue;
    
    const files: SongFiles = {};
    let hasOriginal = false;
    
    // Categorize audio files
    for (const file of audioFiles) {
      const category = categorizeFile(file.name);
      if (category) {
        files[category] = file;
        if (category === 'original') hasOriginal = true;
      }
    }
    
    // If no original found, use first audio file
    if (!hasOriginal && audioFiles.length > 0) {
      files.original = audioFiles[0];
    }
    
    // Extract display name (format: "Lo-Fi Beats – Midnight")
    const displayName = dir.name
      .replace(/_/g, ' ')
      .replace(/-/g, ' – ')
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    songs.push({
      id: dir.name,
      name: dir.name,
      displayName,
      files,
      sampleRate: extractSampleRateFromName(dir.name),
      channels: extractChannelsFromName(dir.name),
    });
  }
  
  // Sort consistently by ID
  return { songs: songs.sort((a, b) => a.id.localeCompare(b.id)), isFromFallback: false };
}

// Reconstruct songs from cached URLs
export function reconstructSongsFromCache(cachedUrls: string[]): Song[] {
  // Extract unique song IDs from URLs
  // URLs look like: https://raw.githubusercontent.com/.../samples/song_name/file.wav
  const songMap = new Map<string, SongFiles>();
  
  for (const url of cachedUrls) {
    const match = url.match(/\/samples\/([^/]+)\/([^/]+)$/);
    if (!match) continue;
    
    // Decode URL-encoded characters
    const songId = decodeURIComponent(match[1]);
    const filename = decodeURIComponent(match[2]);
    
    if (!songMap.has(songId)) {
      songMap.set(songId, {});
    }
    
    const files = songMap.get(songId)!;
    const category = categorizeFile(filename);
    
    if (category && isAudioFile(filename)) {
      files[category] = {
        name: filename,
        path: `samples/${songId}/${filename}`,
        type: 'file',
        download_url: url,
      };
    }
  }
  
  // Convert to Song array
  const songs: Song[] = [];
  
  for (const [songId, files] of songMap) {
    // Need at least the original file
    if (!files.original && !files.master) continue;
    
    const displayName = songId
      .replace(/_/g, ' ')
      .replace(/-/g, ' – ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    songs.push({
      id: songId,
      name: songId,
      displayName,
      files,
      sampleRate: extractSampleRateFromName(songId),
      channels: extractChannelsFromName(songId),
    });
  }
  
  return songs.sort((a, b) => a.id.localeCompare(b.id));
}

export async function fetchAnalysisArtifacts(songId: string): Promise<AnalysisArtifacts> {
  const artifacts: AnalysisArtifacts = {};
  
  // Try both naming conventions
  const analysisPaths = [
    `samples/${songId}/general analysis`,
    `samples/${songId}/general_analysis`,
    `samples/${songId}/analysis`,
  ];
  
  for (const path of analysisPaths) {
    const contents = await fetchDirectoryContents(path);
    if (contents.length === 0) continue;
    
    for (const file of contents) {
      const lower = file.name.toLowerCase();
      
      if (lower.includes('radar') && file.download_url) {
        try {
          const response = await fetch(file.download_url);
          const text = await response.text();
          artifacts.radar = parseAnalysisFile(text, file.name);
        } catch (e) {
          console.warn('Failed to parse radar data:', e);
        }
      }
      
      if (lower.includes('heatmap') && file.download_url) {
        try {
          const response = await fetch(file.download_url);
          const text = await response.text();
          artifacts.heatmap = parseAnalysisFile(text, file.name);
        } catch (e) {
          console.warn('Failed to parse heatmap data:', e);
        }
      }
    }
    
    if (artifacts.radar || artifacts.heatmap) break;
  }
  
  return artifacts;
}

function parseAnalysisFile(content: string, filename: string): any {
  // Try JSON first
  try {
    return JSON.parse(content);
  } catch {
    // Try CSV
    if (filename.endsWith('.csv')) {
      return parseCSV(content);
    }
  }
  return null;
}

function parseCSV(content: string): any {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return null;
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row: Record<string, string | number> = {};
    headers.forEach((h, i) => {
      const val = values[i];
      row[h] = isNaN(Number(val)) ? val : Number(val);
    });
    return row;
  });
  
  return rows;
}

export async function fetchAudioFile(file: GitHubFile): Promise<ArrayBuffer | null> {
  if (!file.download_url) return null;
  
  try {
    const response = await fetch(file.download_url);
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch (error) {
    console.error('Error fetching audio:', error);
    return null;
  }
}

export function getRepoUrl(): string {
  return `https://github.com/${REPO_OWNER}/${REPO_NAME}`;
}

export function getReadmeUrl(): string {
  return `https://github.com/${REPO_OWNER}/${REPO_NAME}#readme`;
}
