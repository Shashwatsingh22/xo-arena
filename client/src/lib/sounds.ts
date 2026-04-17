// Web Audio API sound generator — no external files needed
const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

function playTone(freq: number, duration: number, type: OscillatorType = "sine", vol = 0.3) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

export function playMove() {
  playTone(600, 0.1, "sine", 0.2);
}

export function playOpponentMove() {
  playTone(400, 0.1, "sine", 0.15);
}

export function playWin() {
  setTimeout(() => playTone(523, 0.15, "square", 0.2), 0);
  setTimeout(() => playTone(659, 0.15, "square", 0.2), 150);
  setTimeout(() => playTone(784, 0.3, "square", 0.25), 300);
}

export function playLose() {
  setTimeout(() => playTone(400, 0.2, "sawtooth", 0.15), 0);
  setTimeout(() => playTone(300, 0.3, "sawtooth", 0.15), 200);
}

export function playDraw() {
  playTone(440, 0.3, "triangle", 0.15);
}

export function playMatchStart() {
  setTimeout(() => playTone(440, 0.1, "sine", 0.2), 0);
  setTimeout(() => playTone(554, 0.1, "sine", 0.2), 120);
  setTimeout(() => playTone(659, 0.15, "sine", 0.25), 240);
}

export function playClick() {
  playTone(800, 0.05, "sine", 0.1);
}

export function playCountdown() {
  playTone(880, 0.08, "square", 0.1);
}

// Resume audio context on first user interaction
export function resumeAudio() {
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}
