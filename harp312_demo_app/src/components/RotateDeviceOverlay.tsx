import React, { useState, useEffect } from 'react';
import { Language } from '@/lib/i18n';
import { RotateCcw } from 'lucide-react';

interface RotateDeviceOverlayProps {
  language: Language;
}

export function RotateDeviceOverlay({ language }: RotateDeviceOverlayProps) {
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      // Only show on tablets (768px-1024px) in portrait, not on phones
      // Phones get the MobileDisclaimer instead
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTabletSize = width >= 768 && width < 1024;
      const isPortrait = height > width;
      setIsSmallScreen(isTabletSize && isPortrait);
    };

    checkScreen();
    window.addEventListener('resize', checkScreen);
    window.addEventListener('orientationchange', checkScreen);
    return () => {
      window.removeEventListener('resize', checkScreen);
      window.removeEventListener('orientationchange', checkScreen);
    };
  }, []);

  if (!isSmallScreen) return null;

  return (
    <div className="fixed inset-0 z-[99998] bg-background flex flex-col items-center justify-center p-8">
      <div className="animate-pulse mb-6">
        <RotateCcw className="w-16 h-16 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2 text-center">
        {language === 'it' ? 'Ruota il dispositivo' : 'Rotate your device'}
      </h2>
      <p className="text-muted-foreground text-center text-sm max-w-xs">
        {language === 'it' 
          ? 'Per una migliore esperienza, usa il dispositivo in modalità orizzontale' 
          : 'For the best experience, please use landscape mode'}
      </p>
    </div>
  );
}
