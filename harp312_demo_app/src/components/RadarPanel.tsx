import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { Language, t } from '@/lib/i18n';
import { StepMetrics, RADAR_LEGEND_STEPS, PIPELINE_STEPS, getStepColorRGBA, DEFAULT_METRICS } from '@/lib/pipeline';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface RadarPanelProps {
  language: Language;
  currentStep: string;
  currentStepIndex: number;
  stepMetrics: Record<string, StepMetrics>;
  visibleSteps: Set<string>;
  onToggleStep: (step: string) => void;
  completedSteps: Set<string>;
  isSimulating: boolean;
  hasSongSelected: boolean;
}

const STEP_LABELS: Record<string, Record<Language, string>> = {
  musicgen: { en: 'Musicgen', it: 'Musicgen' },
  apollo: { en: 'Apollo', it: 'Apollo' },
  audiosr: { en: 'AudioSR', it: 'AudioSR' },
  stereoize: { en: 'Stereoize', it: 'Stereoize' },
  master: { en: 'Master', it: 'Master' },
};

// Metric descriptions for tooltips
const METRIC_DESCRIPTIONS: Record<string, Record<Language, { title: string; desc: string }>> = {
  'HF Ext': {
    en: {
      title: 'Hi-Freq Extension',
      desc: 'Energy ratio above 16 kHz vs main band (20 Hz–16 kHz). Higher = more HF extension.'
    },
    it: {
      title: 'Estensione Alta Freq.',
      desc: 'Rapporto energia sopra 16 kHz vs banda principale. Più alto = maggiore estensione.'
    }
  },
  'Stereo': {
    en: {
      title: 'Stereo Width',
      desc: 'M/S width ratio (Mid vs Side). Higher = wider stereo image.'
    },
    it: {
      title: 'Ampiezza Stereo',
      desc: 'Rapporto M/S (Mid vs Side). Più alto = immagine stereo più ampia.'
    }
  },
  'Loud': {
    en: {
      title: 'Loudness (LUFS)',
      desc: 'Integrated loudness (EBU R128). Perceived volume level.'
    },
    it: {
      title: 'Volume (LUFS)',
      desc: 'Loudness integrato (EBU R128). Livello di volume percepito.'
    }
  },
  'HF Con': {
    en: {
      title: 'HF Contrast',
      desc: 'High-frequency "air" vs quiet HF residue. Higher = more clarity without hiss.'
    },
    it: {
      title: 'Contrasto HF',
      desc: '"Aria" HF vs residuo nei momenti quieti. Più alto = maggiore chiarezza.'
    }
  }
};

