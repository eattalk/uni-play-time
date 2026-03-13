import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  playFlapSound, playScoreSound, playStarSound,
  playHitSound, playGameOverSound, playCountdownBeep, playEvolutionSound,
} from './sounds';

interface GameProps {
  onGameEnd: (score: number) => void;
  maxTime?: number;
}

type GamePhase = 'intro' | 'countdown' | 'playing' | 'gameover';

interface Bird { x: number; y: number; vy: number; radius: number; }
interface Pipe { x: number; gapY: number; gapHeight: number; width: number; passed: boolean; }
interface Star { x: number; y: number; radius: number; collected: boolean; angle: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }

// --- Physics constants (per second) ---
const GRAVITY = 1008;           // px/s²  (was 0.28/frame @ 60fps → 0.28*60*60)
const FLAP_FORCE = -360;        // px/s   (was -6/frame @ 60fps → -6*60)
const BIRD_X = 80;
const STAR_TIME_BONUS = 2000;
const PIPES_PER_EVOLUTION = 2;

// --- Pipe timer in seconds ---
const PIPE_INTERVAL_BASE = 2.0;  // seconds between pipes at start
const PIPE_INTERVAL_MIN  = 0.92; // seconds (minimum gap)

const BIRD_STAGES = [
  { name: 'CHICK',   color1: '#ffee44', color2: '#ffaa00', size: 13, glowSize: 10 },
  { name: 'SPARROW', color1: '#88ccff', color2: '#4488dd', size: 14, glowSize: 14 },
  { name: 'HAWK',    color1: '#ff8844', color2: '#cc4400', size: 15, glowSize: 16 },
  { name: 'EAGLE',   color1: '#dddddd', color2: '#888888', size: 16, glowSize: 18 },
  { name: 'PHOENIX', color1: '#ff4444', color2: '#ff8800', size: 17, glowSize: 22 },
  { name: 'DRAGON',  color1: '#44ffaa', color2: '#0088ff', size: 18, glowSize: 26 },
  { name: 'GOD',     color1: '#ffffff', color2: '#ffdd00', size: 19, glowSize: 30 },
];

