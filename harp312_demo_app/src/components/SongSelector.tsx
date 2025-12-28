import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Language, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ChevronDown, Check, Loader2, AlertTriangle } from 'lucide-react';

interface Song {
  id: string;
  displayName: string;
}

interface SongSelectorProps {
  language: Language;
  songs: Song[];
  selectedSong: string | null;
  onSongSelect: (songId: string) => void;
  isLoading: boolean;
  sampleRate: number;
  channels: number;
  isDisabled?: boolean;
  loadError?: string | null;
  cachedSongIds?: Set<string>;
  apiAvailable?: boolean;
}

// Cover images from GitHub
const COVER_BASE_URL = 'https://raw.githubusercontent.com/rlpb/HARP-312/main/demo_resources/cover_pics/';

// Map song IDs to their correct cover numbers (matching folder prefixes)
// Song folders: "1 Lo-Fi Study Beat" -> cover 1.png
// Song folders: "2 Acoustic Folk Ballad" -> cover 2.png
// etc.
const SONG_COVER_MAP: Record<string, number> = {
  '1 Lo-Fi Study Beat': 1,
  '2 Acoustic Folk Ballad': 2,
  '3 Calssic Rock Anthem': 3,
  '4 House Music Groove': 4,
  '5 Epic Orchestral Score': 5,
  '6 90s Boom Bap Hip Hop': 6,
};

function getSongCoverUrl(songId: string): string {
  // Extract the number prefix from songId if present (e.g., "1 Lo-Fi Study Beat" -> 1)
  const match = songId.match(/^(\d+)\s/);
  if (match) {
    return `${COVER_BASE_URL}${match[1]}.png`;
  }
  // Fallback to map or default
  const coverNum = SONG_COVER_MAP[songId] || 1;
  return `${COVER_BASE_URL}${coverNum}.png`;
}

