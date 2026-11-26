import backgroundSource from '../../assets/audio/audio-fondo.mp3?url';

const AMBIENT_VOLUME = 0.12;
const PAUSE_FADE_MS = 250;

export function createBackgroundAudio(context) {
  const track = new Audio();
  track.preload = 'none';
  track.loop = true;
  track.src = backgroundSource;

  const source = context.createMediaElementSource(track);
  const gain = context.createGain();
  gain.gain.value = 0;
  source.connect(gain).connect(context.destination);

  let playing = false;
  let pauseTimer;

  function pause() {
    gain.gain.setValueAtTime(0, context.currentTime);
    track.pause();
  }

  return {
    setPlaying(next, immediate = false) {
      if (playing === next && !immediate) return;
      playing = next;
      window.clearTimeout(pauseTimer);
      const now = context.currentTime;
      gain.gain.cancelScheduledValues(now);

      if (playing) {
        // The first play call runs directly in the sound button's click handler.
        track.play().catch(() => {});
        gain.gain.setTargetAtTime(AMBIENT_VOLUME, now, 0.09);
      } else if (immediate) {
        pause();
      } else {
        gain.gain.setTargetAtTime(0, now, 0.05);
        pauseTimer = window.setTimeout(pause, PAUSE_FADE_MS);
      }
    },
    destroy() {
      window.clearTimeout(pauseTimer);
      track.pause();
      track.removeAttribute('src');
      track.load();
      source.disconnect();
      gain.disconnect();
    },
  };
}
