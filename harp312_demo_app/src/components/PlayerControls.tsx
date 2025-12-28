import React from 'react';
import { formatTime } from '@/lib/audio-utils';
import { Language, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { getStepColor, getStepColorRGBA } from '@/lib/pipeline';

interface PlayerControlsProps {
  language: Language;
  isOriginal: boolean;
  onToggleMode: (isOriginal: boolean) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
  currentTime: number;
  duration: number;
  isLooping: boolean;
  onToggleLoop: () => void;
  disabled: boolean;
  currentStepKey?: string;
}

export function PlayerControls({
  language,
  isOriginal,
  onToggleMode,
  isPlaying,
  onPlayPause,
  onSeek,
  onSkip,
  currentTime,
  duration,
  isLooping,
  onToggleLoop,
  disabled,
  currentStepKey = 'musicgen',
}: PlayerControlsProps) {
  // For MAEST (profiling), use audiosr's color since it doesn't change the audio
  const displayStepKey = currentStepKey === 'maest' ? 'audiosr' : currentStepKey;
  
  const musicgenColor = getStepColor('musicgen');
  const stepColor = getStepColor(displayStepKey);
  const activeColor = isOriginal ? musicgenColor : stepColor;
  
  return (
    <div className="flex flex-col gap-2 sm:gap-3 p-3 sm:p-4">
      {/* Mode Toggle - Responsive */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl p-1 bg-muted/20 backdrop-blur-sm border border-border/20">
          <button
            onClick={() => onToggleMode(true)}
            className={cn(
              'w-[80px] sm:w-[100px] py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200',
              isOriginal 
                ? 'text-white' 
                : 'text-muted-foreground hover:text-foreground'
            )}
            style={isOriginal ? { 
              background: `linear-gradient(135deg, ${getStepColorRGBA('musicgen', 0.85)}, ${getStepColorRGBA('musicgen', 0.65)})`,
              boxShadow: `0 2px 8px ${getStepColorRGBA('musicgen', 0.25)}`
            } : {}}
            disabled={disabled}
          >
            {t(language, 'originalToggle')}
          </button>
          <button
            onClick={() => onToggleMode(false)}
            className={cn(
              'w-[80px] sm:w-[100px] py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200',
              !isOriginal 
                ? 'text-white' 
                : 'text-muted-foreground hover:text-foreground'
            )}
            style={!isOriginal ? { 
              background: `linear-gradient(135deg, ${getStepColorRGBA(displayStepKey, 0.85)}, ${getStepColorRGBA(displayStepKey, 0.65)})`,
              boxShadow: `0 2px 8px ${getStepColorRGBA(displayStepKey, 0.25)}`
            } : {}}
            disabled={disabled}
          >
            {t(language, 'processedToggle')}
          </button>
        </div>
      </div>

      {/* Timeline - Responsive */}
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="font-mono text-[10px] sm:text-xs text-muted-foreground w-8 sm:w-10 text-right">
          {formatTime(currentTime)}
        </span>
        <div className="flex-1 relative h-2 bg-muted/30 rounded-full overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-100"
            style={{ 
              width: `${duration ? (currentTime / duration) * 100 : 0}%`,
              background: `linear-gradient(90deg, ${activeColor}, ${getStepColorRGBA(isOriginal ? 'musicgen' : displayStepKey, 0.7)})`
            }}
          />
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
            disabled={disabled}
          />
        </div>
        <span className="font-mono text-[10px] sm:text-xs text-muted-foreground w-8 sm:w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* Playback Controls - Responsive */}
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        {/* Skip Back */}
        <button
          onClick={() => onSkip(-10)}
          disabled={disabled}
          className="p-2 sm:p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
          aria-label="Skip back 10 seconds"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 17L6 12l5-5"/>
            <path d="M18 17l-5-5 5-5"/>
          </svg>
        </button>

        {/* Play/Pause - Responsive */}
        <button
          onClick={onPlayPause}
          disabled={disabled}
          className="p-3 sm:p-4 rounded-full transition-all duration-200 disabled:opacity-50"
          style={{
            background: isPlaying 
              ? `linear-gradient(135deg, ${getStepColorRGBA(isOriginal ? 'musicgen' : displayStepKey, 0.12)}, ${getStepColorRGBA(isOriginal ? 'musicgen' : displayStepKey, 0.08)})`
              : `linear-gradient(135deg, ${getStepColorRGBA(isOriginal ? 'musicgen' : displayStepKey, 0.8)}, ${getStepColorRGBA(isOriginal ? 'musicgen' : displayStepKey, 0.6)})`,
            color: isPlaying ? activeColor : 'white',
            boxShadow: isPlaying ? 'none' : `0 3px 12px ${getStepColorRGBA(isOriginal ? 'musicgen' : displayStepKey, 0.3)}`
          }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86a1 1 0 00-1.5.86z"/>
            </svg>
          )}
        </button>

        {/* Loop Toggle */}
        <button
          onClick={onToggleLoop}
          disabled={disabled}
          className={cn(
            "p-2 sm:p-2.5 rounded-xl transition-all disabled:opacity-50",
            isLooping 
              ? "" 
              : "bg-muted/20 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
          )}
          style={isLooping ? {
            background: `linear-gradient(135deg, ${getStepColorRGBA(isOriginal ? 'musicgen' : displayStepKey, 0.15)}, ${getStepColorRGBA(isOriginal ? 'musicgen' : displayStepKey, 0.08)})`,
            color: activeColor
          } : {}}
          aria-label={isLooping ? 'Disable loop' : 'Enable loop'}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 2l4 4-4 4"/>
            <path d="M3 11v-1a4 4 0 014-4h14"/>
            <path d="M7 22l-4-4 4-4"/>
            <path d="M21 13v1a4 4 0 01-4 4H3"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
