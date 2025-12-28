// Audio cache using IndexedDB for persistent storage

const DB_NAME = 'harp-audio-cache';
const DB_VERSION = 1;
const STORE_NAME = 'audio-files';

interface CachedAudio {
  url: string;
  blob: Blob;
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'url' });
      }
    };
  });
  
  return dbPromise;
}

export async function getCachedAudio(url: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(url);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as CachedAudio | undefined;
        resolve(result?.blob || null);
      };
    });
  } catch (error) {
    console.warn('Failed to get cached audio:', error);
    return null;
  }
}

export async function setCachedAudio(url: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const data: CachedAudio = {
        url,
        blob,
        timestamp: Date.now(),
      };
      const request = store.put(data);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('Failed to cache audio:', error);
  }
}

export async function fetchWithCache(url: string): Promise<Blob> {
  // Check cache first
  const cached = await getCachedAudio(url);
  if (cached) {
    console.log('[Cache] Hit:', url.substring(0, 50) + '...');
    return cached;
  }
  
  // Fetch from network
  console.log('[Cache] Miss, fetching:', url.substring(0, 50) + '...');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  
  const blob = await response.blob();
  
  // Cache for future use
  await setCachedAudio(url, blob);
  
  return blob;
}

export async function clearAudioCache(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('Failed to clear audio cache:', error);
  }
}

export async function getCacheStats(): Promise<{ size: number; count: number }> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const items = request.result as CachedAudio[];
        const totalSize = items.reduce((sum, item) => sum + item.blob.size, 0);
        resolve({ size: totalSize, count: items.length });
      };
    });
  } catch (error) {
    console.warn('Failed to get cache stats:', error);
    return { size: 0, count: 0 };
  }
}

// Keep old function for backwards compatibility
export async function getCacheSize(): Promise<number> {
  const stats = await getCacheStats();
  return stats.size;
}

// Get all cached URLs - useful for reconstructing song list from cache
export async function getCachedUrls(): Promise<string[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
    });
  } catch (error) {
    console.warn('Failed to get cached URLs:', error);
    return [];
  }
}

// Check if a specific song has its original audio file cached
export async function isSongCached(songId: string): Promise<boolean> {
  try {
    const cachedUrls = await getCachedUrls();
    // Check if any cached URL contains this song's folder
    const encodedSongId = encodeURIComponent(songId);
    return cachedUrls.some(url => url.includes(encodedSongId) || url.includes(songId));
  } catch (error) {
    console.warn('Failed to check if song is cached:', error);
    return false;
  }
}

// Get set of cached song IDs
export async function getCachedSongIds(): Promise<Set<string>> {
  try {
    const cachedUrls = await getCachedUrls();
    const songIds = new Set<string>();
    
    for (const url of cachedUrls) {
      // Extract song ID from URL pattern: .../samples/{songId}/...
      const match = url.match(/samples\/([^/]+)\//);
      if (match) {
        songIds.add(decodeURIComponent(match[1]));
      }
    }
    
    return songIds;
  } catch (error) {
    console.warn('Failed to get cached song IDs:', error);
    return new Set();
  }
}
