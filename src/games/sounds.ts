// Web Audio API sound effects for FlappyBird game
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playFlapSound(volume = 0.15) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.12);
}

export function playScoreSound() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}

export function playStarSound() {
  const ctx = getCtx();
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);
    gain.gain.setValueAtTime(0.35, ctx.currentTime + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.3);
    osc.start(ctx.currentTime + i * 0.06);
    osc.stop(ctx.currentTime + i * 0.06 + 0.3);
  });
}

export function playHitSound() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.35);
}

export function playGameOverSound() {
  const ctx = getCtx();
  const notes = [440, 370, 311, 220];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
    osc.start(ctx.currentTime + i * 0.15);
    osc.stop(ctx.currentTime + i * 0.15 + 0.4);
  });
}

export function playCountdownBeep(final = false) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(final ? 880 : 440, ctx.currentTime);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (final ? 0.4 : 0.2));
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + (final ? 0.4 : 0.2));
}

// 철컥! 변신 사운드 - 무기 장전 같은 메탈릭 사운드
export function playEvolutionSound() {
  const ctx = getCtx();

  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.connect(clickGain);
  clickGain.connect(ctx.destination);
  clickOsc.type = 'square';
  clickOsc.frequency.setValueAtTime(3000, ctx.currentTime);
  clickOsc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.03);
  clickGain.gain.setValueAtTime(0.5, ctx.currentTime);
  clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
  clickOsc.start(ctx.currentTime);
  clickOsc.stop(ctx.currentTime + 0.06);

  const slamOsc = ctx.createOscillator();
  const slamGain = ctx.createGain();
  slamOsc.connect(slamGain);
  slamGain.connect(ctx.destination);
  slamOsc.type = 'triangle';
  slamOsc.frequency.setValueAtTime(150, ctx.currentTime + 0.05);
  slamOsc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.2);
  slamGain.gain.setValueAtTime(0.4, ctx.currentTime + 0.05);
  slamGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  slamOsc.start(ctx.currentTime + 0.05);
  slamOsc.stop(ctx.currentTime + 0.25);

  const riseOsc = ctx.createOscillator();
  const riseGain = ctx.createGain();
  riseOsc.connect(riseGain);
  riseGain.connect(ctx.destination);
  riseOsc.type = 'sine';
  riseOsc.frequency.setValueAtTime(200, ctx.currentTime + 0.15);
  riseOsc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.5);
  riseGain.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
  riseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
  riseOsc.start(ctx.currentTime + 0.15);
  riseOsc.stop(ctx.currentTime + 0.55);

  const sparkOsc = ctx.createOscillator();
  const sparkGain = ctx.createGain();
  sparkOsc.connect(sparkGain);
  sparkGain.connect(ctx.destination);
  sparkOsc.type = 'sine';
  sparkOsc.frequency.setValueAtTime(1500, ctx.currentTime + 0.4);
  sparkOsc.frequency.setValueAtTime(2000, ctx.currentTime + 0.5);
  sparkGain.gain.setValueAtTime(0.2, ctx.currentTime + 0.4);
  sparkGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
  sparkOsc.start(ctx.currentTime + 0.4);
  sparkOsc.stop(ctx.currentTime + 0.65);
}

// ===== BACKGROUND MUSIC =====
// 레트로 8비트 루프 배경음악 (Web Audio API 순수 합성)

let bgmNodes: { gain: GainNode; oscs: OscillatorNode[] } | null = null;
let bgmLoopTimer: ReturnType<typeof setTimeout> | null = null;

// 멜로디: C major 펜타토닉 기반 8비트 루프
const BGM_TEMPO = 0.13; // 한 음표 길이 (초)
const BGM_NOTES = [
  // 메인 테마 멜로디
  523, 659, 784, 659, 523, 659, 880, 784,
  659, 523, 392, 440, 523, 659, 523, 0,
  659, 784, 880, 784, 659, 784, 1047, 880,
  784, 659, 523, 587, 659, 523, 392, 0,
];
const BGM_BASS = [
  130, 0, 196, 0, 130, 0, 196, 0,
  130, 0, 174, 0, 130, 0, 174, 0,
  165, 0, 220, 0, 165, 0, 220, 0,
  130, 0, 196, 0, 130, 0, 196, 0,
];

