export interface AudioState {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  source: MediaElementAudioSourceNode | null;
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export function createAudioContext(): AudioContext {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
}

export function setupAudioAnalyser(
  audioContext: AudioContext,
  audioElement: HTMLAudioElement
): { analyser: AnalyserNode; source: MediaElementAudioSourceNode; gainNode: GainNode } {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 1;
  
  const source = audioContext.createMediaElementSource(audioElement);
  // Route: source -> analyser -> gainNode -> destination
  // This way analyser always gets data, but gainNode controls volume
  source.connect(analyser);
  analyser.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  return { analyser, source, gainNode };
}

export function getFrequencyData(analyser: AnalyserNode): Uint8Array {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);
  return dataArray;
}

export function decodeAudioData(
  audioContext: AudioContext,
  arrayBuffer: ArrayBuffer
): Promise<AudioBuffer> {
  return audioContext.decodeAudioData(arrayBuffer);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function generateIdleWaveformData(barCount: number, frame: number): number[] {
  const data: number[] = [];
  for (let i = 0; i < barCount; i++) {
    // Create smooth wave-like idle animation
    const phase = (frame * 0.02 + i * 0.3) % (Math.PI * 2);
    const amplitude = 0.3 + Math.sin(phase) * 0.2;
    data.push(amplitude);
  }
  return data;
}

export function normalizeFrequencyData(data: Uint8Array, barCount: number): number[] {
  const normalized: number[] = [];
  const step = Math.floor(data.length / barCount);
  
  for (let i = 0; i < barCount; i++) {
    let sum = 0;
    for (let j = 0; j < step; j++) {
      sum += data[i * step + j];
    }
    // Normalize to 0-1 range with some boost
    normalized.push(Math.min(1, (sum / step / 255) * 1.5));
  }
  
  return normalized;
}
