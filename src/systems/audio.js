// A small original score, synthesized locally: no downloads or audio services.
export function createGameAudio(isInCave, isInFestival = () => false) {
  let ctx,
    master,
    music,
    enabled = false,
    timer = null,
    nextTime = 0,
    step = 0,
    soft = false;
  const voices = new Set();
  const beat = 60 / 96 / 2;
  // A slower, spacious pentatonic melody for the summer lantern streets.
  const festivalBeat = 60 / 68 / 2;
  const festivalMelody = [
    72,
    null,
    null,
    null,
    74,
    null,
    76,
    null,
    79,
    null,
    null,
    null,
    76,
    null,
    74,
    null,
    69,
    null,
    null,
    null,
    72,
    null,
    74,
    null,
    76,
    null,
    72,
    null,
    null,
    null,
    null,
    null,
  ];
  const festivalChords = [
    [48, 55, 62],
    [45, 52, 60],
    [41, 48, 55],
    [43, 50, 57],
  ];
  const melody = [
    76,
    null,
    79,
    76,
    74,
    null,
    72,
    null,
    76,
    79,
    81,
    null,
    79,
    76,
    74,
    null,
    72,
    null,
    76,
    77,
    79,
    null,
    77,
    76,
    74,
    null,
    71,
    74,
    79,
    null,
    74,
    null,
    76,
    79,
    84,
    null,
    83,
    79,
    76,
    null,
    77,
    null,
    81,
    79,
    77,
    76,
    72,
    null,
    74,
    77,
    79,
    null,
    83,
    81,
    79,
    74,
    76,
    null,
    74,
    72,
    null,
    null,
    null,
    null,
  ];
  const chords = [
    [48, 52, 55],
    [45, 48, 52],
    [41, 45, 48],
    [43, 47, 50],
    [48, 52, 55],
    [41, 45, 48],
    [43, 47, 50],
    [48, 52, 55],
  ];
  function init() {
    if (ctx) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error("Audio is not available in this browser.");
    ctx = new Audio();
    master = ctx.createGain();
    master.gain.value = 0.65;
    master.connect(ctx.destination);
    music = ctx.createGain();
    soft = isInFestival();
    music.gain.value = soft ? 0.21 : 0.32;
    music.connect(master);
    const delay = ctx.createDelay(1),
      feedback = ctx.createGain(),
      wet = ctx.createGain();
    delay.delayTime.value = 0.28;
    feedback.gain.value = 0.18;
    wet.gain.value = 0.22;
    music.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(master);
  }
  function tone(freq, start, duration, level, type, bus, endFrequency) {
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (endFrequency)
      o.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(level, start + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    o.connect(g);
    g.connect(bus);
    voices.add(o);
    o.onended = () => {
      voices.delete(o);
      o.disconnect();
      g.disconnect();
    };
    o.start(start);
    o.stop(start + duration + 0.03);
  }
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
  function schedule() {
    if (!enabled || document.hidden || ctx.state !== "running") return;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.04;
    while (nextTime < ctx.currentTime + 0.18) {
      const festival = isInFestival();
      if (festival !== soft) {
        soft = festival;
        step = 0;
        // Crossfade the music bus without changing sound effects or mute state.
        music.gain.cancelScheduledValues(ctx.currentTime);
        music.gain.setValueAtTime(music.gain.value, ctx.currentTime);
        music.gain.linearRampToValueAtTime(
          soft ? 0.21 : 0.32,
          ctx.currentTime + 0.8,
        );
      }
      const cave = isInCave(),
        phrase = soft ? festivalMelody : melody,
        pulse = soft ? festivalBeat : beat,
        chord = (soft ? festivalChords : chords)[Math.floor(step / 8)],
        n = phrase[step];
      if (n !== null)
        tone(
          hz(n - (cave ? 12 : 0)),
          nextTime,
          pulse * (soft ? 3.8 : 2.6),
          soft ? 0.1 : cave ? 0.13 : 0.17,
          "sine",
          music,
        );
      const arp = chord[[0, 1, 2, 1][step % 4]] + 12;
      if (!soft || step % 2 === 0)
        tone(
          hz(arp),
          nextTime,
          pulse * (soft ? 3 : 1.8),
          soft ? 0.032 : cave ? 0.05 : 0.08,
          soft ? "sine" : "triangle",
          music,
        );
      if (step % 8 === 0) {
        tone(
          hz(chord[0] - 12),
          nextTime,
          pulse * 7,
          soft ? 0.055 : 0.14,
          "sine",
          music,
        );
        if (soft)
          chord.forEach((note) =>
            tone(hz(note), nextTime, pulse * 9, 0.024, "sine", music),
          );
      }
      nextTime += pulse;
      step = (step + 1) % phrase.length;
    }
  }
  function clearVoices() {
    for (const voice of voices) {
      try {
        voice.stop();
      } catch {}
    }
    voices.clear();
  }
  function startTimer() {
    if (timer !== null) clearInterval(timer);
    schedule();
    timer = setInterval(schedule, 80);
  }
  async function setEnabled(value) {
    if (!value) {
      enabled = false;
      if (timer !== null) clearInterval(timer);
      timer = null;
      if (ctx) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(0, ctx.currentTime);
        clearVoices();
      }
      return;
    }
    init();
    enabled = true;
    await ctx.resume();
    if (!enabled) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.65, ctx.currentTime + 0.12);
    nextTime = ctx.currentTime + 0.05;
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
        freq * 0.55,
      );
  }
  document.addEventListener("visibilitychange", () => {
    if (!ctx || !enabled) return;
    if (document.hidden) {
      if (timer !== null) clearInterval(timer);
      timer = null;
      clearVoices();
      void ctx.suspend().catch(() => {});
    } else
      void ctx
        .resume()
        .then(() => {
          if (enabled) {
            nextTime = ctx.currentTime + 0.05;
            startTimer();
          }
        })
        .catch(() => {});
  });
  // Mobile browsers may require another gesture after interrupting audio.
  function unlock() {
    if (enabled && ctx?.state === "suspended" && !document.hidden)
      void ctx.resume().catch(() => {});
  }
  addEventListener("pointerdown", unlock);
  addEventListener("keydown", unlock);
  addEventListener("pagehide", () => {
    void setEnabled(false);
  });
  return { setEnabled, effect };
}
