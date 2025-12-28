import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Header, cleanSongTitle } from '@/components/Header';
import { InputCard } from '@/components/InputCard';
import { OutputCard } from '@/components/OutputCard';
import { RadarPanel } from '@/components/RadarPanel';
import { PlayerControls } from '@/components/PlayerControls';
import { PipelineStrip } from '@/components/PipelineStrip';
import { DisclaimerFooter } from '@/components/DisclaimerFooter';
import { StepDescriptionPanel } from '@/components/StepDescriptionPanel';
import { RotateDeviceOverlay } from '@/components/RotateDeviceOverlay';
import { MobileDisclaimer } from '@/components/MobileDisclaimer';
import { Language } from '@/lib/i18n';
import { 
  discoverSongs, 
  fetchAnalysisArtifacts, 
  reconstructSongsFromCache,
  checkApiAvailability,
  Song, 
  SongFiles,
  AnalysisArtifacts,
  DiscoverSongsResult 
} from '@/lib/github-api';
import { fetchWithCache, getCachedUrls, getCachedSongIds } from '@/lib/audio-cache';
import { 
  createAudioContext, 
  setupAudioAnalyser,
} from '@/lib/audio-utils';
import { 
  PIPELINE_STEPS, 
  PipelineStep,
  StepMetrics,
  DEFAULT_METRICS,
  RADAR_LEGEND_STEPS,
  parseMetricsFromArtifacts,
  getAudioKeyForStep,
} from '@/lib/pipeline';
import { getAllHeatmapMetrics, getHeatmapCount } from '@/lib/heatmap-data';

interface CachedSongData {
  files: SongFiles;
  audioUrls: Record<string, string>;
  artifacts: AnalysisArtifacts;
  metrics: Record<string, StepMetrics>;
}