export function SongSelector({
  language,
  songs,
  selectedSong,
  onSongSelect,
  isLoading,
  sampleRate,
  channels,
  isDisabled = false,
  loadError = null,
  cachedSongIds = new Set(),
  apiAvailable = true,
}: SongSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [hoveredSongId, setHoveredSongId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipHideTimeoutRef = useRef<number | null>(null);

  const hideTooltip = () => {
    setHoveredSongId(null);
    setTooltipPosition(null);
    if (tooltipHideTimeoutRef.current) {
      window.clearTimeout(tooltipHideTimeoutRef.current);
      tooltipHideTimeoutRef.current = null;
    }
  };

  const showUnavailableTooltip = (songId: string, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setHoveredSongId(songId);
    setTooltipPosition({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });

    if (tooltipHideTimeoutRef.current) window.clearTimeout(tooltipHideTimeoutRef.current);
    tooltipHideTimeoutRef.current = window.setTimeout(() => {
      setHoveredSongId(null);
      setTooltipPosition(null);
      tooltipHideTimeoutRef.current = null;
    }, 2200);
  };

  useEffect(() => {
    return () => {
      if (tooltipHideTimeoutRef.current) window.clearTimeout(tooltipHideTimeoutRef.current);
    };
  }, []);
  const selectedSongData = songs.find(s => s.id === selectedSong);
  const selectedIndex = songs.findIndex(s => s.id === selectedSong);
  
  const formatSampleRate = (rate: number) => {
    if (rate >= 1000) {
      return `${Math.round(rate / 1000)}kHz`;
    }
    return `${rate}Hz`;
  };

  const channelLabel = channels === 2 ? 'Stereo' : 'Mono';

  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Also check if click is inside the portal dropdown
        const dropdown = document.getElementById('song-selector-dropdown');
        if (dropdown && dropdown.contains(e.target as Node)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Dropdown content rendered via portal
  const dropdownContent = isOpen ? createPortal(
    <div
      id="song-selector-dropdown"
      className={cn(
        "fixed z-[99999] max-h-[60vh] overflow-y-auto",
        "bg-card rounded-xl",
        "border border-border shadow-2xl",
        "animate-scale-in origin-top"
      )}
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
      }}
    >
      <div className="p-2">
        {songs.length === 0 ? (
          <div className="px-4 py-6 text-center">
            {loadError === 'rate_limit' ? (
              <div className="space-y-2">
                <div className="text-amber-500 dark:text-amber-400 font-medium text-sm">
                  {language === 'it' 
                    ? '⚠️ Limite API raggiunto' 
                    : '⚠️ API rate limit reached'}
                </div>
                <div className="text-muted-foreground text-xs leading-relaxed">
                  {language === 'it'
                    ? 'GitHub limita le richieste non autenticate. Riprova tra qualche minuto.'
                    : 'GitHub limits unauthenticated requests. Please try again in a few minutes.'}
                </div>
              </div>
            ) : loadError ? (
              <div className="text-muted-foreground text-sm">
                {language === 'it' 
                  ? 'Errore nel caricamento delle canzoni' 
                  : 'Error loading songs'}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                {language === 'it' ? 'Nessuna canzone disponibile' : 'No songs available'}
              </div>
            )}
          </div>
        ) : (
          songs.map((song) => {
            const isCached = cachedSongIds.has(song.id);
            const isAvailable = isCached || apiAvailable;
            
            return (
              <div
                key={song.id}
                role="button"
                tabIndex={0}
                aria-disabled={!isAvailable}
                onClick={(e) => {
                  if (!isAvailable) {
                    e.preventDefault();
                    e.stopPropagation();
                    showUnavailableTooltip(song.id, e.currentTarget as HTMLElement);
                    return;
                  }
                  onSongSelect(song.id);
                  setIsOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!isAvailable) {
                      showUnavailableTooltip(song.id, e.currentTarget as HTMLElement);
                      return;
                    }
                    onSongSelect(song.id);
                    setIsOpen(false);
                  }
                }}
                onMouseEnter={(e) => {
                  if (!isAvailable) {
                    showUnavailableTooltip(song.id, e.currentTarget as HTMLElement);
                  }
                }}
                onMouseLeave={() => {
                  hideTooltip();
                }}
                onPointerDown={(e) => {
                  if (!isAvailable && e.pointerType === 'touch') {
                    e.preventDefault();
                    e.stopPropagation();
                    showUnavailableTooltip(song.id, e.currentTarget as HTMLElement);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
                  "text-left transition-all duration-150 relative select-none",
                  !isAvailable && "opacity-50 cursor-not-allowed",
                  selectedSong === song.id
                    ? "bg-primary/10 text-primary"
                    : isAvailable
                      ? "hover:bg-muted/50 text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {/* Song Cover */}
                <div className={cn(
                  "w-10 h-10 min-w-[40px] min-h-[40px] rounded-md overflow-hidden relative flex-shrink-0",
                  selectedSong === song.id
                    ? "bg-primary/20"
                    : "bg-muted"
                )}>
                  <img 
                    src={getSongCoverUrl(song.id)} 
                    alt="cover" 
                    className={cn("w-full h-full object-cover", !isAvailable && "grayscale")}
                    crossOrigin="anonymous"
                  />
                  {/* Cached indicator */}
                  {isCached && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-card flex items-center justify-center">
                      <Check className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>

                {/* Song Name */}
                <span className={cn(
                  "flex-1 text-sm font-medium leading-tight",
                  !isAvailable && "text-muted-foreground"
                )} style={{ wordBreak: 'break-word' }}>
                  {song.displayName}
                </span>

                {/* Status icons */}
                {!isAvailable ? (
                  <div className="flex-shrink-0 relative">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </div>
                ) : selectedSong === song.id ? (
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>,
    document.body
  ) : null;

  // Custom themed tooltip for unavailable songs
  const tooltipContent = hoveredSongId && tooltipPosition ? createPortal(
    <div
      className={cn(
        "fixed z-[999999] px-3 py-2 rounded-lg",
        "bg-card border border-border shadow-lg",
        "text-xs text-foreground max-w-[200px] text-center",
        "animate-in fade-in-0 zoom-in-95 duration-150",
        "pointer-events-none"
      )}
      style={{
        top: tooltipPosition.top,
        left: tooltipPosition.left,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        <span>
          {language === 'it' 
            ? 'Non in cache. API limitata, riprova tra poco.' 
            : 'Not cached. API limited, try again soon.'}
        </span>
      </div>
      {/* Arrow */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-border"
      />
      <div 
        className="absolute left-1/2 -translate-x-1/2 top-full -mt-px w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-card"
      />
    </div>,
    document.body
  ) : null;

  return (
    <div ref={containerRef} className="relative w-full sm:w-72">
      {/* Trigger Button */}
      <button
        onClick={() => !isLoading && !isDisabled && setIsOpen(!isOpen)}
        disabled={isLoading || isDisabled}
        className={cn(
          "w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3",
          "bg-card/80 backdrop-blur-sm rounded-lg sm:rounded-xl",
          "border border-border/50 shadow-neumorphic-sm",
          "hover:border-primary/30 hover:shadow-md",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary/30",
          isOpen && "border-primary/50 shadow-md",
          isDisabled && "opacity-60 cursor-not-allowed"
        )}
      >
        {/* Icon/Cover */}
        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-md sm:rounded-lg flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden flex-shrink-0">
          {isLoading ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-spin" />
          ) : selectedSongData ? (
            <img 
              src={getSongCoverUrl(selectedSongData.id)} 
              alt="cover" 
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          )}
        </div>

        {/* Text Content */}
        <div className="flex-1 text-left min-w-0">
          {isLoading ? (
            <span className="text-xs sm:text-sm text-muted-foreground">
              {language === 'it' ? 'Caricamento...' : 'Loading...'}
            </span>
          ) : loadError === 'rate_limit' && songs.length === 0 ? (
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-semibold text-amber-500 dark:text-amber-400">
                {language === 'it' ? '⚠️ Limite API' : '⚠️ API Limit'}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                {language === 'it' ? 'Cache vuota • Riprova tra poco' : 'Cache empty • Retry soon'}
              </span>
            </div>
          ) : selectedSongData ? (
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-semibold truncate text-foreground">
                {selectedSongData.displayName}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                {formatSampleRate(sampleRate)} • {channelLabel}
              </span>
            </div>
          ) : (
            <span className="text-xs sm:text-sm text-muted-foreground">
              {t(language, 'selectSong')}
            </span>
          )}
        </div>

        {/* Chevron */}
        <ChevronDown 
          className={cn(
            "w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground transition-transform duration-200 flex-shrink-0",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      {/* Dropdown via Portal */}
      {dropdownContent}
      
      {/* Custom Tooltip via Portal */}
      {tooltipContent}
    </div>
  );
}
