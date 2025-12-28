import React from 'react';
import { Language } from '@/lib/i18n';
import { getStepDescription } from '@/lib/step-descriptions';
import { getStepColor } from '@/lib/pipeline';

interface StepDescriptionPanelProps {
  language: Language;
  currentStep: string;
}

// Parse markdown bold (**text**) within a line
function renderBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return <strong key={index} className="font-semibold text-foreground">{boldText}</strong>;
    }
    return part;
  });
}

// Parse full markdown with bullets and bold
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  
  return lines.map((line, index) => {
    const trimmed = line.trim();
    
    // Empty line = paragraph break
    if (trimmed === '') {
      return <div key={index} className="h-2" />;
    }
    
    // Bullet point
    if (trimmed.startsWith('•')) {
      const content = trimmed.slice(1).trim();
      return (
        <div key={index} className="flex gap-2 text-left pl-2">
          <span className="text-primary/60 shrink-0">•</span>
          <span>{renderBold(content)}</span>
        </div>
      );
    }
    
    // Numbered list (e.g., "1. ")
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      return (
        <div key={index} className="flex gap-2 text-left pl-2">
          <span className="text-primary/60 shrink-0 tabular-nums">{numberedMatch[1]}.</span>
          <span>{renderBold(numberedMatch[2])}</span>
        </div>
      );
    }
    
    // Regular line (could be a heading if bold)
    return (
      <div key={index} className="text-center">
        {renderBold(trimmed)}
      </div>
    );
  });
}

export function StepDescriptionPanel({ language, currentStep }: StepDescriptionPanelProps) {
  const stepDesc = getStepDescription(currentStep, language);
  const stepColor = getStepColor(currentStep);

  return (
    <div className="neumorphic p-4 h-full flex flex-col overflow-hidden">
      {/* Title - render newlines for parentheses on second line */}
      <h3 
        className="font-semibold text-center mb-3 uppercase tracking-wide whitespace-pre-line"
        style={{ 
          color: stepColor,
          fontSize: 'clamp(0.7rem, 0.9vw + 0.3rem, 1rem)',
        }}
      >
        {stepDesc.title}
      </h3>
      
      {/* Description */}
      <div 
        className="text-foreground/75 flex-1 overflow-y-auto space-y-0.5"
        style={{ 
          fontSize: 'clamp(0.6rem, 0.65vw + 0.25rem, 0.8rem)',
          lineHeight: '1.5'
        }}
      >
        {renderMarkdown(stepDesc.description)}
      </div>
    </div>
  );
}