const FlappyBirdGame: React.FC<GameProps> = ({ onGameEnd, maxTime = 60 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [countdown, setCountdown] = useState(3);
  const gameRef = useRef({
    bird: { x: BIRD_X, y: 250, vy: 0, radius: 13 } as Bird,
    pipes: [] as Pipe[],
    stars: [] as Star[],
    particles: [] as Particle[],
    score: 0,
    pipesPassed: 0,
    stage: 0,
    elapsedSec: 0,       // total elapsed seconds during gameplay
    lastTimestamp: 0,
    playing: false,
    animationId: 0,
    pipeTimer: 0,        // seconds since last pipe spawn
    cloudOffsetX: 0,
    comboCount: 0,
    scorePopText: '',
    scorePopTimer: 0,    // seconds
    evolveFlashTimer: 0, // seconds
    // visual frame accumulator for bg star animation (time-based)
    bgTime: 0,
  });

  const getDifficulty = (sec: number) => {
    const t = Math.min(sec / maxTime, 1);
    return {
      pipeSpeedPx: (2.0 + t * 4.5) * 60,   // px/s (original was px/frame @ 60fps)
      pipeInterval: PIPE_INTERVAL_BASE - t * (PIPE_INTERVAL_BASE - PIPE_INTERVAL_MIN),
      gapHeight: Math.max(68, 140 - sec * 1.5),
    };
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}:${Math.floor((ms % 1000) / 10).toString().padStart(2, '0')}`;
  };

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    const g = gameRef.current;
    for (let i = 0; i < count; i++) {
      // vx/vy stored as px/s
      g.particles.push({ x, y, vx: (Math.random() - 0.5) * 600, vy: (Math.random() - 0.5) * 600, life: 1, color, size: Math.random() * 5 + 2 });
    }
  };

  const flap = useCallback(() => {
    if (phase === 'playing' && gameRef.current.playing) {
      gameRef.current.bird.vy = FLAP_FORCE;
      playFlapSound();
    }
  }, [phase]);

  const startCountdown = useCallback(() => {
    setPhase('countdown');
    setCountdown(3);
    playCountdownBeep();
    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        playCountdownBeep(true);
        setPhase('playing');
        const g = gameRef.current;
        g.playing = true;
        g.lastTimestamp = performance.now();
        g.bird = { x: BIRD_X, y: 250, vy: 0, radius: 13 };
        g.pipes = []; g.stars = []; g.particles = [];
        g.score = 0; g.pipesPassed = 0; g.stage = 0;
        g.elapsedSec = 0; g.pipeTimer = 0; g.bgTime = 0;
        g.cloudOffsetX = 0; g.comboCount = 0;
        g.scorePopText = ''; g.scorePopTimer = 0; g.evolveFlashTimer = 0;
      } else { setCountdown(count); playCountdownBeep(); }
    }, 1000);
  }, []);

  // ===== DRAWING =====

  const drawBird = (ctx: CanvasRenderingContext2D, bird: Bird, elapsedSec: number, stage: number) => {
    const info = BIRD_STAGES[stage];
    ctx.save();
    const angle = Math.min(Math.max(bird.vy * 0.04 / 60, -0.5), 0.8); // vy is now px/s, scale down
    ctx.translate(bird.x, bird.y);
    ctx.rotate(angle);
    const r = info.size;

    ctx.shadowColor = info.color1;
    ctx.shadowBlur = info.glowSize;

    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
    grad.addColorStop(0, info.color1);
    grad.addColorStop(0.7, info.color2);
    grad.addColorStop(1, info.color2 + '66');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, r + 2, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = info.color1 + '44';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.2, r * 0.5, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(r * 0.35, -r * 0.25, r * 0.3, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = stage >= 4 ? '#ff0000' : '#111';
    ctx.beginPath();
    ctx.arc(r * 0.42, -r * 0.25, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.47, -r * 0.33, r * 0.06, 0, Math.PI * 2);
    ctx.fill();

    const beakLen = 8 + stage * 3;
    ctx.fillStyle = stage >= 4 ? '#ff2200' : '#ff6600';
    ctx.beginPath();
    ctx.moveTo(r, -1);
    ctx.lineTo(r + beakLen, 2);
    ctx.lineTo(r + beakLen, 5);
    ctx.lineTo(r, 7);
    ctx.closePath();
    ctx.fill();
    if (stage >= 3) {
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(r + 3 + i * 4, 5);
        ctx.lineTo(r + 5 + i * 4, 8);
        ctx.lineTo(r + 7 + i * 4, 5);
        ctx.fill();
      }
    }

    const wingFlap = Math.sin(elapsedSec * 14) * 0.4;
    ctx.fillStyle = info.color2;
    ctx.beginPath();
    ctx.ellipse(-3, 2, r * 0.75, r * 0.4, wingFlap, 0, Math.PI * 2);
    ctx.fill();

    if (stage >= 2) {
      ctx.fillStyle = info.color1;
      const spikes = stage >= 5 ? 5 : 3;
      for (let i = 0; i < spikes; i++) {
        ctx.beginPath();
        ctx.moveTo(-4 + i * 4, -r);
        ctx.lineTo(-2 + i * 4, -r - 5 - stage * 2);
        ctx.lineTo(0 + i * 4, -r);
        ctx.fill();
      }
    }
    if (stage >= 4) {
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < 6 + stage; i++) {
        const fx = -r - 4 - i * 5;
        const fy = Math.sin(elapsedSec * 25 + i * 0.8) * (3 + i * 0.5);
        const flameR = (6 - i * 0.4);
        if (flameR <= 0) continue;
        ctx.fillStyle = i % 2 === 0 ? info.color1 : info.color2;
        ctx.beginPath();
        ctx.ellipse(fx, fy, flameR, flameR * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (stage >= 5) {
      ctx.fillStyle = info.color2;
      ctx.beginPath();
      ctx.moveTo(-2, -r - 2);
      ctx.lineTo(-8, -r - 14);
      ctx.lineTo(2, -r - 4);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(6, -r - 2);
      ctx.lineTo(12, -r - 14);
      ctx.lineTo(10, -r - 4);
      ctx.fill();
      ctx.strokeStyle = info.color1 + '88';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-5, -2);
      ctx.quadraticCurveTo(-r - 15, -r - 10 + Math.sin(elapsedSec * 8) * 5, -r - 8, 4);
      ctx.stroke();
    }
    if (stage >= 6) {
      ctx.strokeStyle = '#ffdd00aa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -r - 10, 12, 4, Math.sin(elapsedSec * 3) * 0.1, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const sa = elapsedSec * 4 + i * Math.PI / 2;
        const sx = Math.cos(sa) * (r + 10);
        const sy = Math.sin(sa) * (r + 10);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = info.color2 + 'cc';
    ctx.beginPath();
    ctx.moveTo(-r + 2, -2);
    ctx.lineTo(-r - 6 - stage * 2, -4 - stage);
    ctx.lineTo(-r - 4 - stage, 0);
    ctx.lineTo(-r - 6 - stage * 2, 4 + stage);
    ctx.lineTo(-r + 2, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, W: number, H: number, timeSec: number, stage: number) => {
    const skyColors = [
      ['#0b0d2a','#1a1040','#0a0e1a'], ['#0b102a','#1a1848','#0a0e1a'],
      ['#0a1a2a','#102050','#0a1530'], ['#1a0a2a','#301050','#1a0530'],
      ['#2a0a0a','#501010','#2a0505'], ['#0a2a20','#103828','#0a2510'],
      ['#1a1a08','#303010','#1a1500'],
    ];
    const c = skyColors[stage] || skyColors[0];
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, c[0]); g.addColorStop(0.5, c[1]); g.addColorStop(1, c[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 50; i++) {
      const sx = ((i * 97 + timeSec * 12) % (W + 20)) - 10;
      const sy = (i * 73 + Math.sin(i + timeSec * 1.2) * 3) % (H * 0.7);
      ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(timeSec * 3 + i) * 0.2})`;
      ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1.5, i % 3 === 0 ? 2 : 1.5);
    }

    const gg = ctx.createLinearGradient(0, H - 30, 0, H);
    gg.addColorStop(0, '#1a4a20'); gg.addColorStop(1, '#060f08');
    ctx.fillStyle = gg;
    ctx.fillRect(0, H - 30, W, 30);
    ctx.strokeStyle = '#2a7a30';
    ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, H - 30);
      ctx.lineTo(i + 2, H - 30 - 5 - Math.sin(i * 0.3 + timeSec * 6) * 3);
      ctx.stroke();
    }
  };

  const drawPipe = (ctx: CanvasRenderingContext2D, pipe: Pipe, H: number, stage: number) => {
    const pc = [['#1a8a40','#33ee66'],['#1a8a40','#33ee66'],['#2a6a8a','#44ccee'],
      ['#6a2a8a','#cc44ee'],['#8a2a2a','#ee4444'],['#2a8a6a','#44eecc'],['#8a8a2a','#eeee44']][stage] || ['#1a8a40','#33ee66'];
    const gr = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
    gr.addColorStop(0, pc[0]); gr.addColorStop(0.5, pc[1]); gr.addColorStop(1, pc[0]);
    ctx.fillStyle = gr;
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapY);
    ctx.fillRect(pipe.x - 5, pipe.gapY - 18, pipe.width + 10, 18);
    const bY = pipe.gapY + pipe.gapHeight;
    ctx.fillStyle = gr;
    ctx.fillRect(pipe.x, bY, pipe.width, H - 30 - bY);
    ctx.fillRect(pipe.x - 5, bY, pipe.width + 10, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(pipe.x + 8, 0, 5, pipe.gapY);
    ctx.fillRect(pipe.x + 8, bY, 5, H - 30 - bY);
  };

  const drawStar = (ctx: CanvasRenderingContext2D, star: Star) => {
    if (star.collected) return;
    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.rotate(star.angle);
    ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffee44';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * star.radius, Math.sin(a) * star.radius);
      ctx.lineTo(Math.cos(a + Math.PI / 5) * star.radius * 0.4, Math.sin(a + Math.PI / 5) * star.radius * 0.4);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('-2s', 0, star.radius + 12);
    ctx.restore();
  };

  // ===== INTRO SCREEN =====
  useEffect(() => {
    if (phase !== 'intro') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;

    let introTime = 0;
    let lastTs = 0;
    let demoBirdY = H / 2;
    let demoBirdVy = 0;

    // 파이프 2개
    const pipes = [
      { x: 260, gapY: 160, gapH: 145 },
      { x: 480, gapY: 220, gapH: 145 },
    ];
    // 별: 파이프 gap 안 + 파이프 사이 중간 허공 (총 4개)
    const stars = [
      { x: 285, y: 230, a: 0   },  // pipe0 gap 안
      { x: 370, y: 270, a: 0.8 },  // pipe0↔pipe1 사이 허공
      { x: 505, y: 290, a: 1.6 },  // pipe1 gap 안
      { x: 595, y: 230, a: 2.4 },  // pipe1↔오른쪽 끝 사이 허공
    ];

    const drawStar5 = (x: number, y: number, angle: number, r: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.shadowColor = '#ffdd00';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ffee44';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a + Math.PI / 5) * r * 0.4, Math.sin(a + Math.PI / 5) * r * 0.4);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    const drawBirdSimple = (bx: number, by: number, bvy: number, t: number, stage: number) => {
      const info = BIRD_STAGES[stage];
      ctx.save();
      const angle = Math.min(Math.max(bvy * 0.04 / 60, -0.5), 0.8);
      ctx.translate(bx, by);
      ctx.rotate(angle);
      const r = info.size;
      ctx.shadowColor = info.color1;
      ctx.shadowBlur = info.glowSize;
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
      grad.addColorStop(0, info.color1);
      grad.addColorStop(0.7, info.color2);
      grad.addColorStop(1, info.color2 + '66');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, r + 2, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // eye
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(r * 0.35, -r * 0.25, r * 0.3, r * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(r * 0.42, -r * 0.25, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      // wing flap
      const wingFlap = Math.sin(t * 14) * 0.4;
      ctx.fillStyle = info.color2;
      ctx.beginPath();
      ctx.ellipse(-3, 2, r * 0.75, r * 0.4, wingFlap, 0, Math.PI * 2);
      ctx.fill();
      // beak
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.moveTo(r, -1); ctx.lineTo(r + 9, 2); ctx.lineTo(r + 9, 5); ctx.lineTo(r, 7);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    };

    let rafId = 0;
    const loop = (ts: number) => {
      if (lastTs === 0) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.033);
      lastTs = ts;
      introTime += dt;

      // Auto-flap every 0.58s
      if (Math.floor(introTime / 0.58) > Math.floor((introTime - dt) / 0.58)) {
        demoBirdVy = FLAP_FORCE * 0.9;
      }
      demoBirdVy += GRAVITY * dt;
      demoBirdY += demoBirdVy * dt;
      if (demoBirdY > H - 55) { demoBirdY = H - 55; demoBirdVy = 0; }
      if (demoBirdY < 45)     { demoBirdY = 45;     demoBirdVy = 0; }

      const speed = 85;
      pipes.forEach(p => {
        p.x -= speed * dt;
        if (p.x < -65) { p.x = W + 30; p.gapY = 120 + Math.random() * 180; }
      });
      stars.forEach(s => {
        s.x -= speed * dt;
        s.a  += 2.5 * dt;
        if (s.x < -20) { s.x = W + 60 + Math.random() * 140; s.y = 110 + Math.random() * 290; }
      });

      // --- Draw background ---
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#0b0d2a'); sky.addColorStop(0.5, '#1a1040'); sky.addColorStop(1, '#0a0e1a');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < 30; i++) {
        const sx = ((i * 97 + introTime * 18) % (W + 20)) - 10;
        const sy = (i * 73) % (H * 0.7);
        ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.sin(introTime * 1.8 + i) * 0.15})`;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // ground
      const gg = ctx.createLinearGradient(0, H - 30, 0, H);
      gg.addColorStop(0, '#1a4a20'); gg.addColorStop(1, '#060f08');
      ctx.fillStyle = gg; ctx.fillRect(0, H - 30, W, 30);

      // --- Draw pipes ---
      pipes.forEach(p => {
        const gr = ctx.createLinearGradient(p.x, 0, p.x + 50, 0);
        gr.addColorStop(0, '#1a8a40'); gr.addColorStop(0.5, '#33ee66'); gr.addColorStop(1, '#1a8a40');
        ctx.fillStyle = gr;
        ctx.fillRect(p.x, 0, 50, p.gapY);
        ctx.fillRect(p.x - 5, p.gapY - 15, 60, 15);
        const bY = p.gapY + p.gapH;
        ctx.fillRect(p.x, bY, 50, H - 30 - bY);
        ctx.fillRect(p.x - 5, bY, 60, 15);
      });

      // --- Draw stars ---
      stars.forEach(s => drawStar5(s.x, s.y, s.a, 10));

      // --- Draw bird ---
      const demoStage = Math.floor(introTime / 1.8) % BIRD_STAGES.length;
      drawBirdSimple(90, demoBirdY, demoBirdVy, introTime, demoStage);

      // --- UI overlays ---
      // top bar
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, 52);
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 19px "Orbitron", monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 14;
      ctx.fillText('FLAPPY EVOLUTION', W / 2, 34);
      ctx.shadowBlur = 0;

      // tap icon centre
      const fingerY = H * 0.55;
      const tapPulse = Math.sin(introTime * 5.5);
      ctx.save();
      ctx.translate(W / 2, fingerY);
      ctx.scale(1 + tapPulse * 0.1, 1 + tapPulse * 0.1);
      ctx.font = '48px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 18 + tapPulse * 8;
      ctx.fillText('👆', 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
      ctx.globalAlpha = 0.55 + tapPulse * 0.45;
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▲  TAP TO JUMP', W / 2, fingerY + 44);
      ctx.globalAlpha = 1;

      // bottom bar
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, H - 46, W, 46);
      const pulse = 0.6 + Math.sin(introTime * 4.5) * 0.4;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 14;
      ctx.font = 'bold 16px "Orbitron", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[ TAP / CLICK / SPACE ]', W / 2, H - 16);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafId); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ===== MAIN GAME LOOP =====
  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const g = gameRef.current;

    // Prevent duplicate loops
    if (g.animationId) cancelAnimationFrame(g.animationId);

    const endGame = () => {
      g.playing = false;
      playGameOverSound();
      setPhase('gameover');
      setTimeout(() => onGameEnd(g.score), 1500);
    };

    const loop = (timestamp: number) => {
      if (!g.playing) return;

      // Delta time in seconds, clamped to 33ms max
      const rawDt = (timestamp - g.lastTimestamp) / 1000;
      const dt = Math.min(rawDt, 0.033);
      g.lastTimestamp = timestamp;

      g.elapsedSec += dt;
      g.bgTime += dt;

      if (g.elapsedSec >= maxTime) { endGame(); return; }

      const diff = getDifficulty(g.elapsedSec);

      // Evolution
      const newStage = Math.min(Math.floor(g.pipesPassed / PIPES_PER_EVOLUTION), BIRD_STAGES.length - 1);
      if (newStage > g.stage) {
        g.stage = newStage;
        playEvolutionSound();
        spawnParticles(g.bird.x, g.bird.y, BIRD_STAGES[newStage].color1, 35);
        spawnParticles(g.bird.x, g.bird.y, '#ffffff', 15);
        g.bird.radius = BIRD_STAGES[newStage].size;
        g.evolveFlashTimer = 0.67;  // seconds (was 40 frames @ 60fps)
      }

      if (g.scorePopTimer > 0) g.scorePopTimer -= dt;
      if (g.evolveFlashTimer > 0) g.evolveFlashTimer -= dt;

      // Physics (dt-based)
      g.bird.vy += GRAVITY * dt;
      g.bird.y += g.bird.vy * dt;
      if (g.bird.y - g.bird.radius < 0) { g.bird.y = g.bird.radius; g.bird.vy = 0; }
      if (g.bird.y + g.bird.radius > H - 30) { g.bird.y = H - 30 - g.bird.radius; g.bird.vy = 0; }

      // Pipe spawning (dt-based timer)
      g.pipeTimer += dt;
      if (g.pipeTimer >= diff.pipeInterval) {
        g.pipeTimer -= diff.pipeInterval;
        const gapH = diff.gapHeight;
        const gapY = Math.random() * (H - 30 - gapH - 80) + 40;
        g.pipes.push({ x: W, gapY, gapHeight: gapH, width: 50, passed: false });

        // 별 1: 파이프 gap 안 (항상 생성)
        g.stars.push({ x: W + 25, y: gapY + gapH / 2, radius: 10, collected: false, angle: 0 });

        // 별 2: 이전 파이프와 현재 파이프 사이 중간 지점 (파이프 사이 허공)
        if (g.pipes.length >= 2) {
          const prevPipe = g.pipes[g.pipes.length - 2];
          const midX = prevPipe.x + (W - prevPipe.x) / 2;
          const midY = 60 + Math.random() * (H - 120);
          g.stars.push({ x: midX, y: midY, radius: 9, collected: false, angle: Math.PI / 4 });
        }
      }

      g.pipes.forEach(p => {
        p.x -= diff.pipeSpeedPx * dt;
        if (!p.passed && p.x + p.width < g.bird.x) {
          p.passed = true;
          g.pipesPassed++;
          g.comboCount++;
          const pipeScore = 1 + Math.floor(g.elapsedSec / 5);
          const combo = Math.min(g.comboCount, 5);
          const total = pipeScore * combo;
          g.score += total;
          g.scorePopText = `+${total}${combo > 1 ? ` x${combo}` : ''}`;
          g.scorePopTimer = 1.0;  // seconds (was 60 frames)
          playScoreSound();
          spawnParticles(g.bird.x, g.bird.y, '#00ff88', 8);
        }
      });
      g.pipes = g.pipes.filter(p => p.x + p.width > -10);

      // Star rotation: 3 rad/s
      g.stars.forEach(s => { s.x -= diff.pipeSpeedPx * dt; s.angle += 3 * dt; });
      g.stars = g.stars.filter(s => s.x > -20 && !s.collected);

      // Particles: life decreases at 1.8/s (was 0.03/frame @ 60fps → 1.8/s)
      g.particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= 1.8 * dt; });
      g.particles = g.particles.filter(p => p.life > 0);

      // Collision: pipes
      for (const p of g.pipes) {
        if (g.bird.x + g.bird.radius > p.x && g.bird.x - g.bird.radius < p.x + p.width) {
          if (g.bird.y - g.bird.radius < p.gapY || g.bird.y + g.bird.radius > p.gapY + p.gapHeight) {
            playHitSound();
            spawnParticles(g.bird.x, g.bird.y, '#ff4444', 25);
            endGame();
            return;
          }
        }
      }

      // Collision: stars
      g.stars.forEach(s => {
        if (s.collected) return;
        const dx = g.bird.x - s.x, dy = g.bird.y - s.y;
        if (Math.sqrt(dx * dx + dy * dy) < g.bird.radius + s.radius) {
          s.collected = true;
          g.elapsedSec = Math.max(0, g.elapsedSec - STAR_TIME_BONUS / 1000);
          g.score += 10;
          playStarSound();
          spawnParticles(s.x, s.y, '#ffee44', 25);
          g.scorePopText = '⭐ +10 & -2s!';
          g.scorePopTimer = 1.33;  // seconds (was 80 frames)
        }
      });

      // ===== DRAW =====
      drawBackground(ctx, W, H, g.bgTime, g.stage);

      if (g.evolveFlashTimer > 0) {
        ctx.fillStyle = `rgba(255,255,255,${g.evolveFlashTimer / 0.67})`;
        ctx.fillRect(0, 0, W, H);
      }

      g.pipes.forEach(p => drawPipe(ctx, p, H, g.stage));
      g.stars.forEach(s => drawStar(ctx, s));
      drawBird(ctx, g.bird, g.elapsedSec, g.stage);

      g.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // HUD
      ctx.fillStyle = '#00000099';
      ctx.fillRect(0, 0, W, 44);
      ctx.fillStyle = '#00ffcc';
      ctx.font = 'bold 15px "Orbitron", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`⏱ ${formatTime(g.elapsedSec * 1000)}`, 10, 29);
      ctx.fillStyle = '#ffdd00';
      ctx.textAlign = 'center';
      ctx.font = 'bold 16px "Orbitron", monospace';
      ctx.fillText(`★ ${g.score}`, W / 2, 29);
      ctx.textAlign = 'right';
      ctx.fillStyle = BIRD_STAGES[g.stage].color1;
      ctx.font = 'bold 11px "Orbitron", monospace';
      ctx.fillText(BIRD_STAGES[g.stage].name, W - 10, 29);

      const nextEvo = (g.stage + 1) * PIPES_PER_EVOLUTION;
      if (g.stage < BIRD_STAGES.length - 1) {
        ctx.fillStyle = '#ffffff66';
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`Next: ${g.pipesPassed}/${nextEvo}`, W - 10, 40);
      }

      if (g.scorePopTimer > 0) {
        ctx.globalAlpha = Math.min(1, g.scorePopTimer / 0.5);
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 18px "Orbitron", monospace';
        ctx.textAlign = 'center';
        // Float upward: 30px over 1 second
        const floatOffset = (1.0 - g.scorePopTimer) * 30;
        ctx.fillText(g.scorePopText, g.bird.x, g.bird.y - 30 - floatOffset);
        ctx.globalAlpha = 1;
      }

      g.animationId = requestAnimationFrame(loop);
    };

    g.animationId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(g.animationId); g.animationId = 0; };
  }, [phase, maxTime, onGameEnd]);

  // Input
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (phase === 'intro') startCountdown(); else flap();
      }
    };
    const handleTouch = () => { if (phase === 'intro') startCountdown(); else flap(); };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('touchstart', handleTouch);
    return () => { window.removeEventListener('keydown', handleKey); window.removeEventListener('touchstart', handleTouch); };
  }, [phase, flap, startCountdown]);

  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-background overflow-hidden">
      <canvas
        ref={canvasRef}
        width={400}
        height={600}
        className="border border-border rounded-lg cursor-pointer max-w-full max-h-full"
        onClick={() => { if (phase === 'intro') startCountdown(); else flap(); }}
        style={{ imageRendering: 'pixelated' }}
      />
      {phase === 'countdown' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10">
          <div
            key={countdown}
            className="text-[120px] font-arcade text-neon-green leading-none"
            style={{
              textShadow: '0 0 30px #00ff88, 0 0 60px #00ff88',
              animation: 'ping 0.9s ease-out forwards',
            }}
          >
            {countdown}
          </div>
          <p className="text-neon-green/60 font-arcade text-sm mt-6 tracking-widest">GET READY</p>
        </div>
      )}
      {phase === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/85 z-10">
          <div className="text-center">
            <h2 className="text-3xl font-arcade text-neon-pink mb-4">GAME OVER</h2>
            <p className="text-xl font-display text-neon-yellow">Score: {gameRef.current.score}</p>
            <p className="text-sm font-display text-muted-foreground mt-2">
              {BIRD_STAGES[gameRef.current.stage].name} • Pipes: {gameRef.current.pipesPassed}
            </p>
            <p className="text-sm font-display text-muted-foreground mt-1">
              {formatTime(gameRef.current.elapsedSec * 1000)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlappyBirdGame;
