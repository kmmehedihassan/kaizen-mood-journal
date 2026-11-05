// src/lib/ambient.ts
"use client";

// Procedurally generated ambient soundscapes (Web Audio API). Nothing to
// download or license, and they loop seamlessly.

export type Soundscape = "off" | "rain" | "waves" | "drone";

export const SOUNDSCAPES: { id: Soundscape; label: string; emoji: string }[] = [
  { id: "off", label: "Silence", emoji: "🔇" },
  { id: "rain", label: "Rain", emoji: "🌧️" },
  { id: "waves", label: "Waves", emoji: "🌊" },
  { id: "drone", label: "Warm tone", emoji: "🎐" },
];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let nodes: AudioNode[] = [];
let current: Soundscape = "off";

function noiseBuffer(ac: AudioContext, kind: "white" | "brown", seconds = 4) {
  const len = ac.sampleRate * seconds;
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      if (kind === "white") data[i] = white;
      else {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
    }
  }
  return buf;
}

function loopSource(ac: AudioContext, buf: AudioBuffer) {
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

function build(ac: AudioContext, out: AudioNode, kind: Exclude<Soundscape, "off">): AudioNode[] {
  const made: AudioNode[] = [];
  const track = <T extends AudioNode>(n: T) => (made.push(n), n);

  if (kind === "rain") {
    const src = track(loopSource(ac, noiseBuffer(ac, "white")));
    const hp = track(new BiquadFilterNode(ac, { type: "highpass", frequency: 500 }));
    const lp = track(new BiquadFilterNode(ac, { type: "lowpass", frequency: 5500 }));
    const g = track(new GainNode(ac, { gain: 0.22 }));
    src.connect(hp).connect(lp).connect(g).connect(out);
    // a gentle low rumble underneath
    const rumble = track(loopSource(ac, noiseBuffer(ac, "brown")));
    const rg = track(new GainNode(ac, { gain: 0.25 }));
    rumble.connect(rg).connect(out);
    (src as AudioBufferSourceNode).start();
    (rumble as AudioBufferSourceNode).start();
  }

  if (kind === "waves") {
    const src = track(loopSource(ac, noiseBuffer(ac, "brown", 6)));
    const lp = track(new BiquadFilterNode(ac, { type: "lowpass", frequency: 700, Q: 0.3 }));
    const swell = track(new GainNode(ac, { gain: 0.35 }));
    // ~9-second swell, like waves rolling in and out
    const lfo = track(new OscillatorNode(ac, { type: "sine", frequency: 0.11 }));
    const depth = track(new GainNode(ac, { gain: 0.3 }));
    lfo.connect(depth).connect(swell.gain);
    const lfo2 = track(new OscillatorNode(ac, { type: "sine", frequency: 0.11 }));
    const fdepth = track(new GainNode(ac, { gain: 400 }));
    lfo2.connect(fdepth).connect(lp.frequency);
    src.connect(lp).connect(swell).connect(out);
    (src as AudioBufferSourceNode).start();
    (lfo as OscillatorNode).start();
    (lfo2 as OscillatorNode).start();
  }

  if (kind === "drone") {
    const lp = track(new BiquadFilterNode(ac, { type: "lowpass", frequency: 900 }));
    const g = track(new GainNode(ac, { gain: 0.09 }));
    lp.connect(g).connect(out);
    // A2, E3, A3, C#4 — a soft open A-major colour, slightly detuned for warmth
    for (const [f, d] of [[110, -4], [164.81, 3], [220, -2], [277.18, 5]]) {
      const o = track(new OscillatorNode(ac, { type: "sine", frequency: f, detune: d }));
      const og = track(new GainNode(ac, { gain: f < 150 ? 0.7 : 0.4 }));
      const trem = track(new OscillatorNode(ac, { type: "sine", frequency: 0.05 + Math.random() * 0.1 }));
      const td = track(new GainNode(ac, { gain: 0.25 }));
      trem.connect(td).connect(og.gain);
      o.connect(og).connect(lp);
      (o as OscillatorNode).start();
      (trem as OscillatorNode).start();
    }
  }
  return made;
}

function teardown() {
  for (const n of nodes) {
    try {
      (n as AudioScheduledSourceNode).stop?.();
    } catch {}
    n.disconnect();
  }
  nodes = [];
}

/** Switch soundscape with a short crossfade. Must be called from a user gesture the first time. */
export async function playSoundscape(kind: Soundscape, volume: number) {
  if (kind === "off") return stopSoundscape();
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = new GainNode(ctx, { gain: 0 });
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") await ctx.resume();
  if (kind !== current) {
    master!.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    await new Promise((r) => setTimeout(r, 250));
    teardown();
    nodes = build(ctx, master!, kind);
    current = kind;
  }
  master!.gain.setTargetAtTime(volume, ctx.currentTime, 0.4);
}

export function setSoundscapeVolume(volume: number) {
  if (ctx && master && current !== "off") master.gain.setTargetAtTime(volume, ctx.currentTime, 0.1);
}

export async function stopSoundscape() {
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
  await new Promise((r) => setTimeout(r, 600));
  teardown();
  current = "off";
  await ctx.suspend().catch(() => {});
}
