// Heatmap data types and utilities
import heatmapsData from '@/data/heatmaps.json';

export interface HeatmapRow {
  hi_freq_ext: number;
  stereo_ms_width: number;
  hf_contrast: number;
  loudness_lufs: number;
  overall: number;
}

export interface HeatmapEntry {
  id: number;
  source_image: string;
  matrix_row_major: number[][];
  by_row: {
    musicgen_idea: HeatmapRow;
    apollo_clean: HeatmapRow;
    audiosr_hifi: HeatmapRow;
    master_final: HeatmapRow;
  };
}

export interface HeatmapsSchema {
  schema_version: string;
  units: { index_range: string };
  columns: Array<{ key: string; label: string }>;
  rows: Array<{ key: string; label: string }>;
  heatmaps: HeatmapEntry[];
}

// Type assertion for imported JSON
export const heatmaps = heatmapsData as HeatmapsSchema;

// Map heatmap row keys to pipeline step keys
const ROW_TO_STEP: Record<string, string> = {
  musicgen_idea: 'musicgen',
  apollo_clean: 'apollo',
  audiosr_hifi: 'audiosr',
  master_final: 'master',
};

// Get metrics for a specific song index (0-5 maps to heatmap 1-6)
export function getHeatmapMetrics(songIndex: number, stepKey: string): {
  hiFreqExt: number;
  stereo: number;
  loudness: number;
  hfContrast: number;
} | null {
  const heatmap = heatmaps.heatmaps[songIndex];
  if (!heatmap) return null;

  // Find which row corresponds to this step
  const rowKey = Object.entries(ROW_TO_STEP).find(([_, v]) => v === stepKey)?.[0] as keyof HeatmapEntry['by_row'];
  if (!rowKey || !heatmap.by_row[rowKey]) return null;

  const row = heatmap.by_row[rowKey];
  
  // Normalize values from 0-100 to 0-1
  return {
    hiFreqExt: row.hi_freq_ext / 100,
    stereo: row.stereo_ms_width / 100,
    loudness: row.loudness_lufs / 100,
    hfContrast: row.hf_contrast / 100,
  };
}

// Get all step metrics for a song
export function getAllHeatmapMetrics(songIndex: number): Record<string, {
  hiFreqExt: number;
  stereo: number;
  loudness: number;
  hfContrast: number;
}> {
  const result: Record<string, any> = {};
  
  for (const [rowKey, stepKey] of Object.entries(ROW_TO_STEP)) {
    const metrics = getHeatmapMetrics(songIndex, stepKey);
    if (metrics) {
      result[stepKey] = metrics;
    }
  }
  
  // Add interpolated values for steps not in the heatmap
  // Pre-cond is between musicgen and apollo
  if (result.musicgen && result.apollo) {
    result.precond = {
      hiFreqExt: (result.musicgen.hiFreqExt + result.apollo.hiFreqExt) / 2,
      stereo: (result.musicgen.stereo + result.apollo.stereo) / 2,
      loudness: (result.musicgen.loudness + result.apollo.loudness) / 2,
      hfContrast: (result.musicgen.hfContrast + result.apollo.hfContrast) / 2,
    };
  }
  
  // MAEST is similar to audiosr (profiling step)
  if (result.audiosr) {
    result.maest = { ...result.audiosr };
  }
  
  // Stereoize is between audiosr and master
  if (result.audiosr && result.master) {
    result.stereoize = {
      hiFreqExt: result.audiosr.hiFreqExt,
      stereo: result.master.stereo, // Stereoize adds the stereo width
      loudness: (result.audiosr.loudness + result.master.loudness) / 2,
      hfContrast: result.audiosr.hfContrast,
    };
  }
  
  return result;
}

// Get number of available heatmaps (songs)
export function getHeatmapCount(): number {
  return heatmaps.heatmaps.length;
}
