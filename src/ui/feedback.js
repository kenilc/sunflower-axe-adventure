import { createGameAudio } from "../systems/audio.js";

// Toast messages, sound effects and the Sound button.
export function createFeedback({ $, state, getSoundscape }) {
  const audio = createGameAudio(getSoundscape);
  function beep(freq, duration = 0.1) {
    audio.effect(freq, duration);
  }

  function toast(t) {
    $("#toast").textContent = t;
    $("#toast").style.opacity = 1;
    state.toastUntil = performance.now() + 3200;
  }
  function updateSoundButton() {
    $("#soundLabel").textContent = state.sound ? "Sound on" : "Sound off";
    $("#sound").setAttribute("aria-pressed", String(state.sound));
    $("#sound").title = state.sound
      ? "Sound on · Click to mute"
      : "Sound off · Click to unmute";
  }
  async function setSound(value) {
    state.sound = value;
    updateSoundButton();
    try {
      await audio.setEnabled(state.sound);
    } catch {
      state.sound = false;
      await audio.setEnabled(false);
      updateSoundButton();
      toast("Audio could not start. Tap Sound to try again.");
    }
  }
  return { toast, beep, setSound, setMusicLevel: audio.setMusicLevel };
}