function scheduleBgmLoop(masterGain: GainNode, startTime: number, volume: number) {
  const ctx = getCtx();
  const oscs: OscillatorNode[] = [];
  const totalDur = BGM_NOTES.length * BGM_TEMPO;

  BGM_NOTES.forEach((freq, i) => {
    if (freq === 0) return;
    const t = startTime + i * BGM_TEMPO;
    // Lead synth
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(masterGain);
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume * 0.18, t + 0.01);
    g.gain.setValueAtTime(volume * 0.18, t + BGM_TEMPO * 0.7);
    g.gain.linearRampToValueAtTime(0, t + BGM_TEMPO * 0.9);
    osc.start(t);
    osc.stop(t + BGM_TEMPO);
    oscs.push(osc);

    // Harmony (fifth above, quieter)
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.connect(g2); g2.connect(masterGain);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.5, t);
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(volume * 0.06, t + 0.015);
    g2.gain.setValueAtTime(volume * 0.06, t + BGM_TEMPO * 0.6);
    g2.gain.linearRampToValueAtTime(0, t + BGM_TEMPO * 0.85);
    osc2.start(t);
    osc2.stop(t + BGM_TEMPO);
    oscs.push(osc2);
  });

  // Bass line
  BGM_BASS.forEach((freq, i) => {
    if (freq === 0) return;
    const t = startTime + i * BGM_TEMPO;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(masterGain);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume * 0.12, t + 0.02);
    g.gain.setValueAtTime(volume * 0.12, t + BGM_TEMPO * 0.5);
    g.gain.linearRampToValueAtTime(0, t + BGM_TEMPO * 0.8);
    osc.start(t);
    osc.stop(t + BGM_TEMPO);
    oscs.push(osc);
  });

  // Percussion: kick + hihat
  for (let i = 0; i < BGM_NOTES.length; i++) {
    const t = startTime + i * BGM_TEMPO;
    if (i % 8 === 0 || i % 8 === 4) {
      // Kick
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(masterGain);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      g.gain.setValueAtTime(volume * 0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.start(t); osc.stop(t + 0.12);
      oscs.push(osc);
    }
    if (i % 4 === 2) {
      // Snare (noise burst)
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1);
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      src.buffer = buf;
      src.connect(g); g.connect(masterGain);
      g.gain.setValueAtTime(volume * 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      src.start(t);
    }
    if (i % 2 === 1) {
      // Hi-hat
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1);
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      src.buffer = buf;
      src.connect(g); g.connect(masterGain);
      g.gain.setValueAtTime(volume * 0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      src.start(t);
    }
  }

  return { oscs, totalDur };
}

export function startBgm(volume = 1.0) {
  stopBgm();
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume, ctx.currentTime);
  masterGain.connect(ctx.destination);

  const oscs: OscillatorNode[] = [];
  bgmNodes = { gain: masterGain, oscs };

  const loop = () => {
    const { totalDur } = scheduleBgmLoop(masterGain, ctx.currentTime, volume);
    bgmLoopTimer = setTimeout(loop, (totalDur - 0.05) * 1000);
  };
  loop();
}

export function stopBgm() {
  if (bgmLoopTimer) { clearTimeout(bgmLoopTimer); bgmLoopTimer = null; }
  if (bgmNodes) {
    try {
      bgmNodes.gain.gain.setValueAtTime(bgmNodes.gain.gain.value, getCtx().currentTime);
      bgmNodes.gain.gain.linearRampToValueAtTime(0, getCtx().currentTime + 0.3);
    } catch {}
    bgmNodes = null;
  }
}

export function setBgmVolume(v: number) {
  if (bgmNodes) {
    bgmNodes.gain.gain.linearRampToValueAtTime(v, getCtx().currentTime + 0.5);
  }
}
