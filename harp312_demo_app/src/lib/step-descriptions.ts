import { Language } from './i18n';

export interface StepDescription {
  id: string;
  label: string;
  stage: string;
  title_en: string;
  title_it: string;
  desc_en: string;
  desc_it: string;
}

export const STEP_DESCRIPTIONS: Record<string, StepDescription> = {
  musicgen: {
    id: "musicgen",
    label: "MusicGen",
    stage: "SOURCE",
    title_it: "Generazione musicale\n(MusicGen)",
    title_en: "Music generation\n(MusicGen)",
    desc_it: `Genera l'audio di partenza da un prompt testuale, fornendo una base musicale "grezza" per le fasi successive.

**Modello:** MusicGen "medium" (AudioCraft)

**Elaborazione:**
• Sintesi audio condizionata dal testo del prompt
• Produce un breve brano coerente con il preset scelto (es. lo-fi)
• Normalizzazione orientata alla loudness percepita, riducendo il rischio di clipping

**Output:** mono, 32 kHz`,
    desc_en: `Creates the starting audio from a text prompt, providing a rough musical base for later refinement.

**Model:** MusicGen "medium" (AudioCraft)

**Processing:**
• Text-conditioned audio synthesis
• Outputs a short piece consistent with the selected preset (e.g., lo-fi)
• Perceptual loudness–oriented normalization, reducing clipping risk

**Output:** mono, 32 kHz`
  },
  precond: {
    id: "pre_cond",
    label: "Pre-Cond",
    stage: "FILTER",
    title_it: "Pre-conditioning\n(filtro + headroom)",
    title_en: "Pre-conditioning\n(filter + headroom)",
    desc_it: `Prepara il segnale per la fase di restauro attraverso una standardizzazione tecnica conservativa.

**Metodo:** filtraggio e gain staging

**Elaborazione:**
• High-pass a 25 Hz per ridurre DC e sub-rumble, liberando headroom
• Filtraggio a fase lineare per evitare shift temporali
• Gain staging a circa −3 dBFS peak per condizioni stabili

**Output:** mono, 32 kHz`,
    desc_en: `Prepares the signal for restoration through conservative technical standardization.

**Method:** filtering and gain staging

**Processing:**
• 25 Hz high-pass to reduce DC and sub-rumble, freeing headroom
• Zero-phase filtering to avoid timing shifts
• Gain staging to about −3 dBFS peak for stable conditions

**Output:** mono, 32 kHz`
  },
  apollo: {
    id: "apollo",
    label: "Apollo",
    stage: "RESTORE",
    title_it: "Restauro\n(Apollo)",
    title_en: "Restoration\n(Apollo)",
    desc_it: `Riduce artefatti e "grana" a basso livello senza colorazioni creative, preparando l'audio per l'upscaling.

**Modello:** Apollo (checkpoint "uni")

**Elaborazione:**
• Inferenza a blocchi con overlap per limitare discontinuità tra segmenti
• Pulizia del fondo e stabilizzazione
• Preservazione di dinamica, transienti e bilanciamento spettrale

**Output:** mono, 44.1 kHz`,
    desc_en: `Reduces low-level artifacts and grain without creative coloration, preparing audio for upscaling.

**Model:** Apollo ("uni" checkpoint)

**Processing:**
• Inference in chunks with overlap to minimize seams between segments
• Background cleanup and stabilization
• Preserves dynamics, transients, and spectral balance

**Output:** mono, 44.1 kHz`
  },
  audiosr: {
    id: "audiosr",
    label: "AudioSR",
    stage: "UPSCALE",
    title_it: "Upscaling / super-resolution\n(AudioSR)",
    title_en: "Upscaling / super-resolution\n(AudioSR)",
    desc_it: `Esegue un'estensione di banda per aggiungere contenuto in alta frequenza.

**Modello:** AudioSR (versatile audio super-resolution)

**Elaborazione:**
• Lavora su finestre temporali con overlap e crossfade per ridurre artefatti ai bordi
• Parametri che bilanciano fedeltà, tempo di calcolo e intensità della ricostruzione
• Normalizzazione sul picco per un livello pratico

**Output:** mono, 48 kHz`,
    desc_en: `Performs bandwidth extension to add high-frequency content.

**Model:** AudioSR (versatile audio super-resolution)

**Processing:**
• Runs in time windows with overlap and crossfade to reduce block-boundary artifacts
• Parameters balance fidelity, compute time, and reconstruction intensity
• Peak normalization for a practical level

**Output:** mono, 48 kHz`
  },
  maest: {
    id: "maest",
    label: "MAEST",
    stage: "PROFILE",
    title_it: "Profilazione di stile\n(Discogs MAEST)",
    title_en: "Style profiling\n(Discogs MAEST)",
    desc_it: `Analizza il contenuto musicale per estrarre un profilo stilistico. Questo step non modifica l'audio.

**Modello:** MAEST (pre-addestrato su tassonomia Discogs)

**Elaborazione:**
• Stima una distribuzione di probabilità sugli stili musicali
• Estrae segmenti da 10 secondi (alta energia, distribuiti nel tempo)
• Aggrega i risultati per maggiore stabilità statistica

**Output:** profilo stile con indicatori di confidenza (entropia e margine) per guidare lo stereo`,
    desc_en: `Analyzes musical content to extract a stylistic profile. This step does not modify the audio.

**Model:** MAEST (pre-trained on Discogs taxonomy)

**Processing:**
• Estimates a probability distribution over musical styles
• Extracts 10-second segments (high-energy, spread across track)
• Aggregates results for statistical stability

**Output:** style profile with confidence indicators (entropy and margin) to guide stereo processing`
  },
  stereoize: {
    id: "stereoize",
    label: "Stereoize",
    stage: "SEPARATE",
    title_it: "Stereo synthesis mono-safe\n(Mid/Side)",
    title_en: "Mono-safe stereo synthesis\n(Mid/Side)",
    desc_it: `Crea un'immagine stereo credibile partendo dal mono, mantenendo la compatibilità mono.

**Metodo:** elaborazione Mid/Side

**Elaborazione:**
• Mid: preserva il segnale originale intatto
• Side: decorrelazione controllata tramite cascata all-pass e micro-delay
• High-pass sul Side per centrare le basse frequenze
• Attenuazione sui transienti per mantenere gli attacchi centrati
• Limiti di sicurezza su correlazione e picchi

**Output:** stereo, 48 kHz (premaster a −3 dBFS peak)`,
    desc_en: `Creates a believable stereo image from mono while preserving mono compatibility.

**Method:** Mid/Side processing

**Processing:**
• Mid: preserves original signal intact
• Side: controlled decorrelation via all-pass cascade and micro-delay
• High-pass on Side to center low frequencies
• Transient attenuation to keep attacks centered
• Safety limits on correlation and peaks

**Output:** stereo, 48 kHz (premaster at −3 dBFS peak)`
  },
  master: {
    id: "master",
    label: "Master",
    stage: "FINAL",
    title_it: "Master finale e normalizzazione\n(loudness-target)",
    title_en: "Final master and normalization\n(loudness-target)",
    desc_it: `Conclude la catena con un mastering orientato alla pubblicazione su piattaforme streaming.

**Metodo:** FFmpeg loudnorm (due passaggi)

**Elaborazione:**
• Passaggio 1: misura loudness integrata, true-peak e range dinamico
• Passaggio 2: applica correzione basata sui valori misurati (risultato ripetibile)
• Target di circa −14 LUFS con picchi controllati
• Rifinitura finale solo entro margini di sicurezza sui picchi

**Output:** stereo, 48 kHz (master "safe" per distribuzione)`,
    desc_en: `Finalizes the chain with publication-oriented mastering for streaming platforms.

**Method:** FFmpeg loudnorm (two passes)

**Processing:**
• Pass 1: measures integrated loudness, true-peak, and dynamic range
• Pass 2: applies correction based on measured values (repeatable result)
• Target of around −14 LUFS with controlled peaks
• Final adjustments only within peak safety margins

**Output:** stereo, 48 kHz ("safe" master for distribution)`
  }
};

// Get step output specs based on step key
export function getStepOutputSpecs(stepKey: string): { channels: 1 | 2; sampleRate: number } {
  // musicgen, precond, apollo = mono 32kHz
  // audiosr = mono 48kHz (upscaled)
  // stereoize = stereo 48kHz
  // master = stereo 48kHz
  switch (stepKey) {
    case 'musicgen':
    case 'precond':
      return { channels: 1, sampleRate: 32000 };
    case 'apollo':
      return { channels: 1, sampleRate: 44100 };
    case 'audiosr':
    case 'maest':
      return { channels: 1, sampleRate: 48000 };
    case 'stereoize':
    case 'master':
      return { channels: 2, sampleRate: 48000 };
    default:
      return { channels: 1, sampleRate: 32000 };
  }
}

export function getStepDescription(stepKey: string, language: Language): { title: string; description: string; label: string } {
  const desc = STEP_DESCRIPTIONS[stepKey];
  if (!desc) {
    return { title: stepKey, description: '', label: stepKey };
  }
  return {
    title: language === 'it' ? desc.title_it : desc.title_en,
    description: language === 'it' ? desc.desc_it : desc.desc_en,
    label: desc.label
  };
}
