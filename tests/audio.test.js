import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createGameAudio } from "../src/systems/audio.js";
import { JOURNEY_DESTINATIONS } from "../src/game/journey.js";

let context, handlers, location, audio;
function param(value = 0) {
  return {
    value,
    events: [],
    setValueAtTime(value, time) {
      this.events.push({ type: "set", value, time });
    },
    linearRampToValueAtTime(value, time) {
      this.events.push({ type: "linear", value, time });
    },
    exponentialRampToValueAtTime(value, time) {
      this.events.push({ type: "exponential", value, time });
    },
    cancelScheduledValues: vi.fn(),
  };
}
function node() {
  return {
    connections: [],
    connect(other) {
      this.connections.push(other);
    },
    disconnect: vi.fn(),
  };
}
class AudioContext {
  constructor() {
    context = this;
    this.currentTime = 0;
    this.state = "suspended";
    this.destination = {};
    this.gains = [];
    this.oscillators = [];
  }
  createGain() {
    const result = { ...node(), gain: param() };
    this.gains.push(result);
    return result;
  }
  createDelay() {
    return { ...node(), delayTime: param() };
  }
  createOscillator() {
    const result = {
      ...node(),
      frequency: param(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    this.oscillators.push(result);
    return result;
  }
  async resume() {
    this.state = "running";
  }
  async suspend() {
    this.state = "suspended";
  }
}
function advance(seconds) {
  context.currentTime += seconds;
  vi.advanceTimersByTime(80);
}
function trackBuses() {
  return context.gains.filter((gain) => gain.connections.length === 2);
}
function frequencySignature() {
  const start = context.oscillators[0].start.mock.calls[0][0];
  return context.oscillators.map((oscillator) => [
    oscillator.type,
    oscillator.frequency.events[0].value.toFixed(2),
    (oscillator.start.mock.calls[0][0] - start).toFixed(2),
  ]);
}
beforeEach(() => {
  vi.useFakeTimers();
  handlers = new Map();
  location = "garden";
  vi.stubGlobal("window", { AudioContext });
  vi.stubGlobal("document", {
    hidden: false,
    addEventListener: (name, callback) => handlers.set(name, callback),
  });
  vi.stubGlobal("addEventListener", (name, callback) =>
    handlers.set(name, callback),
  );
  audio = createGameAudio(() => location);
});
afterEach(async () => {
  await audio.setEnabled(false);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("all eleven actual destinations produce distinct audible phrases", async () => {
  const signatures = new Set();
  for (const { id } of JOURNEY_DESTINATIONS) {
    location = id;
    await audio.setEnabled(false);
    await audio.setEnabled(true);
    context.oscillators.length = 0;
    for (let i = 0; i < 20; i++) advance(0.25);
    expect(context.oscillators.length).toBeGreaterThan(10);
    for (const oscillator of context.oscillators) {
      expect(oscillator.frequency.events[0].value).toBeGreaterThan(0);
      expect(oscillator.stop.mock.calls[0][0]).toBeGreaterThan(
        oscillator.start.mock.calls[0][0],
      );
    }
    signatures.add(JSON.stringify(frequencySignature()));
  }
  expect(signatures.size).toBe(JOURNEY_DESTINATIONS.length);
});

test("travel overlaps tracks, fades their independent buses and preserves effects", async () => {
  await audio.setEnabled(true);
  const oldTrack = trackBuses()[0],
    master = context.gains[0];
  advance(2);
  const masterEvents = master.gain.events.length;
  const previousOscillators = context.oscillators.length;
  location = "cave";
  advance(0.08);
  const newTrack = trackBuses()[1];
  expect(oldTrack.gain.events.at(-1)).toEqual({
    type: "linear",
    value: 0,
    time: 3.88,
  });
  expect(newTrack.gain.events.at(-1).value).toBeGreaterThan(0);
  expect(oldTrack.disconnect).not.toHaveBeenCalled();
  advance(0.4);
  const scheduled = context.oscillators.slice(previousOscillators);
  expect(
    scheduled.some((o) => o.connections[0].connections[0] === oldTrack),
  ).toBe(true);
  expect(
    scheduled.some((o) => o.connections[0].connections[0] === newTrack),
  ).toBe(true);
  audio.effect(600);
  expect(context.oscillators.at(-1).connections[0].connections[0]).toBe(master);
  expect(master.gain.events).toHaveLength(masterEvents);
  advance(2);
  expect(oldTrack.disconnect).toHaveBeenCalledOnce();
  expect(newTrack.disconnect).not.toHaveBeenCalled();
});

test("rapid travel starts fading from the current gain and releases every old bus", async () => {
  await audio.setEnabled(true);
  advance(0.3);
  location = "lagoon";
  advance(0.08);
  const garden = trackBuses()[0];
  expect(garden.gain.events.at(-2).value).toBeCloseTo((0.3 * 0.38) / 1.8);
  location = "summit";
  advance(0.1);
  location = "castle";
  advance(0.1);
  advance(2);
  const buses = trackBuses();
  for (const bus of buses.slice(0, -1))
    expect(bus.disconnect).toHaveBeenCalledOnce();
  expect(buses.at(-1).disconnect).not.toHaveBeenCalled();
});

test("shops share a quiet arrangement without restarting when changing shops", async () => {
  location = "shop:bakery";
  await audio.setEnabled(true);
  const shop = trackBuses()[0];
  expect(shop.gain.events.at(-1).value).toBeLessThan(0.27);
  location = "shop:flowers";
  advance(0.4);
  expect(trackBuses()).toHaveLength(1);
  location = "village";
  advance(0.1);
  expect(trackBuses()).toHaveLength(2);
  expect(trackBuses()[1].gain.events.at(-1).value).toBe(0.27);
});

test("muting clears voices and scheduling; unmuting chooses the current place", async () => {
  await audio.setEnabled(true);
  await audio.setEnabled(false);
  const stoppedCount = context.oscillators.length;
  for (const oscillator of context.oscillators)
    expect(oscillator.disconnect).toHaveBeenCalled();
  expect(context.gains[0].gain.events.at(-1).value).toBe(0);
  advance(3);
  audio.effect(600);
  expect(context.oscillators).toHaveLength(stoppedCount);
  location = "winter";
  await audio.setEnabled(true);
  expect(trackBuses().at(-1).gain.events.at(-1).value).toBe(0.23);
  expect(context.oscillators.length).toBeGreaterThan(stoppedCount);
});

test("hidden tabs stop audio and resume in the new location", async () => {
  await audio.setEnabled(true);
  document.hidden = true;
  handlers.get("visibilitychange")();
  expect(context.state).toBe("suspended");
  const count = context.oscillators.length;
  location = "seaside";
  advance(10);
  expect(context.oscillators).toHaveLength(count);
  document.hidden = false;
  handlers.get("visibilitychange")();
  await Promise.resolve();
  expect(context.state).toBe("running");
  expect(trackBuses().at(-1).gain.events.at(-1).value).toBe(0.22);
  expect(context.oscillators.length).toBeGreaterThan(count);
});

test("a delayed audio unlock cannot unmute a later mute request", async () => {
  let finishResume;
  AudioContext.prototype.resume = vi.fn(function () {
    this.state = "running";
    return new Promise((resolve) => {
      finishResume = resolve;
    });
  });
  const pending = audio.setEnabled(true);
  await audio.setEnabled(false);
  finishResume();
  await pending;
  expect(context.oscillators).toHaveLength(0);
  expect(context.gains[0].gain.events.at(-1).value).toBe(0);
  // Restore the class method for subsequent tests.
  AudioContext.prototype.resume = async function () {
    this.state = "running";
  };
});
