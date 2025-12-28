import React, { useState, useEffect } from 'react';
import { Language } from '@/lib/i18n';
import { X, Monitor, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileDisclaimerProps {
  language: Language;
}

export function MobileDisclaimer({ language }: MobileDisclaimerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if on mobile (width < 768px)
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768;
      setIsVisible(isMobile && !isDismissed);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={cn(
        "max-w-sm w-full bg-card rounded-xl shadow-2xl border border-border overflow-hidden",
        "animate-in fade-in-0 zoom-in-95 duration-300"
      )}>
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-white font-semibold text-sm">
              {language === 'it' ? 'Esperienza Limitata' : 'Limited Experience'}
            </h2>
            <p className="text-white/80 text-xs">
              {language === 'it' ? 'App ottimizzata per desktop' : 'App optimized for desktop'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <Monitor className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground leading-relaxed">
              {language === 'it' ? (
                <>
                  <p className="mb-2">
                    <strong>HARP-312</strong> è un'applicazione professionale per l'analisi audio progettata per schermi grandi.
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Su smartphone alcune funzionalità potrebbero non essere disponibili o funzionare in modo limitato. Per la migliore esperienza, usa un computer desktop o tablet in modalità orizzontale.
                  </p>
                </>
              ) : (
                <>
                  <p className="mb-2">
                    <strong>HARP-312</strong> is a professional audio analysis application designed for large screens.
                  </p>
                  <p className="text-muted-foreground text-xs">
                    On smartphones some features may not be available or work in a limited way. For the best experience, use a desktop computer or tablet in landscape mode.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Limitations list */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground mb-2">
              {language === 'it' ? 'Limitazioni su mobile:' : 'Mobile limitations:'}
            </p>
            <div className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-amber-500" />
              {language === 'it' ? 'Waveform ridotto o non visibile' : 'Reduced or hidden waveform'}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-amber-500" />
              {language === 'it' ? 'Grafici radar compatti' : 'Compact radar charts'}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-amber-500" />
              {language === 'it' ? 'Navigazione con scroll necessaria' : 'Scrolling navigation required'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 pt-0 flex gap-2">
          <button
            onClick={handleDismiss}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary/30"
            )}
          >
            {language === 'it' ? 'Continua comunque' : 'Continue anyway'}
          </button>
        </div>
      </div>
    </div>
  );
}