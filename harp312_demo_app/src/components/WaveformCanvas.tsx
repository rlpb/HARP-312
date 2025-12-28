import React, { useRef, useEffect, useCallback } from 'react';
import { generateIdleWaveformData, normalizeFrequencyData } from '@/lib/audio-utils';
import { STEP_COLORS } from '@/lib/pipeline';

interface WaveformCanvasProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  barCount?: number;
  height?: number;
  stepKey?: string; // Step key to determine color
}

// Get gradient colors for a step - more vibrant and contrasting
function getGradientColors(stepKey: string): [string, string, string, string] {
  const colors = STEP_COLORS[stepKey];
  if (!colors) {
    return ['hsl(210, 100%, 40%)', 'hsl(210, 100%, 60%)', 'hsl(220, 100%, 70%)', 'hsl(200, 100%, 45%)'];
  }
  
  // Create more vibrant gradient with complementary colors
  const rgb = colors.rgb;
  const baseColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  const lightColor = `rgb(${Math.min(255, rgb[0] + 80)}, ${Math.min(255, rgb[1] + 80)}, ${Math.min(255, rgb[2] + 80)})`;
  const brightColor = `rgb(${Math.min(255, rgb[0] + 40)}, ${Math.min(255, rgb[1] + 60)}, ${Math.min(255, rgb[2] + 100)})`;
  const darkColor = `rgb(${Math.max(0, rgb[0] - 30)}, ${Math.max(0, rgb[1] - 20)}, ${Math.max(0, rgb[2] + 20)})`;
  
  return [darkColor, baseColor, lightColor, brightColor];
}

export function WaveformCanvas({
  analyser,
  isPlaying,
  barCount = 32,
  height = 80,
  stepKey = 'musicgen',
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const animationRef = useRef<number>();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get actual display size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size to match display size with DPR
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    const width = rect.width;
    const canvasHeight = rect.height;
    
    ctx.clearRect(0, 0, width, canvasHeight);

    let barData: number[];

    // Show real audio data if playing and analyser available
    if (isPlaying && analyser) {
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(frequencyData);
      barData = normalizeFrequencyData(frequencyData, barCount);
    } else {
      frameRef.current++;
      barData = generateIdleWaveformData(barCount, frameRef.current);
    }

    const gap = 3;
    const barWidth = Math.max(1, (width - (barCount - 1) * gap) / barCount);
    const centerY = canvasHeight / 2;

    // Get gradient colors based on step - more vibrant
    const [darkColor, baseColor, lightColor, brightColor] = getGradientColors(stepKey);
    
    // Create rich multi-stop gradient
    const gradient = ctx.createLinearGradient(0, 0, width, canvasHeight);
    gradient.addColorStop(0, darkColor);
    gradient.addColorStop(0.3, baseColor);
    gradient.addColorStop(0.5, lightColor);
    gradient.addColorStop(0.7, baseColor);
    gradient.addColorStop(1, brightColor);
    
    // Get glow color from step
    const glowColor = STEP_COLORS[stepKey]?.hsl || 'hsl(210, 100%, 50%)';
    
    barData.forEach((value, i) => {
      const x = i * (barWidth + gap);
      const barHeight = Math.max(4, value * (canvasHeight - 10));
      const y = centerY - barHeight / 2;

      // Draw bar with rounded corners
      ctx.fillStyle = gradient;
      ctx.beginPath();
      const radius = Math.max(0, Math.min(barWidth / 2, 3));
      ctx.roundRect(x, y, Math.max(1, barWidth), Math.max(1, barHeight), radius);
      ctx.fill();
      
      // Add subtle glow effect when playing with higher values
      if (isPlaying && value > 0.5) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, Math.max(1, barWidth), Math.max(1, barHeight), radius);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    animationRef.current = requestAnimationFrame(draw);
  }, [analyser, isPlaying, barCount, stepKey]);

  useEffect(() => {
    draw();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
}
