import type { Row } from "./spawn";
import type { Skin } from "./skins";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

export interface Floater {
  text: string;
  x: number;
  y: number;
  life: number;
  color: string;
}

export interface Ring {
  life: number;
}

export interface Scene {
  beat: number;
  bpm: number;
  lanePos: number;
  rows: Row[];
  skin: Skin;
  combo: number;
  shake: number;
  flash: number;
  menu: boolean;
  crashed: boolean;
  reducedMotion: boolean;
  clock: number;
  trail: { x: number; y: number }[];
  particles: Particle[];
  floaters: Floater[];
  rings: Ring[];
}

interface Proj {
  y: number;
  f: number;
  half: number;
}

let roadAnchor = 0.8;

function project(depth: number, w: number, h: number): Proj {
  const horizon = h * 0.34;
  const playerY = h * roadAnchor;
  const f = 1 / (1 + Math.max(-0.25, depth) * 1.22);
  return {
    y: horizon + (playerY - horizon) * f,
    f,
    half: w * 0.055 + (w * 0.44 - w * 0.055) * f,
  };
}

function laneX(lane: number, proj: Proj, cx: number): number {
  return cx + (lane - 1) * ((proj.half * 2) / 3);
}

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function draw(ctx: CanvasRenderingContext2D, w: number, h: number, scene: Scene): { x: number; y: number } {
  roadAnchor = scene.menu ? 0.94 : 0.8;
  const cx = w / 2;
  const shakeAmp = scene.reducedMotion ? 0 : scene.shake;
  const sx = Math.sin(scene.clock * 47) * shakeAmp;
  const sy = Math.cos(scene.clock * 38) * shakeAmp;

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(sx, sy);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#140818");
  sky.addColorStop(0.45, "#090712");
  sky.addColorStop(1, "#05040a");
  ctx.fillStyle = sky;
  ctx.fillRect(-20, -20, w + 40, h + 40);

  const glow = ctx.createRadialGradient(cx, h * 0.34, 10, cx, h * 0.4, w * 0.7);
  glow.addColorStop(0, hexAlpha(scene.skin.glow, 0.22));
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  drawSkyline(ctx, w, h, scene);
  drawRoad(ctx, w, h, scene);
  drawRows(ctx, w, h, scene);
  const player = scene.menu ? { x: w / 2, y: h * 0.36 } : drawPlayer(ctx, w, h, scene);
  if (!scene.menu) drawRings(ctx, player.x, player.y, scene);
  drawParticles(ctx, scene);
  drawFloaters(ctx, scene);

  const vignette = ctx.createRadialGradient(cx, h * 0.55, h * 0.2, cx, h * 0.55, h * 0.75);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(-20, -20, w + 40, h + 40);

  if (scene.flash > 0.01) {
    ctx.fillStyle = hexAlpha(scene.crashed ? "#ffffff" : scene.skin.glow, Math.min(0.7, scene.flash));
    ctx.fillRect(-20, -20, w + 40, h + 40);
  }

  ctx.restore();
  return player;
}

function drawSkyline(ctx: CanvasRenderingContext2D, w: number, h: number, scene: Scene): void {
  const base = h * 0.34;
  ctx.save();
  for (let i = 0; i < 18; i += 1) {
    const x = (i / 18) * w;
    const bw = w * (0.035 + hash(i) * 0.03);
    const bh = h * (0.04 + hash(i + 3) * 0.1);
    ctx.fillStyle = i % 3 === 0 ? "rgba(255,43,214,0.16)" : "rgba(61,255,242,0.1)";
    ctx.fillRect(x, base - bh, bw, bh);
    const windows = 3 + Math.floor(hash(i + 9) * 4);
    for (let k = 0; k < windows; k += 1) {
      const wy = base - bh + 6 + k * 8;
      if (hash(i * 10 + k) > 0.45) {
        ctx.fillStyle = hexAlpha(scene.skin.accent, 0.55);
        ctx.fillRect(x + bw * 0.35, wy, 2, 3);
      }
    }
  }
  ctx.restore();
}

