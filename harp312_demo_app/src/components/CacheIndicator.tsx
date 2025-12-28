import React, { useEffect, useState } from 'react';
import { Database, Trash2 } from 'lucide-react';
import { getCacheStats, clearAudioCache } from '@/lib/audio-cache';
import { Language } from '@/lib/i18n';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface CacheIndicatorProps {
  language: Language;
  refreshTrigger?: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CacheIndicator({ language, refreshTrigger }: CacheIndicatorProps) {
  const [stats, setStats] = useState({ size: 0, count: 0 });
  const [isClearing, setIsClearing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const loadStats = async () => {
    const cacheStats = await getCacheStats();
    setStats(cacheStats);
  };

  useEffect(() => {
    loadStats();
  }, [refreshTrigger]);

  const handleClear = async () => {
    setIsClearing(true);
    await clearAudioCache();
    await loadStats();
    setIsClearing(false);
    setIsOpen(false);
  };

  const clearQuestion = language === 'it' ? 'Svuotare la cache?' : 'Clear cache?';
  const tracksLabel = language === 'it' ? 'tracce' : 'tracks';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-2 h-8 rounded-md bg-muted/40 hover:bg-muted/60 text-muted-foreground text-[10px] font-mono transition-colors cursor-pointer whitespace-nowrap">
          <Database className="w-3 h-3 flex-shrink-0" />
          <span>{stats.count} | {formatBytes(stats.size)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="center" sideOffset={4} className="w-auto p-2.5">
        <div className="flex flex-col gap-1.5 items-center">
          <p className="text-[10px] text-muted-foreground">
            {stats.count} {tracksLabel} ({formatBytes(stats.size)})
          </p>
          {stats.count > 0 && (
            <button
              onClick={handleClear}
              disabled={isClearing}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium text-white transition-all duration-200 bg-destructive hover:bg-destructive/90 disabled:opacity-50"
            >
              <Trash2 className={`w-3 h-3 ${isClearing ? 'animate-spin' : ''}`} />
              {clearQuestion}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}