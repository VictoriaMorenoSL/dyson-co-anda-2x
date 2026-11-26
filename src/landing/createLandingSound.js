import heroSource from '../../assets/audio/audio_hero.mp3?url';
import coandaSource from '../../assets/audio/audio_coanda.mp3?url';
import { createBackgroundAudio } from './createBackgroundAudio.js';

const COANDA_TRANSITION = { source: coandaSource, volume: 0.68, attack: 0.15, decay: 0.45, offset: 0.5, duration: 2.2 };
const EFFECTS = {
  hero: { source: heroSource, volume: 0.86, attack: 0.15, decay: 0.25 },
  coanda: COANDA_TRANSITION,
  zoom: COANDA_TRANSITION,
  button: { source: coandaSource, volume: 0.48, attack: 0.045, decay: 0.22, offset: 1.45, duration: 0.55 },
};
const RELEASE = 0.025;

export function createLandingSound(toggle) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!toggle || !AudioContext) {
    return { play() {}, stop() {}, setVideoOpen() {}, destroy() {} };
  }

  let context;
  let output;
  let background;
  let pending;
  let voice;
  let releaseUntil = 0;
  let enabled = false;
  const buffers = new Map();
  const openVideos = new Set();
  toggle.hidden = false;

  function setEnabled(next) {
    enabled = next;
    toggle.setAttribute('aria-pressed', String(enabled));
  }

  function syncBackground(immediate = false) {
    background?.setPlaying(enabled && openVideos.size === 0, immediate);
  }

  function releaseVoice(immediately = false) {
    if (!voice) return;
    const now = context.currentTime;
    const stopAt = immediately || voice.startAt > now ? now : now + RELEASE;
    if (stopAt > now) voice.gain.gain.setTargetAtTime(0, now, RELEASE / 4);
    voice.source.stop(stopAt);
    releaseUntil = Math.max(releaseUntil, stopAt);
    voice = undefined;
  }

  function loadEffect(kind) {
    const { source } = EFFECTS[kind];
    if (!buffers.has(source)) {
      const audioContext = context;
      const buffer = fetch(source)
        .then((response) => {
          if (!response.ok) throw new Error(`Audio request failed: ${response.status}`);
          return response.arrayBuffer();
        })
        .then((audioData) => audioContext.decodeAudioData(audioData))
        .catch(() => {
          buffers.delete(source);
          return null;
        });
      buffers.set(source, buffer);
    }
    return buffers.get(source);
  }

  function handleToggle() {
    setEnabled(!enabled);
    if (!enabled) {
      pending = undefined;
      releaseVoice();
      syncBackground();
      return;
    }

    try {
      if (!context) {
        context = new AudioContext();
        output = context.createGain();
        output.gain.value = Number(openVideos.size === 0);
        output.connect(context.destination);
      }
      context.resume().catch(() => {
        if (context && context.state !== 'running') {
          setEnabled(false);
          syncBackground();
        }
      });
      if (!background && typeof context.createMediaElementSource === 'function') {
        background = createBackgroundAudio(context);
      }
      syncBackground();
      Object.keys(EFFECTS).forEach((kind) => loadEffect(kind));
    } catch {
      setEnabled(false);
      syncBackground();
    }
  }

  function canPlay() {
    return enabled && !openVideos.size && context?.state === 'running';
  }

  async function play(kind, stillRelevant = () => true) {
    if (!canPlay()) return;
    const request = { kind };
    pending = request;
    const buffer = await loadEffect(kind);
    if (pending !== request || !buffer || !canPlay() || !stillRelevant()) return;
    pending = undefined;
    releaseVoice();

    const source = context.createBufferSource();
    const gain = context.createGain();
    const envelope = context.createGain();
    const startAt = Math.max(context.currentTime, releaseUntil);
    const effect = EFFECTS[kind];
    const offset = Math.min(effect.offset ?? 0, buffer.duration);
    const available = buffer.duration - offset;
    const duration = Math.min(effect.duration ?? available, available);
    const endAt = startAt + duration;
    source.buffer = buffer;

    envelope.gain.setValueAtTime(0, startAt);
    envelope.gain.linearRampToValueAtTime(effect.volume, startAt + Math.min(effect.attack, duration / 2));
    envelope.gain.setValueAtTime(effect.volume, endAt - Math.min(effect.decay, duration / 2));
    envelope.gain.linearRampToValueAtTime(0, endAt);
    source.connect(envelope).connect(gain).connect(output);

    const nextVoice = { source, gain, startAt, kind };
    voice = nextVoice;
    source.onended = () => {
      if (voice === nextVoice) voice = undefined;
      source.disconnect();
      envelope.disconnect();
      gain.disconnect();
    };
    source.start(startAt, offset, duration);
  }

  toggle.addEventListener('click', handleToggle);

  return {
    play,
    stop(kind) {
      if (pending?.kind === kind) pending = undefined;
      if (voice?.kind === kind) releaseVoice();
    },
    setVideoOpen(video, open) {
      if (open) {
        openVideos.add(video);
        pending = undefined;
        releaseVoice(true);
      } else {
        openVideos.delete(video);
      }
      if (output) output.gain.value = Number(openVideos.size === 0);
      // With reduced motion, the video can start in the same frame as the modal.
      syncBackground(open && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    },
    destroy() {
      toggle.removeEventListener('click', handleToggle);
      setEnabled(false);
      pending = undefined;
      releaseVoice(true);
      background?.destroy();
      if (context && context.state !== 'closed') context.close().catch(() => {});
      context = undefined;
    },
  };
}