export function RadarPanel({
  language,
  currentStep,
  currentStepIndex,
  stepMetrics,
  visibleSteps = new Set(RADAR_LEGEND_STEPS),
  onToggleStep,
  completedSteps = new Set(),
  isSimulating,
  hasSongSelected,
}: RadarPanelProps) {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Fixed labels
  const labels = ['HF Ext', 'Stereo', 'Loud', 'HF Con'];

  const getStepIndex = (stepKey: string): number => {
    return PIPELINE_STEPS.findIndex(s => s.key === stepKey);
  };

  const stableMetrics = useMemo(() => {
    const result: Record<string, StepMetrics> = {};
    for (const step of RADAR_LEGEND_STEPS) {
      result[step] = stepMetrics[step] || DEFAULT_METRICS[step];
    }
    return result;
  }, [stepMetrics]);

  const datasets = useMemo(() => {
    if (!hasSongSelected) return [];

    const currentIdx = currentStepIndex;
    
    return RADAR_LEGEND_STEPS
      .filter(step => {
        if (!visibleSteps.has(step)) return false;
        const stepIdx = getStepIndex(step);
        return stepIdx <= currentIdx;
      })
      .map(stepKey => {
        const metrics = stableMetrics[stepKey];
        const stepIdx = getStepIndex(stepKey);
        const isActive = stepIdx === currentStepIndex;
        
        return {
          label: STEP_LABELS[stepKey]?.[language] || stepKey,
          data: [metrics.hiFreqExt, metrics.stereo, metrics.loudness, metrics.hfContrast],
          backgroundColor: 'transparent',
          borderColor: getStepColorRGBA(stepKey, isActive ? 1 : 0.6),
          borderWidth: isActive ? 3 : 2,
          pointBackgroundColor: getStepColorRGBA(stepKey, 1),
          pointBorderColor: 'transparent',
          pointRadius: isActive ? 5 : 3,
          pointHoverRadius: 6,
        };
      });
  }, [stableMetrics, visibleSteps, currentStepIndex, language, hasSongSelected]);

  const chartData = { labels, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    layout: { padding: 30 },
    scales: {
      r: {
        startAngle: 45,
        angleLines: { color: 'hsl(220, 15%, 25%)' },
        grid: { color: 'hsl(220, 15%, 25%)' },
        pointLabels: {
          display: true,
          color: 'hsl(220, 15%, 70%)',
          font: { size: 10, family: 'Inter', weight: 500 },
        },
        ticks: { display: false, stepSize: 0.25 },
        min: 0,
        max: 1,
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'hsl(220, 20%, 15%)',
        titleFont: { family: 'Inter' },
        bodyFont: { family: 'IBM Plex Mono', size: 11 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            const labelNames = ['HF Extension', 'Stereo Width', 'Loudness', 'HF Contrast'];
            const label = labelNames[context.dataIndex] || '';
            const value = context.raw;
            return `${label}: ${(value * 100).toFixed(0)}%`;
          }
        }
      },
    },
  };

  // Track mouse position over chart to detect label hover
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!chartContainerRef.current) return;
    
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate position relative to center
    const relX = x - centerX;
    const relY = y - centerY;
    
    // Chart.js radar with startAngle: 45 places labels at:
    // Index 0 (HF Ext): 45° from top (top-right diagonal)
    // Index 1 (Stereo): 135° from top (bottom-right diagonal)
    // Index 2 (Loud): 225° from top (bottom-left diagonal)
    // Index 3 (HF Con): 315° from top (top-left diagonal)
    
    // atan2 gives angle from positive X-axis, need to convert
    // atan2(y, x) -> 0° is right, 90° is down, -90° is up
    const angle = Math.atan2(relY, relX) * (180 / Math.PI);
    const distance = Math.sqrt(relX * relX + relY * relY);
    
    // Only show tooltip near the edges (where labels are)
    const minDist = Math.min(rect.width, rect.height) * 0.35;
    const maxDist = Math.min(rect.width, rect.height) * 0.55;
    
    if (distance > minDist && distance < maxDist) {
      // Map angle to label based on actual chart positions
      // With startAngle: 45, first label is at -45° (top-right)
      let labelIndex = -1;
      
      // Normalize angle: -45° (HF Ext), 45° (Stereo), 135° (Loud), -135° (HF Con)
      if (angle >= -90 && angle < 0) labelIndex = 0;        // Top-right: HF Ext
      else if (angle >= 0 && angle < 90) labelIndex = 1;    // Bottom-right: Stereo
      else if (angle >= 90 && angle <= 180) labelIndex = 2; // Bottom-left: Loud
      else if (angle >= -180 && angle < -90) labelIndex = 3; // Top-left: HF Con
      
      if (labelIndex >= 0 && labels[labelIndex]) {
        setHoveredMetric(labels[labelIndex]);
        setTooltipPosition({ x: e.clientX, y: e.clientY });
      } else {
        setHoveredMetric(null);
      }
    } else {
      setHoveredMetric(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Floating Tooltip - rendered via portal, only when song is selected */}
      {hasSongSelected && hoveredMetric && METRIC_DESCRIPTIONS[hoveredMetric] && createPortal(
        <div
          className="fixed z-[99999] max-w-[200px] p-2.5 bg-popover border border-border rounded-lg shadow-2xl pointer-events-none"
          style={{
            left: Math.min(tooltipPosition.x + 12, window.innerWidth - 220),
            top: Math.max(tooltipPosition.y - 80, 10),
          }}
        >
          <p className="text-[11px] font-semibold text-foreground mb-0.5">
            {METRIC_DESCRIPTIONS[hoveredMetric][language].title}
          </p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {METRIC_DESCRIPTIONS[hoveredMetric][language].desc}
          </p>
        </div>,
        document.body
      )}

      {/* Radar Chart */}
      <div 
        ref={chartContainerRef}
        className="chart-panel p-2 flex-1 min-h-0 relative flex items-center justify-center"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredMetric(null)}
      >
        {!hasSongSelected ? (
          <div className="text-muted-foreground text-sm text-center">
            {t(language, 'selectSong')}
          </div>
        ) : (
          <div className="w-full h-full">
            <Radar data={chartData} options={options} />
          </div>
        )}
      </div>

      {/* Legend - More compact on mobile */}
      <div className="flex flex-wrap gap-0.5 sm:gap-1.5 justify-center flex-shrink-0 mt-1 sm:mt-3">
        {RADAR_LEGEND_STEPS.map(stepKey => {
          const isVisible = visibleSteps.has(stepKey);
          const stepIdx = getStepIndex(stepKey);
          const isAvailable = hasSongSelected && stepIdx <= currentStepIndex;
          
          return (
            <button
              key={stepKey}
              onClick={() => onToggleStep(stepKey)}
              disabled={!isAvailable}
              className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium transition-all ${
                isVisible && isAvailable 
                  ? 'bg-card shadow-sm' 
                  : 'bg-muted/30 opacity-40'
              } ${!isAvailable ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
              title={t(language, 'clickToToggle')}
            >
              <span
                className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full"
                style={{ backgroundColor: getStepColorRGBA(stepKey, isVisible && isAvailable ? 1 : 0.3) }}
              />
              <span>{STEP_LABELS[stepKey]?.[language] || stepKey}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
