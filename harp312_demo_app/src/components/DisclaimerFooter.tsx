import React from 'react';
import { Language, t } from '@/lib/i18n';
import { Info, Headphones } from 'lucide-react';

interface DisclaimerFooterProps {
  language: Language;
}

export function DisclaimerFooter({ language }: DisclaimerFooterProps) {
  return (
    <div className="bg-muted/30 border-t border-border/30 px-4 h-8 flex items-center">
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Headphones className="w-3 h-3 flex-shrink-0 text-primary/70" />
          <span className="text-primary/80 font-medium whitespace-nowrap">
            {t(language, 'headphonesHint')}
          </span>
        </div>
        <span className="text-border/50 flex-shrink-0">|</span>
        <div className="flex items-center gap-1.5 min-w-0">
          <Info className="w-3 h-3 flex-shrink-0" />
          <span className="leading-snug truncate">
            {t(language, 'disclaimer')}
          </span>
        </div>
      </div>
    </div>
  );
}
