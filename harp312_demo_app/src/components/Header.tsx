import React, { useState, useEffect } from 'react';
import { getRepoUrl, getReadmeUrl } from '@/lib/github-api';
import { Language, t } from '@/lib/i18n';
import { SongSelector } from './SongSelector';
import { CacheIndicator } from './CacheIndicator';
import { ProjectInfoDialog } from './ProjectInfoDialog';
import { FileText, Github, Maximize2, Minimize2 } from 'lucide-react';
import { getStepColorRGBA } from '@/lib/pipeline';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Live logo from GitHub
const LOGO_URL = 'https://raw.githubusercontent.com/rlpb/HARP-312/main/demo_resources/logo.png';

interface HeaderProps {
  language: Language;
  onLanguageToggle: () => void;
  selectedSong: string | null;
  songDisplayName: string;
  sampleRate: number;
  channels: number;
  songs: Array<{ id: string; displayName: string }>;
  onSongSelect: (songId: string) => void;
  isLoading: boolean;
  isSimulating?: boolean;
  loadError?: string | null;
  cacheRefreshTrigger?: number;
  cachedSongIds?: Set<string>;
  apiAvailable?: boolean;
}

// Utility to strip leading number from song title
export function cleanSongTitle(title: string): string {
  return title.replace(/^\d+\s*[-–—]?\s*/, '').trim();
}

// UK Flag Component - Circular
const UKFlag = () => (
  <svg className="w-5 h-5 rounded-full shadow-sm overflow-hidden" viewBox="0 0 40 40">
    <clipPath id="ukClip">
      <circle cx="20" cy="20" r="20"/>
    </clipPath>
    <g clipPath="url(#ukClip)">
      <rect fill="#012169" width="40" height="40"/>
      <path d="m0,0 40,40M40,0 0,40" stroke="#fff" strokeWidth="6"/>
      <path d="m0,0 40,40M40,0 0,40" stroke="#C8102E" strokeWidth="4"/>
      <path d="M20,0v40M0,20h40" stroke="#fff" strokeWidth="10"/>
      <path d="M20,0v40M0,20h40" stroke="#C8102E" strokeWidth="6"/>
    </g>
  </svg>
);

// Italy Flag Component - Circular
const ItalyFlag = () => (
  <svg className="w-5 h-5 rounded-full shadow-sm overflow-hidden" viewBox="0 0 40 40">
    <clipPath id="itClip">
      <circle cx="20" cy="20" r="20"/>
    </clipPath>
    <g clipPath="url(#itClip)">
      <rect fill="#009246" width="13.33" height="40"/>
      <rect fill="#fff" x="13.33" width="13.34" height="40"/>
      <rect fill="#CE2B37" x="26.67" width="13.33" height="40"/>
    </g>
  </svg>
);

export function Header({
  language,
  onLanguageToggle,
  selectedSong,
  sampleRate,
  songs,
  channels,
  onSongSelect,
  isLoading,
  isSimulating = false,
  loadError = null,
  cacheRefreshTrigger,
  cachedSongIds = new Set(),
  apiAvailable = true,
}: HeaderProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reportPopoverOpen, setReportPopoverOpen] = useState(false);
  
  // Track fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Clean display names for the selector
  const cleanedSongs = songs.map(s => ({
    id: s.id,
    displayName: cleanSongTitle(s.displayName),
  }));

  const reportUrl = `https://raw.githubusercontent.com/rlpb/HARP-312/main/report/main.pdf?t=${Date.now()}`;
  const downloadLabel = language === 'it' ? 'Scarica Report PDF' : 'Download PDF Report';
  const downloadQuestion = language === 'it' ? 'Scaricare il report?' : 'Download report?';
  const downloadButton = language === 'it' ? 'Scarica' : 'Download';

  return (
    <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 px-2 sm:px-4 h-14 flex items-center flex-shrink-0">
      <div className="flex items-center justify-between w-full gap-2">
        {/* Logo - Left aligned, hidden on very small screens */}
        <div className="hidden sm:flex items-center h-full py-1 flex-shrink-0 w-auto lg:w-48">
          <img 
            src={`${LOGO_URL}?t=${Date.now()}`} 
            alt="HARP 312" 
            className="h-8 sm:h-10 w-auto object-contain"
            crossOrigin="anonymous"
          />
        </div>

        {/* Song Selector - Centered on larger screens, takes available space on mobile */}
        <div className="flex-1 sm:flex-none sm:absolute sm:left-1/2 sm:-translate-x-1/2">
          <SongSelector
            language={language}
            songs={cleanedSongs}
            selectedSong={selectedSong}
            onSongSelect={onSongSelect}
            isLoading={isLoading}
            sampleRate={sampleRate}
            channels={channels}
            isDisabled={isSimulating}
            loadError={loadError}
            cachedSongIds={cachedSongIds}
            apiAvailable={apiAvailable}
          />
        </div>
        
        {/* Right Actions - Responsive width */}
        <div className="flex justify-end w-auto lg:w-48 flex-shrink-0">
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Cache Indicator - hidden on very small screens */}
            <div className="hidden sm:block">
              <CacheIndicator language={language} refreshTrigger={cacheRefreshTrigger} />
            </div>
            
            {/* Project Info Popover */}
            <ProjectInfoDialog language={language} />
            
            {/* PDF Report with confirmation - hidden on small screens */}
            <Popover open={reportPopoverOpen} onOpenChange={setReportPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors cursor-pointer"
                  aria-label={downloadLabel}
                >
                  <FileText className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="center" sideOffset={4} className="w-auto p-2.5">
                <div className="flex flex-col gap-1.5 items-center">
                  <p className="text-[10px] text-muted-foreground">{downloadQuestion}</p>
                  <button
                    onClick={() => {
                      window.open(reportUrl, '_blank');
                      setReportPopoverOpen(false);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium text-white transition-all duration-200"
                    style={{
                      background: `linear-gradient(135deg, ${getStepColorRGBA('musicgen', 0.85)}, ${getStepColorRGBA('musicgen', 0.65)})`,
                      boxShadow: `0 2px 8px ${getStepColorRGBA('musicgen', 0.25)}`
                    }}
                  >
                    <FileText className="w-3 h-3" />
                    {downloadButton}
                  </button>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* GitHub link - hidden on small screens */}
            <a
              href={getRepoUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
            
            {/* Fullscreen button - hidden on mobile */}
            <button
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  document.documentElement.requestFullscreen();
                }
              }}
              className="hidden sm:flex p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            
            {/* Language flag toggle */}
            <button
              onClick={onLanguageToggle}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-muted/50 transition-colors"
              aria-label={language === 'en' ? 'Switch to Italian' : 'Passa a Inglese'}
              title={language === 'en' ? 'Switch to Italian' : 'Passa a Inglese'}
            >
              {language === 'en' ? <UKFlag /> : <ItalyFlag />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
