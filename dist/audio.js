// A small original score, synthesized locally: no downloads or audio services.
export function createGameAudio(isInCave) {
  let ctx,
    master,
    music,
    enabled = false,
    timer = null,
    nextTime = 0,
    step = 0;
  const voices = new Set();
  const beat = 60 / 96 / 2;
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
    music.gain.value = 0.32;
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
      const cave = isInCave(),
        chord = chords[Math.floor(step / 8)],
        n = melody[step];
      if (n !== null)
        tone(
          hz(n - (cave ? 12 : 0)),
          nextTime,
          beat * 2.6,
          cave ? 0.13 : 0.17,
          "sine",
          music,
        );
      const arp = chord[[0, 1, 2, 1][step % 4]] + 12;
      tone(
        hz(arp),
        nextTime,
        beat * 1.8,
        cave ? 0.05 : 0.08,
        "triangle",
        music,
      );
      if (step % 8 === 0)
        tone(hz(chord[0] - 12), nextTime, beat * 7, 0.14, "sine", music);
      nextTime += beat;
      step = (step + 1) % melody.length;
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
