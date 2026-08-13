// Web Audio API sound engine — synthesizes all game sounds, no external files.

let ctx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function setSoundEnabled(v: boolean) {
  enabled = v;
  try { localStorage.setItem("ascend-sound", v ? "on" : "off"); } catch {}
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return enabled;
  try { const s = localStorage.getItem("ascend-sound"); if (s !== null) enabled = s !== "off"; } catch {}
  return enabled;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay: number, slideTo?: number) {
  const c = getCtx(); if (!c || !enabled) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain); gain.connect(c.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}

function noise(dur: number, vol: number, delay: number) {
  const c = getCtx(); if (!c || !enabled) return;
  const t0 = c.currentTime + delay;
  const bufferSize = c.sampleRate * dur;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = c.createBufferSource(); src.buffer = buffer;
  const gain = c.createGain(); gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  const filter = c.createBiquadFilter(); filter.type = "highpass"; filter.frequency.value = 800;
  src.connect(filter); filter.connect(gain); gain.connect(c.destination);
  src.start(t0);
}

export const sounds = {
  tap: () => tone(420, 0.06, "sine", 0.08, 0),
  buttonPress: () => { tone(380, 0.05, "sine", 0.1, 0); tone(520, 0.04, "sine", 0.06, 0.03); },
  pageTransition: () => { tone(300, 0.12, "sine", 0.06, 0, 500); },
  questComplete: () => {
    tone(523, 0.1, "triangle", 0.12, 0);
    tone(659, 0.1, "triangle", 0.12, 0.08);
    tone(784, 0.15, "triangle", 0.14, 0.16);
    noise(0.08, 0.04, 0);
  },
  xpGain: () => { tone(880, 0.08, "sine", 0.1, 0, 1200); tone(1320, 0.06, "sine", 0.06, 0.04); },
  progressFill: () => tone(440, 0.2, "sine", 0.04, 0, 660),
  achievement: () => {
    tone(659, 0.12, "triangle", 0.12, 0);
    tone(831, 0.12, "triangle", 0.12, 0.1);
    tone(988, 0.2, "triangle", 0.14, 0.2);
    tone(1319, 0.3, "sine", 0.1, 0.3);
  },
  levelUp: () => {
    tone(523, 0.1, "triangle", 0.12, 0);
    tone(659, 0.1, "triangle", 0.12, 0.08);
    tone(784, 0.1, "triangle", 0.12, 0.16);
    tone(1047, 0.15, "triangle", 0.14, 0.24);
    tone(1319, 0.25, "sine", 0.12, 0.36);
    tone(1568, 0.35, "sine", 0.1, 0.48);
    noise(0.1, 0.05, 0.24);
  },
};
