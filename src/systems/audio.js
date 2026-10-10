import { MUSIC_SCORES, musicScoreId } from "./music-scores.js";

// Original music synthesized locally. Each track has its own bus so melodies
// actually overlap during a crossfade; effects always use the independent master.
export function createGameAudio(getLocation = () => "garden") {
  let ctx,
    master,
    delay,
    enabled = false,
    timer = null,
    active = null;
  let generation = 0;
  const tracks = new Set(),
    voices = new Set();
  const fadeDuration = 1.8;
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // [harmonic, relative level, waveform]. Small additive voices suggest acoustic
  // instruments without samples or the sharp edges of full-volume square waves.
  const instruments = {
    piano: {
      attack: 0.012,
      partials: [
        [1, 1, "sine"],
        [2, 0.22, "sine"],
        [3, 0.08, "sine"],
      ],
    },
    guitar: {
      attack: 0.009,
      partials: [
        [1, 1, "triangle"],
        [2, 0.12, "sine"],
      ],
    },
    pluck: {
      attack: 0.006,
      partials: [
        [1, 1, "sine"],
        [2, 0.3, "sine"],
        [3, 0.12, "sine"],
      ],
    },
    bell: {
      attack: 0.008,
      partials: [
        [1, 1, "sine"],
        [2.76, 0.14, "sine"],
        [4.07, 0.05, "sine"],
      ],
    },
    flute: {
      attack: 0.09,
      partials: [
        [1, 1, "sine"],
        [2, 0.08, "sine"],
      ],
    },
    accordion: {
      attack: 0.07,
      partials: [
        [1, 1, "sine"],
        [2, 0.24, "sine"],
        [3, 0.1, "sine"],
      ],
    },
    pad: {
      attack: 0.3,
      partials: [
        [1, 1, "sine"],
        [2, 0.12, "sine"],
      ],
    },
  };

  function init() {
    if (ctx) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error("Audio is not available in this browser.");
    ctx = new Audio();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    delay = ctx.createDelay(1);
    const feedback = ctx.createGain(),
      wet = ctx.createGain();
    delay.delayTime.value = 0.3;
    feedback.gain.value = 0.16;
    wet.gain.value = 0.16;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(master);
  }

  function tone(
    freq,
    start,
    duration,
    level,
    type,
    bus,
    owner,
    attack = 0.025,
    endFrequency,
  ) {
    const oscillator = ctx.createOscillator(),
      gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, start);
    if (endFrequency)
      oscillator.frequency.exponentialRampToValueAtTime(
        endFrequency,
        start + duration,
      );
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      level,
      start + Math.min(attack, duration / 3),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(bus);
    const voice = { oscillator, gain, owner };
    voices.add(voice);
    oscillator.onended = () => {
      voices.delete(voice);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  function note(track, midi, start, duration, level, instrument) {
    const { partials, attack } = instruments[instrument];
    for (const [harmonic, weight, type] of partials)
      tone(
        hz(midi) * harmonic,
        start,
        duration,
        level * weight,
        type,
        track.bus,
        track,
        attack,
      );
  }

  function clearVoices(owner) {
    for (const voice of voices) {
      if (owner && voice.owner !== owner) continue;
      try {
        voice.oscillator.stop();
      } catch {}
      // Disconnect synchronously as well: suspended contexts defer onended.
      voice.oscillator.disconnect();
      voice.gain.disconnect();
      voices.delete(voice);
    }
  }
  function removeTrack(track) {
    clearVoices(track);
    track.bus.disconnect();
    tracks.delete(track);
  }
  function clearTracks() {
    for (const track of tracks) removeTrack(track);
    active = null;
  }

  function gainAt(track, time) {
    const progress = Math.max(
      0,
      Math.min(1, (time - track.fadeStart) / fadeDuration),
    );
    return track.fadeFrom + (track.fadeTo - track.fadeFrom) * progress;
  }
  function fade(track, target, time) {
    const current = gainAt(track, time);
    track.bus.gain.cancelScheduledValues(time);
    track.bus.gain.setValueAtTime(current, time);
    track.bus.gain.linearRampToValueAtTime(target, time + fadeDuration);
    track.fadeStart = time;
    track.fadeFrom = current;
    track.fadeTo = target;
  }
  function selectTrack() {
    const id = musicScoreId(getLocation());
    if (active?.id === id) return;
    const time = ctx.currentTime;
    if (active) {
      fade(active, 0, time);
      active.endsAt = time + fadeDuration;
    }
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.connect(master);
    bus.connect(delay);
    active = {
      id,
      score: MUSIC_SCORES[id],
      bus,
      step: 0,
      nextTime: time + 0.04,
      fadeStart: time,
      fadeFrom: 0,
      fadeTo: 0,
      endsAt: Infinity,
    };
    tracks.add(active);
    fade(active, active.score.volume, time);
  }

  function scheduleTrack(track) {
    const score = track.score,
      pulse = 60 / score.bpm / 2;
    const stepsPerBar = score.stepsPerBar ?? 8;
    if (track.nextTime < ctx.currentTime)
      track.nextTime = ctx.currentTime + 0.04;
    while (track.nextTime < Math.min(ctx.currentTime + 0.18, track.endsAt)) {
      const step = track.step,
        time = track.nextTime,
        position = step % stepsPerBar;
      const chord =
        score.chords[Math.floor(step / stepsPerBar) % score.chords.length];
      const midi = score.melody[step];
      if (midi !== null)
        note(track, midi, time, pulse * score.sustain, 0.15, score.lead);
      if (position % (score.arpEvery ?? 1) === 0) {
        const arp =
          chord[
            [0, 1, 2, 1][Math.floor(position / (score.arpEvery ?? 1)) % 4]
          ] + 12;
        note(track, arp, time, pulse * 2.5, 0.045, score.backing);
      }
      if (position === 0) {
        note(
          track,
          chord[0] - 12,
          time,
          pulse * (stepsPerBar - 0.5),
          0.075,
          "pad",
        );
        if (["pad", "flute", "accordion"].includes(score.backing))
          for (const n of chord)
            note(track, n, time, pulse * stepsPerBar, 0.02, score.backing);
      }
      track.nextTime += pulse;
      track.step = (step + 1) % score.melody.length;
    }
  }
  function schedule() {
    if (!enabled || document.hidden || ctx.state !== "running") return;
    selectTrack();
    for (const track of tracks) {
      if (ctx.currentTime >= track.endsAt) removeTrack(track);
      else scheduleTrack(track);
    }
  }
  function stopTimer() {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }
  function startTimer() {
    stopTimer();
    schedule();
    timer = setInterval(schedule, 80);
  }
  async function setEnabled(value) {
    const request = ++generation;
    enabled = Boolean(value);
    if (!enabled) {
      stopTimer();
      if (ctx) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(0, ctx.currentTime);
        clearTracks();
        clearVoices();
      }
      return;
    }
    init();
    if (document.hidden) return;
    await ctx.resume();
    if (!enabled || request !== generation || document.hidden) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.65, ctx.currentTime + 0.12);
    startTimer();
  }
  function effect(freq, duration = 0.1) {
    if (enabled && ctx?.state === "running" && !document.hidden)
      tone(
        freq,
        ctx.currentTime,
        Math.max(0.05, duration),
        0.1,
        "sine",
        master,
        null,
        0.025,
        freq * 0.55,
      );
  }
  async function resume() {
    const request = generation;
    await ctx.resume();
    if (enabled && request === generation && !document.hidden) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(0.65, ctx.currentTime);
      startTimer();
    }
  }
  document.addEventListener("visibilitychange", () => {
    if (!ctx || !enabled) return;
    if (document.hidden) {
      stopTimer();
      clearTracks();
      clearVoices();
      void ctx.suspend().catch(() => {});
    } else void resume().catch(() => {});
  });
  function unlock() {
    if (enabled && ctx?.state === "suspended" && !document.hidden)
      void resume().catch(() => {});
  }
  addEventListener("pointerdown", unlock);
  addEventListener("keydown", unlock);
  addEventListener("pagehide", () => {
    void setEnabled(false);
  });
  return { setEnabled, effect };
}