function drawRoad(ctx: CanvasRenderingContext2D, w: number, h: number, scene: Scene): void {
  const far = project(7.2, w, h);
  const near = project(-0.35, w, h);
  const cx = w / 2;

  ctx.beginPath();
  ctx.moveTo(cx - far.half, far.y);
  ctx.lineTo(cx + far.half, far.y);
  ctx.lineTo(cx + near.half, near.y);
  ctx.lineTo(cx - near.half, near.y);
  ctx.closePath();
  const road = ctx.createLinearGradient(0, far.y, 0, near.y);
  road.addColorStop(0, "#161222");
  road.addColorStop(1, "#0c0a12");
  ctx.fillStyle = road;
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = hexAlpha(scene.skin.glow, 0.85);
  ctx.beginPath();
  ctx.moveTo(cx - far.half, far.y);
  ctx.lineTo(cx - near.half, near.y);
  ctx.moveTo(cx + far.half, far.y);
  ctx.lineTo(cx + near.half, near.y);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  for (const side of [-0.5, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * ((far.half * 2) / 3), far.y);
    ctx.lineTo(cx + side * ((near.half * 2) / 3), near.y);
    ctx.stroke();
  }

  const dashCount = 16;
  ctx.strokeStyle = hexAlpha(scene.skin.glow, 0.35);
  ctx.lineWidth = 2;
  ctx.lineCap = "butt";
  for (let i = 0; i < dashCount; i += 1) {
    const shift = scene.reducedMotion ? i : i + scene.beat * 1.7;
    const z0 = (shift % dashCount) * 0.42;
    const z1 = z0 + 0.18;
    for (const side of [-0.5, 0.5]) {
      const a = project(z0, w, h);
      const b = project(z1, w, h);
      ctx.beginPath();
      ctx.moveTo(cx + side * ((a.half * 2) / 3), a.y);
      ctx.lineTo(cx + side * ((b.half * 2) / 3), b.y);
      ctx.stroke();
    }
  }

  if (!scene.reducedMotion && scene.bpm > 120) {
    ctx.strokeStyle = hexAlpha(scene.skin.glow, (scene.bpm - 120) / 400);
    for (let i = 0; i < 5; i += 1) {
      const y = h * (0.5 + ((scene.beat * 0.35 + i * 0.17) % 0.55));
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(8, y);
      ctx.lineTo(w * 0.08, y - 10);
      ctx.moveTo(w - 8, y);
      ctx.lineTo(w * 0.92, y - 10);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

function drawRows(ctx: CanvasRenderingContext2D, w: number, h: number, scene: Scene): void {
  const cx = w / 2;
  const ordered = [...scene.rows].sort((a, b) => b.beat - a.beat);
  for (const row of ordered) {
    const delta = row.beat - scene.beat;
    if (delta < -0.45 || delta > 7.2) continue;
    const depth = delta * 0.86;
    for (let lane = 0; lane < 3; lane += 1) {
      if (row.blocks[lane]) drawWall(ctx, w, h, cx, lane, depth, scene.skin);
    }
    if (row.gemLane != null && !row.gemTaken) drawGem(ctx, w, h, cx, row.gemLane, depth, scene);
  }
}

function drawWall(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cx: number,
  lane: number,
  depth: number,
  skin: Skin,
): void {
  const front = project(Math.max(-0.2, depth - 0.05), w, h);
  const back = project(depth + 0.34, w, h);
  const span = (proj: Proj) => {
    const stride = (proj.half * 2) / 3;
    const mid = laneX(lane, proj, cx);
    const inset = stride * 0.4;
    return { l: mid - inset, r: mid + inset, y: proj.y, f: proj.f };
  };
  const a = span(front);
  const b = span(back);
  const lift = 92;
  const topA = a.y - lift * a.f;
  const topB = b.y - lift * b.f;

  ctx.beginPath();
  ctx.moveTo(a.l, a.y);
  ctx.lineTo(a.r, a.y);
  ctx.lineTo(a.r, topA);
  ctx.lineTo(a.l, topA);
  ctx.closePath();
  const face = ctx.createLinearGradient(0, topA, 0, a.y);
  face.addColorStop(0, skin.barrierHot);
  face.addColorStop(1, skin.barrier);
  ctx.fillStyle = face;
  ctx.globalAlpha = 0.92;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = skin.barrierHot;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(a.l, topA);
  ctx.lineTo(a.r, topA);
  ctx.lineTo(b.r, topB);
  ctx.lineTo(b.l, topB);
  ctx.closePath();
  ctx.fillStyle = skin.barrierHot;
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawGem(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cx: number,
  lane: number,
  depth: number,
  scene: Scene,
): void {
  const proj = project(depth, w, h);
  const x = laneX(lane, proj, cx);
  const y = proj.y - 78 * proj.f;
  const s = 16 * proj.f * (1 + Math.sin(scene.beat * 6 + lane) * 0.08);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(scene.beat * 1.4 + lane);
  ctx.fillStyle = "#fff4c2";
  ctx.shadowColor = scene.skin.accent;
  ctx.shadowBlur = scene.reducedMotion ? 0 : 16;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.72, 0);
  ctx.lineTo(0, s);
  ctx.lineTo(-s * 0.72, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, w: number, h: number, scene: Scene): { x: number; y: number } {
  const proj = project(0.02, w, h);
  const x = laneX(scene.lanePos, proj, w / 2);
  const bob = scene.reducedMotion ? 0 : Math.sin(scene.beat * Math.PI * 2) * 3;
  const y = proj.y - 26 + bob;
  const pulse = scene.combo >= 8 ? 1.12 : 1;

  for (let i = 0; i < scene.trail.length; i += 1) {
    const point = scene.trail[i];
    const fade = (i + 1) / scene.trail.length;
    ctx.globalAlpha = fade * 0.28;
    ctx.fillStyle = scene.skin.glow;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 7 * fade, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(x, proj.y + 6);
  ctx.scale(1, 0.28);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const radius = 15 * pulse;
  if (!scene.reducedMotion) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = hexAlpha(scene.skin.glow, 0.9);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 8, scene.beat * 2, scene.beat * 2 + 1.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = hexAlpha(scene.skin.accent, 0.8);
    ctx.arc(0, 0, radius + 12, -scene.beat * 1.6, -scene.beat * 1.6 + 0.9);
    ctx.stroke();
    ctx.restore();
  }

  const grd = ctx.createRadialGradient(x - 4, y - 5, 2, x, y, radius + 10);
  grd.addColorStop(0, scene.skin.core);
  grd.addColorStop(0.45, scene.skin.glow);
  grd.addColorStop(1, hexAlpha(scene.skin.glow, 0));
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(x, y, radius + 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = scene.skin.core;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();

  return { x, y };
}

function drawRings(ctx: CanvasRenderingContext2D, x: number, y: number, scene: Scene): void {
  for (const ring of scene.rings) {
    const t = 1 - ring.life;
    ctx.beginPath();
    ctx.strokeStyle = hexAlpha(scene.skin.glow, ring.life * 0.8);
    ctx.lineWidth = 3;
    ctx.ellipse(x, y + 18, 18 + t * 70, 8 + t * 18, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, scene: Scene): void {
  for (const particle of scene.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.max);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx: CanvasRenderingContext2D, scene: Scene): void {
  ctx.save();
  ctx.font = "700 18px Outfit, sans-serif";
  ctx.textAlign = "center";
  for (const floater of scene.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, floater.life * 1.6));
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, floater.x, floater.y);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function hexAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const n = Number.parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
