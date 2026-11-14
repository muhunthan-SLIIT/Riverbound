// Plays game sounds. Sound is OFF by default and only starts after the player turns it on.
// 1st choice: the CC0 sound from Freesound (loaded through our backend's /api/sounds list).
// Fallback: a short beep made by the browser's built-in Web Audio API (no download, no key).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SoundDTO, SoundKey } from '@riverbound/shared';
import { soundApi } from '../services/gameApi.ts';

const STORAGE_KEY = 'riverbound.sound';
const AUDIO_KEY = 'riverbound.audio'; // volumes and music (Settings page)

export type AudioSettings = { effectsVolume: number; musicOn: boolean; musicVolume: number };
const DEFAULT_AUDIO: AudioSettings = { effectsVolume: 70, musicOn: false, musicVolume: 50 };

const clampVolume = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : fallback;

function readAudio(): AudioSettings {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(AUDIO_KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return DEFAULT_AUDIO;
    const r = raw as Partial<AudioSettings>;
    return {
      effectsVolume: clampVolume(r.effectsVolume, DEFAULT_AUDIO.effectsVolume),
      musicOn: r.musicOn === true,
      musicVolume: clampVolume(r.musicVolume, DEFAULT_AUDIO.musicVolume),
    };
  } catch {
    return DEFAULT_AUDIO;
  }
}

const FALLBACK_TONES: Record<SoundKey, { freq: number; ms: number }> = {
  button: { freq: 660, ms: 60 },
  catch: { freq: 520, ms: 140 },
  feed_correct: { freq: 880, ms: 220 },
  feed_wrong: { freq: 220, ms: 220 },
  coins: { freq: 990, ms: 120 },
  purchase: { freq: 740, ms: 160 },
  heart_lost: { freq: 160, ms: 300 },
  crossing_clear: { freq: 1046, ms: 260 },
  rescue: { freq: 784, ms: 400 },
  river_ambience: { freq: 0, ms: 0 }, // no beep for background ambience
};

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

let soundListPromise: Promise<SoundDTO[]> | null = null;
function loadSoundList(): Promise<SoundDTO[]> {
  soundListPromise ??= soundApi
    .list()
    .then((r) => r.sounds)
    .catch(() => []); // if the backend has no sounds, we simply use fallback tones
  return soundListPromise;
}

/** The sound logic. Use it through <SoundProvider> and useSound() so every page shares one setting. */
export function useSoundState() {
  const [enabled, setEnabledState] = useState<boolean>(readEnabled);
  const [audio, setAudioState] = useState<AudioSettings>(readAudio);
  const [soundsLoaded, setSoundsLoaded] = useState(false);
  const sounds = useRef<Map<string, SoundDTO>>(new Map());
  const audioContext = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled && !audio.musicOn) return;
    void loadSoundList().then((list) => {
      sounds.current = new Map(list.map((s) => [s.key, s]));
      setSoundsLoaded(true);
    });
  }, [enabled, audio.musicOn]);

  // Background music: the river ambience loops quietly while music is on.
  // There is no beep fallback for music: without the Freesound ambience there is simply no music.
  const ambienceUrl = soundsLoaded ? sounds.current.get('river_ambience')?.url : undefined;
  useEffect(() => {
    if (!audio.musicOn || !ambienceUrl) return;
    const track = new Audio(ambienceUrl);
    track.loop = true;
    track.volume = (audio.musicVolume / 100) * 0.5;
    track.play().catch(() => undefined); // browsers may wait for the next click; that is fine
    return () => track.pause();
  }, [audio.musicOn, audio.musicVolume, ambienceUrl]);

  /** Saves volumes and music on/off (Settings page). */
  const setAudio = useCallback((next: AudioSettings) => {
    const clean: AudioSettings = {
      effectsVolume: clampVolume(next.effectsVolume, DEFAULT_AUDIO.effectsVolume),
      musicOn: next.musicOn,
      musicVolume: clampVolume(next.musicVolume, DEFAULT_AUDIO.musicVolume),
    };
    setAudioState(clean);
    try {
      localStorage.setItem(AUDIO_KEY, JSON.stringify(clean));
    } catch {
      /* storage unavailable: the setting lasts for this visit only */
    }
  }, []);

  const beepRef = useRef<(key: SoundKey) => void>(() => undefined);

  const setEnabled = useCallback((on: boolean) => {
    setEnabledState(on);
    try {
      localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    } catch {
      /* storage can be unavailable; the setting then lasts for this visit only */
    }
    // A short click confirms sound is on. It runs inside the click, so browsers allow audio.
    if (on) beepRef.current('button');
  }, []);

  const volumeRef = useRef(audio.effectsVolume / 100);
  volumeRef.current = audio.effectsVolume / 100;

  const beep = useCallback((key: SoundKey) => {
    const tone = FALLBACK_TONES[key];
    if (!tone.freq || volumeRef.current === 0) return;
    const ctx = (audioContext.current ??= new AudioContext());
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = tone.freq;
    gain.gain.setValueAtTime(0.1 * volumeRef.current, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + tone.ms / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + tone.ms / 1000);
  }, []);
  beepRef.current = beep;

  const play = useCallback(
    (key: SoundKey) => {
      if (!enabled) return;
      const sound = sounds.current.get(key);
      if (!sound) return beep(key);
      const clip = new Audio(sound.url);
      clip.volume = 0.8 * volumeRef.current;
      clip.play().catch(() => beep(key));
    },
    [enabled, beep],
  );

  return { enabled, setEnabled, play, audio, setAudio };
}

export type SoundControls = ReturnType<typeof useSoundState>;
