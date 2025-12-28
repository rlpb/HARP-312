export interface PipelineStep {
  id: string;
  key: string;
  category: string;
  name: string;
  status: 'pending' | 'active' | 'complete';
  selectable: boolean; // Whether audio can be selected for this step
  audioKey?: string;   // The audio file key for this step
}

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: 'source', key: 'musicgen', category: 'Source', name: 'Musicgen', status: 'pending', selectable: true, audioKey: 'original' },
  { id: 'filter', key: 'precond', category: 'Filter', name: 'Pre-Cond', status: 'pending', selectable: true, audioKey: 'musicgen_pc' },
  { id: 'transformation', key: 'apollo', category: 'Transformation', name: 'Apollo', status: 'pending', selectable: true, audioKey: 'apollo' },
  { id: 'upscaling', key: 'audiosr', category: 'Upscaling', name: 'AudioSR', status: 'pending', selectable: true, audioKey: 'audiosr' },
  { id: 'profiling', key: 'maest', category: 'Profiling', name: 'MAEST', status: 'pending', selectable: true }, // Uses audiosr audio, but selectable for description
  { id: 'separation', key: 'stereoize', category: 'Separation', name: 'Stereoize', status: 'pending', selectable: true, audioKey: 'premaster' },
  { id: 'final', key: 'master', category: 'Final', name: 'Master', status: 'pending', selectable: true, audioKey: 'master' },
];

// Steps to show in radar legend - now includes musicgen
export const RADAR_LEGEND_STEPS = ['musicgen', 'apollo', 'audiosr', 'stereoize', 'master'];

export interface StepMetrics {
  hiFreqExt: number;
  stereo: number;
  loudness: number;
  hfContrast: number;
}

// Default metric curves for each step (when analysis not available)
export const DEFAULT_METRICS: Record<string, StepMetrics> = {
  musicgen: { hiFreqExt: 0.4, stereo: 0.1, loudness: 0.5, hfContrast: 0.3 },
  precond: { hiFreqExt: 0.45, stereo: 0.15, loudness: 0.55, hfContrast: 0.35 },
  apollo: { hiFreqExt: 0.65, stereo: 0.2, loudness: 0.6, hfContrast: 0.55 },
  audiosr: { hiFreqExt: 0.85, stereo: 0.25, loudness: 0.65, hfContrast: 0.7 },
  maest: { hiFreqExt: 0.85, stereo: 0.3, loudness: 0.7, hfContrast: 0.75 },
  stereoize: { hiFreqExt: 0.85, stereo: 0.85, loudness: 0.75, hfContrast: 0.75 },
  master: { hiFreqExt: 0.9, stereo: 0.9, loudness: 0.9, hfContrast: 0.85 },
};

// Distinct colors for each step - more differentiated
export const STEP_COLORS: Record<string, { hsl: string; rgb: [number, number, number] }> = {
  musicgen: { hsl: 'hsl(210, 100%, 50%)', rgb: [0, 127, 255] },       // Bright Blue
  precond: { hsl: 'hsl(180, 70%, 45%)', rgb: [34, 166, 179] },        // Cyan/Teal
  apollo: { hsl: 'hsl(280, 80%, 55%)', rgb: [156, 39, 176] },         // Purple
  audiosr: { hsl: 'hsl(340, 85%, 55%)', rgb: [233, 30, 99] },         // Pink/Magenta
  maest: { hsl: 'hsl(45, 100%, 50%)', rgb: [255, 193, 7] },           // Gold/Amber
  stereoize: { hsl: 'hsl(140, 70%, 45%)', rgb: [34, 197, 94] },       // Green
  master: { hsl: 'hsl(15, 90%, 55%)', rgb: [255, 87, 51] },           // Orange/Red
};

export function getStepColor(stepKey: string): string {
  return STEP_COLORS[stepKey]?.hsl || 'hsl(220, 10%, 50%)';
}

export function getStepColorRGBA(stepKey: string, alpha: number = 1): string {
  const rgb = STEP_COLORS[stepKey]?.rgb || [100, 100, 100];
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

// Map step key to the audio file key
export function getAudioKeyForStep(stepKey: string): string {
  const step = PIPELINE_STEPS.find(s => s.key === stepKey);
  if (step?.audioKey) return step.audioKey;
  
  // Fallback mappings
  const mapping: Record<string, string> = {
    musicgen: 'original',
    precond: 'musicgen_pc',
    apollo: 'apollo',
    audiosr: 'audiosr',
    maest: 'audiosr', // MAEST uses audiosr audio
    stereoize: 'premaster',
    master: 'master',
  };
  return mapping[stepKey] || 'master';
}

export function parseMetricsFromArtifacts(
  artifacts: any,
  stepKey: string
): StepMetrics | null {
  if (!artifacts) return null;
  
  // Try to extract metrics from radar data
  if (artifacts.radar) {
    // Handle JSON format: { stepName: { metric: value } }
    if (typeof artifacts.radar === 'object' && !Array.isArray(artifacts.radar)) {
      const stepData = artifacts.radar[stepKey];
      if (stepData) {
        return {
          hiFreqExt: stepData.hiFreqExt ?? stepData.hf_ext ?? DEFAULT_METRICS[stepKey].hiFreqExt,
          stereo: stepData.stereo ?? DEFAULT_METRICS[stepKey].stereo,
          loudness: stepData.loudness ?? DEFAULT_METRICS[stepKey].loudness,
          hfContrast: stepData.hfContrast ?? stepData.hf_contrast ?? DEFAULT_METRICS[stepKey].hfContrast,
        };
      }
    }
    
    // Handle array format (CSV-like)
    if (Array.isArray(artifacts.radar)) {
      const row = artifacts.radar.find((r: any) => 
        r.step?.toLowerCase() === stepKey.toLowerCase() ||
        r.name?.toLowerCase() === stepKey.toLowerCase()
      );
      if (row) {
        return {
          hiFreqExt: Number(row.hiFreqExt ?? row.hf_ext ?? row['Hi-Freq Ext']) || DEFAULT_METRICS[stepKey].hiFreqExt,
          stereo: Number(row.stereo ?? row.Stereo) || DEFAULT_METRICS[stepKey].stereo,
          loudness: Number(row.loudness ?? row.Loudness) || DEFAULT_METRICS[stepKey].loudness,
          hfContrast: Number(row.hfContrast ?? row.hf_contrast ?? row['HF Contrast']) || DEFAULT_METRICS[stepKey].hfContrast,
        };
      }
    }
  }
  
  return null;
}
