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

  // 쫘란! 임팩트 타격음
  const impactOsc = ctx.createOscillator();
  const impactGain = ctx.createGain();
  impactOsc.connect(impactGain);
  impactGain.connect(ctx.destination);
  impactOsc.type = 'square';
  impactOsc.frequency.setValueAtTime(1400, ctx.currentTime);
  impactOsc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
  impactGain.gain.setValueAtTime(0.55, ctx.currentTime);
  impactGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  impactOsc.start(ctx.currentTime);
  impactOsc.stop(ctx.currentTime + 0.08);

  // 코인 획득 - 빠른 상승 아르페지오
  const coinNotes = [659, 784, 988, 1319, 1760];
  coinNotes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + 0.05 + i * 0.045);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.08, ctx.currentTime + 0.05 + i * 0.045 + 0.08);
    gain.gain.setValueAtTime(0.4, ctx.currentTime + 0.05 + i * 0.045);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05 + i * 0.045 + 0.2);
    osc.start(ctx.currentTime + 0.05 + i * 0.045);
    osc.stop(ctx.currentTime + 0.05 + i * 0.045 + 0.2);
  });

  // 반짝 - 고음 shimmer
  const shimmerOsc = ctx.createOscillator();
  const shimmerGain = ctx.createGain();
  shimmerOsc.connect(shimmerGain);
  shimmerGain.connect(ctx.destination);
  shimmerOsc.type = 'sine';
  shimmerOsc.frequency.setValueAtTime(3000, ctx.currentTime + 0.28);
  shimmerOsc.frequency.exponentialRampToValueAtTime(4200, ctx.currentTime + 0.5);
  shimmerGain.gain.setValueAtTime(0.25, ctx.currentTime + 0.28);
  shimmerGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
  shimmerOsc.start(ctx.currentTime + 0.28);
  shimmerOsc.stop(ctx.currentTime + 0.55);
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
