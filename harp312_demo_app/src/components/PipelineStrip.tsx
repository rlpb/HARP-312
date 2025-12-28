import React from 'react';
import { Language, t } from '@/lib/i18n';
import { PipelineStep, getStepColor, getStepColorRGBA } from '@/lib/pipeline';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PipelineStripProps {
  language: Language;
  steps: PipelineStep[];
  currentStepIndex: number;
  onStepClick: (stepKey: string, index: number) => void;
  completedSteps: Set<string>;
  isSimulating?: boolean;
  songId?: string;
  simulatingStepIndex?: number;
}

const CATEGORY_LABELS: Record<string, Record<Language, string>> = {
  Source: { en: 'Source', it: 'Sorgente' },
  Filter: { en: 'Filter', it: 'Filtro' },
  Transformation: { en: 'Restore', it: 'Restauro' },
  Upscaling: { en: 'Upscale', it: 'Potenzia' },
  Profiling: { en: 'Profile', it: 'Analisi' },
  Separation: { en: 'Separate', it: 'Separa' },
  Final: { en: 'Final', it: 'Finale' },
};

function getStepFilename(stepKey: string, songIndex: number): string | null {
  const idx = songIndex + 1;
  // maest is profiling step - no audio file
  if (stepKey === 'maest') return null;
  const filenames: Record<string, string> = {
    musicgen: `original_${idx}.wav`,
    precond: `musicgen_pc_${idx}.wav`,
    apollo: `apollo_${idx}.wav`,
    audiosr: `audiosr_${idx}.wav`,
    stereoize: `premaster_${idx}.wav`,
    master: `master_${idx}.wav`,
  };
  return filenames[stepKey] || null;
}

export function PipelineStrip({
  language,
  steps,
  currentStepIndex,
  onStepClick,
  completedSteps,
  isSimulating = false,
  songId,
  simulatingStepIndex,
}: PipelineStripProps) {
  const songIndex = songId ? parseInt(songId.split('_')[0]) - 1 || 0 : 0;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-card/90 backdrop-blur-sm border-t border-border/50 py-2 sm:py-5 px-2 sm:px-6 flex-shrink-0">
        {/* Hint text - hidden on mobile */}
        <p className="hidden sm:block text-center text-[10px] text-muted-foreground mb-2">
          {t(language, 'pipelineHint')}
        </p>
        <div className="flex items-center gap-1 sm:gap-3 overflow-x-auto justify-start sm:justify-center scrollbar-hide py-0.5 sm:py-1 px-1">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isComplete = completedSteps.has(step.key);
            const isProcessing = isSimulating && simulatingStepIndex === index;
            const canClick = step.selectable && (completedSteps.has(step.key) || index <= currentStepIndex);
            const filename = getStepFilename(step.key, songIndex);
            const stepColor = getStepColor(step.key);

            return (
              <React.Fragment key={step.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => canClick && onStepClick(step.key, index)}
                      disabled={!canClick}
                      className={cn(
                        'relative flex flex-col items-center px-1 sm:px-2 py-1 sm:py-2 rounded-lg sm:rounded-xl text-xs transition-all duration-200 w-[52px] sm:w-[80px] flex-shrink-0',
                        canClick && 'cursor-pointer hover:scale-105',
                        !canClick && 'opacity-40 cursor-not-allowed'
                      )}
                      style={{
                        backgroundColor: isActive 
                          ? getStepColorRGBA(step.key, 0.15) 
                          : isComplete 
                            ? getStepColorRGBA(step.key, 0.08) 
                            : 'hsl(var(--muted) / 0.3)',
                        borderWidth: '2px',
                        borderStyle: 'solid',
                        borderColor: isActive 
                          ? stepColor 
                          : isComplete 
                            ? getStepColorRGBA(step.key, 0.4) 
                            : 'transparent',
                        boxShadow: isActive ? `0 0 12px ${getStepColorRGBA(step.key, 0.3)}` : 'none',
                      }}
                    >
                      {/* Processing animation */}
                      {isProcessing && (
                        <>
                          <div 
                            className="absolute inset-0 rounded-xl animate-pulse"
                            style={{ backgroundColor: getStepColorRGBA(step.key, 0.2) }}
                          />
                          <div className="absolute -top-1 -right-1 w-3 h-3">
                            <span 
                              className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                              style={{ backgroundColor: stepColor }}
                            />
                            <span 
                              className="relative inline-flex rounded-full h-3 w-3"
                              style={{ backgroundColor: stepColor }}
                            />
                          </div>
                        </>
                      )}
                      
                      <span 
                        className="text-[8px] sm:text-[9px] uppercase tracking-wider font-medium mb-0.5 truncate max-w-full"
                        style={{ color: isActive || isComplete ? stepColor : 'hsl(var(--muted-foreground))' }}
                      >
                        {CATEGORY_LABELS[step.category]?.[language] || step.category}
                      </span>
                      <span 
                        className="font-bold text-center leading-tight truncate max-w-full text-[0.6rem] sm:text-[0.7rem]"
                        style={{ 
                          color: isActive ? stepColor : isComplete ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                        }}
                      >
                        {step.name}
                      </span>
                    </button>
                  </TooltipTrigger>
                  {filename && (
                    <TooltipContent side="top" className="font-mono text-xs bg-popover border border-border shadow-lg z-[60]">
                      <p className="font-semibold" style={{ color: stepColor }}>{step.name}</p>
                      <p className="text-muted-foreground text-[10px]">{filename}</p>
                    </TooltipContent>
                  )}
                </Tooltip>

                {index < steps.length - 1 && (
                  <div className={cn(
                    "flex-shrink-0 transition-colors duration-200",
                    (isComplete || isActive) ? "opacity-70" : "opacity-20"
                  )}>
                    <svg 
                      className="w-4 h-4" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke={isComplete || isActive ? stepColor : 'currentColor'} 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
