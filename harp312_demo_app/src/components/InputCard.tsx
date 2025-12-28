import React from 'react';
import { Language, t } from '@/lib/i18n';
import { WaveformCanvas } from './WaveformCanvas';
import { getStepColor } from '@/lib/pipeline';

interface InputCardProps {
  language: Language;
  songName: string;
  sampleRate: number;
  channels: number;
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  isOriginalMode: boolean;
}

export function InputCard({
  language,
  songName,
  sampleRate,
  channels,
  analyser,
  isPlaying,
  isOriginalMode,
}: InputCardProps) {
  const formatSampleRate = (rate: number) => {
    if (rate >= 1000) {
      return `${Math.round(rate / 1000)} kHz`;
    }
    return `${rate} Hz`;
  };

  const channelLabel = channels === 2 ? t(language, 'stereo') : t(language, 'mono');
  const musicgenColor = getStepColor('musicgen');
  // Style for active/inactive waveform
  const isActive = isPlaying && isOriginalMode;
  const isInactive = isPlaying && !isOriginalMode;

  return (
    <div className="neumorphic p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 h-full transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: musicgenColor }}
          />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t(language, 'inputSource')}
          </h3>
        </div>
        <span 
          className="text-xs font-bold"
          style={{ color: musicgenColor }}
        >
          MusicGen
        </span>
      </div>

      {/* Waveform - Always shows original audio visualization */}
      <div 
        className="waveform-container p-2 flex-1 min-h-[50px] transition-all duration-300 rounded-lg"
        style={{
          boxShadow: isActive ? `0 0 0 2px ${musicgenColor}, 0 4px 20px ${musicgenColor}40` : 'none',
          opacity: isInactive ? 0.7 : 1,
          filter: isInactive ? 'saturate(0.7)' : 'none',
        }}
      >
        <WaveformCanvas
          analyser={analyser}
          isPlaying={isPlaying}
          barCount={20}
          stepKey="musicgen"
        />
      </div>

      {/* Metadata */}
      <div className="flex gap-2 flex-wrap text-xs">
        <div className="badge-info">
          {formatSampleRate(sampleRate)}
        </div>
        <div className="badge-info">
          {channelLabel}
        </div>
      </div>
    </div>
  );
}
