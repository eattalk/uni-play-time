// Web Audio API sound effects for FlappyBird game
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playFlapSound() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
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

  // 1. 철컥 - metallic click (high freq noise burst)
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

  // 2. 쿵 - mechanical slam
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

  // 3. Power-up rising tone
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

  // 4. Sparkle finish
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
