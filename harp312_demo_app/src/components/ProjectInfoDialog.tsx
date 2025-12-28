import React from 'react';
import { Info } from 'lucide-react';
import { Language } from '@/lib/i18n';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ProjectInfoDialogProps {
  language: Language;
}

export function ProjectInfoDialog({ language }: ProjectInfoDialogProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Project info"
        >
          <Info className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        side="bottom" 
        align="center"
        sideOffset={4}
        className="w-auto p-2.5"
      >
        <div className="flex flex-col gap-0.5 items-center text-center">
          <p className="text-[11px] font-semibold text-foreground">
            HARP 312
          </p>
          <p className="text-[10px] text-muted-foreground">
            {language === 'it' 
              ? 'Corso di Machine Learning 2025' 
              : 'Machine Learning 2025 course'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {language === 'it'
              ? 'Demo progetto by Federico Carattoli'
              : 'Project demo by Federico Carattoli'}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}