const Index = () => {
  // Language state
  const [language, setLanguage] = useState<Language>('en');
  
  // Song discovery state
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(true);
  const [songLoadError, setSongLoadError] = useState<string | null>(null);
  const [cachedSongIds, setCachedSongIds] = useState<Set<string>>(new Set());
  const [apiAvailable, setApiAvailable] = useState<boolean>(true);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  
  // Processing simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatingStepIndex, setSimulatingStepIndex] = useState<number | undefined>(undefined);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [pipelineSteps] = useState<PipelineStep[]>(PIPELINE_STEPS);
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOriginalMode, setIsOriginalMode] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [cacheRefreshTrigger, setCacheRefreshTrigger] = useState(0);
  
  // Radar state
  const [visibleSteps, setVisibleSteps] = useState<Set<string>>(new Set(RADAR_LEGEND_STEPS));
  
  // Cached data
  const [cachedData, setCachedData] = useState<Record<string, CachedSongData>>({});
  
  // Audio refs - TWO separate players for original and processed
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Original audio (musicgen) - always plays the original track
  const originalAnalyserRef = useRef<AnalyserNode | null>(null);
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const originalSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const originalGainRef = useRef<GainNode | null>(null);
  
  // Processed audio - plays the currently selected step's audio
  const processedAnalyserRef = useRef<AnalyserNode | null>(null);
  const processedAudioRef = useRef<HTMLAudioElement | null>(null);
  const processedSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const processedGainRef = useRef<GainNode | null>(null);
  
  // Get current song
  const currentSong = songs.find(s => s.id === selectedSongId);
  const currentCache = selectedSongId ? cachedData[selectedSongId] : null;
  
  // Discover songs on mount - use cache first, then try GitHub
  useEffect(() => {
    const loadSongs = async () => {
      setIsLoadingSongs(true);
      setSongLoadError(null);
      
      try {
        // Get cached song IDs first
        const cachedIds = await getCachedSongIds();
        setCachedSongIds(cachedIds);
        
        // First, try to reconstruct song list from cache
        const cachedUrls = await getCachedUrls();
        if (cachedUrls.length > 0) {
          const cachedSongs = reconstructSongsFromCache(cachedUrls);
          if (cachedSongs.length > 0) {
            console.log('[Songs] Loaded from cache:', cachedSongs.length, 'songs');
            setSongs(cachedSongs);
            setIsLoadingSongs(false);
            
            // Try to refresh from GitHub in background (silent) - merge with cache
            discoverSongs()
              .then(result => {
                // Only mark API as available if NOT from fallback
                setApiAvailable(!result.isFromFallback);
                
                if (!result.isFromFallback && result.songs.length > 0) {
                  // Merge: keep cached songs and add any new ones from GitHub
                  const cachedSongIdsSet = new Set(cachedSongs.map(s => s.id));
                  const newSongs = result.songs.filter(s => !cachedSongIdsSet.has(s.id));
                  
                  if (newSongs.length > 0) {
                    const merged = [...cachedSongs, ...newSongs];
                    console.log('[Songs] Merged cache + GitHub:', merged.length, 'songs (', newSongs.length, 'new)');
                    setSongs(merged);
                  } else if (result.songs.length > cachedSongs.length) {
                    // GitHub has songs we don't have cached - use GitHub list
                    console.log('[Songs] GitHub has more songs:', result.songs.length);
                    setSongs(result.songs);
                  }
                } else if (result.isFromFallback) {
                  // API is rate limited - KEEP cached songs with their correct URLs!
                  // Only add non-cached songs from fallback for display purposes
                  const cachedSongIdsSet = new Set(cachedSongs.map(s => s.id));
                  const nonCachedFallback = result.songs.filter(s => !cachedSongIdsSet.has(s.id));
                  
                  // Merge: cached songs first (with working URLs), then fallback songs (display only)
                  const merged = [...cachedSongs, ...nonCachedFallback];
                  console.log('[Songs] API rate limited, merged cached + fallback:', merged.length, 'songs');
                  setSongs(merged);
                }
              })
              .catch(() => {
                // API not available - mark it
                setApiAvailable(false);
                console.log('[Songs] Background refresh failed, using cache');
              });
            return;
          }
        }
        
        // No cache, fetch from GitHub
        const result = await discoverSongs();
        setSongs(result.songs);
        
        // API is only truly available if NOT from fallback
        const isReallyAvailable = !result.isFromFallback && result.songs.length > 0;
        setApiAvailable(isReallyAvailable);
        
        if (result.isFromFallback || result.songs.length === 0) {
          setSongLoadError('rate_limit');
        }
      } catch (error: any) {
        console.error('Failed to discover songs:', error);
        setApiAvailable(false);
        if (error?.message?.includes('rate limit') || error?.message?.includes('403')) {
          setSongLoadError('rate_limit');
        } else {
          setSongLoadError('generic');
        }
      } finally {
        setIsLoadingSongs(false);
      }
    };
    loadSongs();
  }, []);

  // Periodic API availability check - every 30 seconds when API is unavailable
  useEffect(() => {
    // Only poll when API is currently unavailable
    if (apiAvailable) return;

    const pollInterval = setInterval(async () => {
      console.log('[API] Checking availability...');
      const isAvailable = await checkApiAvailability();
      
      if (isAvailable && !apiAvailable) {
        console.log('[API] GitHub API is now available!');
        setApiAvailable(true);
        setSongLoadError(null);
        
        // Refresh song list from GitHub
        try {
          const result = await discoverSongs();
          if (!result.isFromFallback && result.songs.length > 0) {
            setSongs(result.songs);
          }
        } catch (e) {
          console.warn('[API] Failed to refresh songs:', e);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(pollInterval);
  }, [apiAvailable]);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    return audioContextRef.current;
  }, []);
  
  // Handle song selection
  const handleSongSelect = useCallback(async (songId: string) => {
    if (songId === selectedSongId) return;
    
    // Check if song is available (cached or API available)
    const isCached = cachedSongIds.has(songId);
    if (!isCached && !apiAvailable) {
      console.warn('[Song] Cannot select - not cached and API limited:', songId);
      return; // Block selection - SongSelector should already prevent this
    }
    
    // Stop current playback on both players
    if (originalAudioRef.current) {
      originalAudioRef.current.pause();
      originalAudioRef.current.src = '';
    }
    if (processedAudioRef.current) {
      processedAudioRef.current.pause();
      processedAudioRef.current.src = '';
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    
    setSelectedSongId(songId);
    setIsSimulating(true);
    setCurrentStepIndex(0);
    setCompletedSteps(new Set());
    setIsOriginalMode(true);
    
    const song = songs.find(s => s.id === songId);
    if (!song) return;
    
    // Check cache
    if (cachedData[songId]) {
      runVisualSimulation(cachedData[songId]);
      return;
    }
    
    // Fetch data in parallel with visual simulation
    const songIndex = songs.findIndex(s => s.id === songId);
    const fetchPromise = fetchSongData(song, songIndex);
    runVisualSimulation(null, fetchPromise);
  }, [selectedSongId, songs, cachedData, cachedSongIds, apiAvailable]);
  
  // Fetch all song data
  const fetchSongData = async (song: Song, songIndex: number): Promise<CachedSongData> => {
    const audioUrls: Record<string, string> = {};
    let metrics: Record<string, StepMetrics> = {};
    
    const artifacts = await fetchAnalysisArtifacts(song.id);
    
    const heatmapIndex = songIndex % getHeatmapCount();
    const heatmapMetrics = getAllHeatmapMetrics(heatmapIndex);
    
    if (Object.keys(heatmapMetrics).length > 0) {
      metrics = heatmapMetrics as Record<string, StepMetrics>;
    } else {
      for (const stepKey of Object.keys(DEFAULT_METRICS)) {
        const parsed = parseMetricsFromArtifacts(artifacts, stepKey);
        if (parsed) {
          metrics[stepKey] = parsed;
        } else {
          metrics[stepKey] = DEFAULT_METRICS[stepKey];
        }
      }
    }
    
    // Fetch audio files with caching and create object URLs
    const fileKeys = Object.keys(song.files) as (keyof SongFiles)[];
    for (const key of fileKeys) {
      const file = song.files[key];
      if (file?.download_url) {
        try {
          // Use cache system - downloads only if not cached
          const blob = await fetchWithCache(file.download_url);
          audioUrls[key] = URL.createObjectURL(blob);
        } catch (e) {
          console.warn(`Failed to fetch ${key} audio:`, e);
          // Fallback to direct URL
          audioUrls[key] = file.download_url;
        }
      }
    }
    
    const data: CachedSongData = {
      files: song.files,
      audioUrls,
      artifacts,
      metrics,
    };
    
    setCachedData(prev => ({ ...prev, [song.id]: data }));
    setCacheRefreshTrigger(prev => prev + 1); // Trigger cache indicator refresh
    return data;
  };
  
  // Run visual simulation - progressive step completion with animation
  const runVisualSimulation = async (
    existingData: CachedSongData | null, 
    fetchPromise?: Promise<CachedSongData>
  ) => {
    const steps = PIPELINE_STEPS;
    const stepDuration = 1500; // 1.5 seconds per step for more realistic simulation
    
    for (let i = 0; i < steps.length; i++) {
      setSimulatingStepIndex(i);
      setCurrentStepIndex(i);
      await new Promise(resolve => setTimeout(resolve, stepDuration));
      setCompletedSteps(prev => new Set([...prev, steps[i].key]));
    }
    
    if (fetchPromise && !existingData) {
      await fetchPromise;
    }
    
    setIsSimulating(false);
    setSimulatingStepIndex(undefined);
    setCurrentStepIndex(steps.length - 1);
  };
  
  // Update processed audio when step changes
  const updateProcessedAudio = useCallback((stepKey: string) => {
    if (!processedAudioRef.current || !currentCache?.audioUrls) {
      console.log('[Audio] No audio ref or cache for step:', stepKey);
      return;
    }
    
    const audioKey = getAudioKeyForStep(stepKey);
    const audioUrl = currentCache.audioUrls[audioKey];
    
    console.log('[Audio] Step:', stepKey, '-> AudioKey:', audioKey, '-> URL exists:', !!audioUrl);
    console.log('[Audio] Available keys:', Object.keys(currentCache.audioUrls));
    
    const finalUrl = audioUrl || currentCache.audioUrls['master'] || currentCache.audioUrls['original'];
    
    if (finalUrl && processedAudioRef.current.src !== finalUrl) {
      const savedTime = originalAudioRef.current?.currentTime || 0;
      processedAudioRef.current.src = finalUrl;
      processedAudioRef.current.currentTime = savedTime;
      
      if (isPlaying) {
        processedAudioRef.current.play().catch(console.error);
      }
    }
  }, [currentCache, isPlaying]);
  
  // Handle step click in pipeline - now all steps are selectable
  const handleStepClick = useCallback((stepKey: string, index: number) => {
    if (!completedSteps.has(stepKey) && index > currentStepIndex) return;
    
    setCurrentStepIndex(index);
    
    // Update processed audio to new step
    updateProcessedAudio(stepKey);
  }, [completedSteps, currentStepIndex, updateProcessedAudio]);
  
  // Handle play/pause - both players play together, mute controls which is heard
  const handlePlayPause = useCallback(async () => {
    if (!currentCache?.audioUrls) return;
    
    const ctx = initAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    // Initialize original audio player
    if (!originalAudioRef.current) {
      originalAudioRef.current = new Audio();
      originalAudioRef.current.crossOrigin = 'anonymous';
      
      const { analyser, source, gainNode } = setupAudioAnalyser(ctx, originalAudioRef.current);
      originalAnalyserRef.current = analyser;
      originalSourceRef.current = source;
      originalGainRef.current = gainNode;
      
      originalAudioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(originalAudioRef.current?.currentTime || 0);
      });
      
      originalAudioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(originalAudioRef.current?.duration || 0);
      });
      
      originalAudioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
      });
      
      originalAudioRef.current.loop = isLooping;
    }
    
    // Initialize processed audio player
    if (!processedAudioRef.current) {
      processedAudioRef.current = new Audio();
      processedAudioRef.current.crossOrigin = 'anonymous';
      
      const { analyser, source, gainNode } = setupAudioAnalyser(ctx, processedAudioRef.current);
      processedAnalyserRef.current = analyser;
      processedSourceRef.current = source;
      processedGainRef.current = gainNode;
      
      processedAudioRef.current.loop = isLooping;
    }
    
    // Set audio sources
    const originalUrl = currentCache.audioUrls['original'];
    const processedKey = getAudioKeyForStep(PIPELINE_STEPS[currentStepIndex].key);
    const processedUrl = currentCache.audioUrls[processedKey] || originalUrl;
    
    if (originalUrl && originalAudioRef.current.src !== originalUrl) {
      originalAudioRef.current.src = originalUrl;
    }
    if (processedUrl && processedAudioRef.current.src !== processedUrl) {
      processedAudioRef.current.src = processedUrl;
    }
    
    // Set volume based on mode using GainNode (analyser still gets data)
    if (originalGainRef.current) {
      originalGainRef.current.gain.value = isOriginalMode ? 1 : 0;
    }
    if (processedGainRef.current) {
      processedGainRef.current.gain.value = isOriginalMode ? 0 : 1;
    }
    
    if (isPlaying) {
      originalAudioRef.current.pause();
      processedAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        // Play both simultaneously
        await Promise.all([
          originalAudioRef.current.play(),
          processedAudioRef.current.play()
        ]);
        setIsPlaying(true);
      } catch (e) {
        console.error('Playback failed:', e);
      }
    }
  }, [currentCache, isOriginalMode, currentStepIndex, isPlaying, isLooping, initAudioContext]);
  
  // Handle mode toggle - switch gain values (not mute, so analyser keeps working)
  const handleModeToggle = useCallback((original: boolean) => {
    setIsOriginalMode(original);
    
    if (originalGainRef.current) {
      originalGainRef.current.gain.value = original ? 1 : 0;
    }
    if (processedGainRef.current) {
      processedGainRef.current.gain.value = original ? 0 : 1;
    }
  }, []);
  
  // Handle seek - sync both players
  const handleSeek = useCallback((time: number) => {
    if (originalAudioRef.current) {
      originalAudioRef.current.currentTime = time;
    }
    if (processedAudioRef.current) {
      processedAudioRef.current.currentTime = time;
    }
    setCurrentTime(time);
  }, []);
  
  // Handle skip - sync both players
  const handleSkip = useCallback((seconds: number) => {
    if (originalAudioRef.current) {
      const newTime = Math.max(0, Math.min(
        originalAudioRef.current.currentTime + seconds,
        originalAudioRef.current.duration || 0
      ));
      originalAudioRef.current.currentTime = newTime;
      if (processedAudioRef.current) {
        processedAudioRef.current.currentTime = newTime;
      }
      setCurrentTime(newTime);
    }
  }, []);
  
  // Handle radar legend toggle
  const handleToggleRadarStep = useCallback((step: string) => {
    setVisibleSteps(prev => {
      const next = new Set(prev);
      if (next.has(step)) {
        next.delete(step);
      } else {
        next.add(step);
      }
      return next;
    });
  }, []);
  
  // Sync loop state
  useEffect(() => {
    if (originalAudioRef.current) {
      originalAudioRef.current.loop = isLooping;
    }
    if (processedAudioRef.current) {
      processedAudioRef.current.loop = isLooping;
    }
  }, [isLooping]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (originalAudioRef.current) {
        originalAudioRef.current.pause();
        originalAudioRef.current.src = '';
      }
      if (processedAudioRef.current) {
        processedAudioRef.current.pause();
        processedAudioRef.current.src = '';
      }
      Object.values(cachedData).forEach(data => {
        Object.values(data.audioUrls).forEach(url => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
      });
    };
  }, []);

  const currentStepKey = PIPELINE_STEPS[currentStepIndex]?.key || 'musicgen';

  // Get metrics immediately from heatmaps (synchronous) to avoid jumps
  const songIndex = selectedSongId 
    ? songs.findIndex(s => s.id === selectedSongId) 
    : -1;
  const immediateMetrics = useMemo(() => {
    if (songIndex < 0) return DEFAULT_METRICS;
    const heatmapIndex = songIndex % getHeatmapCount();
    const heatmapMetrics = getAllHeatmapMetrics(heatmapIndex);
    return Object.keys(heatmapMetrics).length > 0 
      ? heatmapMetrics as Record<string, StepMetrics>
      : DEFAULT_METRICS;
  }, [songIndex]);

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-auto sm:overflow-hidden sm:h-screen">
      {/* Mobile disclaimer */}
      <MobileDisclaimer language={language} />
      {/* Rotate device overlay for mobile portrait */}
      <RotateDeviceOverlay language={language} />
      {/* Header - Fixed height */}
      <Header
        language={language}
        onLanguageToggle={() => setLanguage(l => l === 'en' ? 'it' : 'en')}
        selectedSong={selectedSongId}
        songDisplayName={currentSong ? cleanSongTitle(currentSong.displayName) : ''}
        sampleRate={currentSong?.sampleRate || 32000}
        channels={currentSong?.channels || 1}
        songs={songs.map(s => ({ id: s.id, displayName: s.displayName }))}
        onSongSelect={handleSongSelect}
        isLoading={isLoadingSongs}
        isSimulating={isSimulating}
        loadError={songLoadError}
        cacheRefreshTrigger={cacheRefreshTrigger}
        cachedSongIds={cachedSongIds}
        apiAvailable={apiAvailable}
      />
      
      {/* Main Content - 3-column grid on desktop, stacked on mobile */}
      <main className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 sm:p-3 min-h-0">
        {/* Column 1: Waveforms */}
        <div className="flex flex-col gap-1 sm:gap-2 min-h-0">
          {/* Input Waveform - Original audio */}
          <div className="flex-1 min-h-[50px] sm:min-h-[60px]">
            <InputCard
              language={language}
              songName={currentSong ? cleanSongTitle(currentSong.displayName) : 'Music Gen'}
              sampleRate={currentSong?.sampleRate || 32000}
              channels={currentSong?.channels || 1}
              analyser={originalAnalyserRef.current}
              isPlaying={isPlaying}
              isOriginalMode={isOriginalMode}
            />
          </div>
          
          {/* Output Waveform - Processed audio */}
          <div className="flex-1 min-h-[50px] sm:min-h-[60px]">
            <OutputCard
              language={language}
              isPending={isSimulating || !selectedSongId}
              currentStepKey={currentStepKey}
              analyser={processedAnalyserRef.current}
              isPlaying={isPlaying}
              isProcessedMode={!isOriginalMode}
              isSimulating={isSimulating}
            />
          </div>
        </div>
        
        {/* Column 2: Step Description + Player */}
        <div className="flex flex-col gap-1 sm:gap-2 min-h-0">
          {/* Step Description */}
          <div className="flex-1 min-h-[50px] sm:min-h-[60px]">
            <StepDescriptionPanel
              language={language}
              currentStep={currentStepKey}
            />
          </div>
          
          {/* Player Controls */}
          <div className="neumorphic flex-shrink-0">
            <PlayerControls
              language={language}
              isOriginal={isOriginalMode}
              onToggleMode={handleModeToggle}
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onSkip={handleSkip}
              currentTime={currentTime}
              duration={duration}
              isLooping={isLooping}
              onToggleLoop={() => setIsLooping(!isLooping)}
              disabled={!selectedSongId || isSimulating}
              currentStepKey={currentStepKey}
            />
          </div>
        </div>
        
        {/* Column 3: Radar Chart with Legend */}
        <div className="neumorphic p-1 sm:p-3 min-h-[120px] sm:min-h-[150px] overflow-hidden">
          <RadarPanel
            language={language}
            currentStep={currentStepKey}
            currentStepIndex={currentStepIndex}
            stepMetrics={immediateMetrics}
            visibleSteps={visibleSteps}
            onToggleStep={handleToggleRadarStep}
            completedSteps={completedSteps}
            isSimulating={isSimulating}
            hasSongSelected={!!selectedSongId}
          />
        </div>
      </main>
      
      {/* Pipeline Strip - Fixed height */}
      <PipelineStrip
        language={language}
        steps={pipelineSteps}
        currentStepIndex={currentStepIndex}
        onStepClick={handleStepClick}
        completedSteps={completedSteps}
        isSimulating={isSimulating}
        songId={selectedSongId || undefined}
        simulatingStepIndex={simulatingStepIndex}
      />
      
      {/* Disclaimer Footer - Fixed height */}
      <DisclaimerFooter language={language} />
    </div>
  );
};

export default Index;
