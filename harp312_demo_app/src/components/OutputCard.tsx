import React from 'react';
import { Language, t } from '@/lib/i18n';
import { WaveformCanvas } from './WaveformCanvas';
import { getStepColor, getAudioKeyForStep } from '@/lib/pipeline';
import { getStepDescription, getStepOutputSpecs } from '@/lib/step-descriptions';

interface OutputCardProps {
  language: Language;
  isPending: boolean;
  currentStepKey: string;
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  isProcessedMode: boolean;
  isSimulating?: boolean;
}

export function OutputCard({
  language,
  isPending,
  currentStepKey,
  analyser,
  isPlaying,
  isProcessedMode,
  isSimulating = false,
}: OutputCardProps) {
  const formatSampleRate = (rate: number) => {
    if (rate >= 1000) {
      return `${Math.round(rate / 1000)} kHz`;
    }
    return `${rate} Hz`;
  };

  // Get display step key - MAEST uses AudioSR audio, so show AudioSR styling
  const displayStepKey = currentStepKey === 'maest' ? 'audiosr' : currentStepKey;
  
  // Get dynamic specs based on step
  const outputSpecs = getStepOutputSpecs(currentStepKey);
  const displayStepDesc = getStepDescription(displayStepKey, language);
  const stepColor = getStepColor(displayStepKey);

  // Don't show waveform for musicgen (source step)
  const isSourceStep = currentStepKey === 'musicgen';
  const showWaveform = !isPending && !isSourceStep;

  // Style for active/inactive waveform
  const isActive = isPlaying && isProcessedMode;
  const isInactive = isPlaying && !isProcessedMode;

  return (
    <div className="neumorphic p-4 flex flex-col gap-3 h-full transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className={`w-2 h-2 rounded-full ${isPending ? 'bg-muted-foreground animate-pulse' : ''}`}
            style={{ backgroundColor: !isPending ? stepColor : undefined }}
          />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t(language, 'outputPreview')}
          </h3>
        </div>
        {!isPending && (
          <span 
            className="text-xs font-bold"
            style={{ color: stepColor }}
          >
            {displayStepDesc.label}
          </span>
        )}
      </div>

      {/* Output Preview */}
      {isPending ? (
        !isSimulating && currentStepKey === 'musicgen' ? (
          // Initial state - prompt to select a track
          <div className="flex-1 flex flex-col items-center justify-center min-h-[60px] border border-dashed border-muted rounded-lg p-3">
            <svg className="w-8 h-8 text-muted-foreground mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
            <span className="text-xs text-muted-foreground text-center">
              {language === 'it' ? 'Seleziona una traccia sopra per iniziare' : 'Select a track from above to start'}
            </span>
          </div>
        ) : (
          // Processing state with spinner
          <div 
            className="flex-1 flex flex-col items-center justify-center min-h-[60px] border border-dashed rounded-lg p-3 transition-all duration-500"
            style={{ borderColor: stepColor }}
          >
            {/* Animated loading spinner with step color */}
            <svg 
              className="w-10 h-10 mb-2 animate-spin" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke={stepColor} 
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            <span 
              className="text-sm font-semibold text-center animate-pulse"
              style={{ color: stepColor }}
            >
              {displayStepDesc.label}
            </span>
            <span className="text-xs text-muted-foreground text-center mt-1">
              {language === 'it' ? 'Elaborazione in corso...' : 'Processing...'}
            </span>
          </div>
        )
      ) : isSourceStep ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60px] border border-dashed border-muted rounded-lg p-3">
          <span className="text-xs text-muted-foreground text-center">
            {language === 'it' ? 'Sorgente originale - nessuna elaborazione' : 'Original source - no processing'}
          </span>
        </div>
      ) : (
        <>
          {/* Waveform - Always shows processed audio visualization */}
          <div 
            className="waveform-container p-2 flex-1 min-h-[60px] transition-all duration-300 rounded-lg"
            style={{
              boxShadow: isActive ? `0 0 0 2px ${stepColor}, 0 4px 20px ${stepColor}40` : 'none',
              opacity: isInactive ? 0.7 : 1,
              filter: isInactive ? 'saturate(0.7)' : 'none',
            }}
          >
            <WaveformCanvas
              analyser={analyser}
              isPlaying={isPlaying}
              barCount={20}
              stepKey={displayStepKey}
            />
          </div>

          {/* Output Metadata - Dynamic based on step */}
          <div className="flex gap-2 flex-wrap text-xs">
            <div 
              className="px-2 py-0.5 rounded-md font-mono font-medium"
              style={{ 
                backgroundColor: `${stepColor}20`,
                color: stepColor 
              }}
            >
              {formatSampleRate(outputSpecs.sampleRate)}
            </div>
            <div 
              className="px-2 py-0.5 rounded-md font-mono font-medium"
              style={{ 
                backgroundColor: `${stepColor}20`,
                color: stepColor 
              }}
            >
              {outputSpecs.channels === 2 ? t(language, 'stereo') : t(language, 'mono')}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
