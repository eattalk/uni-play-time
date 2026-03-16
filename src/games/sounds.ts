// Web Audio API sound effects for FlappyBird game
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioCtx;
}

// iOS/Android: AudioContext는 유저 터치 이후에만 resume 가능
export function unlockAudio() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  // 무음 버퍼 재생으로 잠금 해제 (iOS Safari 전용)
  const buf = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
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
// 몽환적인 ambient 스타일 배경음악 (Web Audio API 순수 합성)

let bgmNodes: { gain: GainNode; oscs: OscillatorNode[] } | null = null;
let bgmLoopTimer: ReturnType<typeof setTimeout> | null = null;

// 멜로디: 느리고 몽환적인 minor 분위기
const BGM_TEMPO = 0.22; // 느린 템포
const BGM_NOTES = [
  // A minor 기반 드리미한 멜로디
  440, 0, 523, 0, 494, 0, 440, 0,
  392, 0, 440, 0, 523, 0, 494, 0,
  440, 0, 392, 0, 349, 0, 392, 0,
  440, 523, 0, 440, 392, 0, 349, 0,
];
const BGM_BASS = [
  110, 0, 0, 0, 131, 0, 0, 0,
  110, 0, 0, 0, 98,  0, 0, 0,
  87,  0, 0, 0, 98,  0, 0, 0,
  110, 0, 0, 0, 98,  0, 87, 0,
];

function scheduleBgmLoop(masterGain: GainNode, startTime: number, volume: number) {
  const ctx = getCtx();
  const oscs: OscillatorNode[] = [];
  const totalDur = BGM_NOTES.length * BGM_TEMPO;

  // 부드러운 멜로디 (sine파 — 자극 없이 편안한 음색)
  BGM_NOTES.forEach((freq, i) => {
    if (freq === 0) return;
    const t = startTime + i * BGM_TEMPO;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(masterGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume * 0.12, t + 0.04);
    g.gain.setValueAtTime(volume * 0.10, t + BGM_TEMPO * 0.7);
    g.gain.linearRampToValueAtTime(0, t + BGM_TEMPO * 1.1);
    osc.start(t);
    osc.stop(t + BGM_TEMPO * 1.2);
    oscs.push(osc);

    // 한 옥타브 아래 화음 (triangle — 따뜻한 배음)
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.connect(g2); g2.connect(masterGain);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 0.5, t);
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(volume * 0.05, t + 0.06);
    g2.gain.setValueAtTime(volume * 0.04, t + BGM_TEMPO * 0.6);
    g2.gain.linearRampToValueAtTime(0, t + BGM_TEMPO * 1.0);
    osc2.start(t);
    osc2.stop(t + BGM_TEMPO * 1.1);
    oscs.push(osc2);
  });

  // 부드러운 베이스 패드 (sine — 두꺼운 저음)
  BGM_BASS.forEach((freq, i) => {
    if (freq === 0) return;
    const t = startTime + i * BGM_TEMPO;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(masterGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume * 0.08, t + 0.08);
    g.gain.setValueAtTime(volume * 0.07, t + BGM_TEMPO * 0.8);
    g.gain.linearRampToValueAtTime(0, t + BGM_TEMPO * 1.3);
    osc.start(t);
    osc.stop(t + BGM_TEMPO * 1.4);
    oscs.push(osc);
  });

  // 고음 shimmer (sine — 아주 작은 반짝임)
  for (let i = 0; i < BGM_NOTES.length; i += 4) {
    const freq = BGM_NOTES[i];
    if (!freq) continue;
    const t = startTime + i * BGM_TEMPO;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(masterGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 2, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume * 0.03, t + 0.05);
    g.gain.linearRampToValueAtTime(0, t + BGM_TEMPO * 2);
    osc.start(t);
    osc.stop(t + BGM_TEMPO * 2);
    oscs.push(osc);
  }

  return { oscs, totalDur };
}

export function startBgm(volume = 0.3) {
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
