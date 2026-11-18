import "./style.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/syne/800.css";
import { registerSW } from "virtual:pwa-register";
import { AudioBus } from "./audio";
import { draw, type Floater, type Particle, type Ring } from "./render";
import { SKINS, skinById, type Skin } from "./skins";
import { createSim, move, tick, type Sim, type SimEvent } from "./sim";
import { dailySeed } from "./spawn";
import { loadSave, writeSave, type RunMode, type Save } from "./storage";

registerSW({ immediate: true });

type Mode = "menu" | "arming" | "playing" | "paused" | "crashed" | "over";

const appNode = document.querySelector<HTMLDivElement>("#app");
const canvasNode = document.querySelector<HTMLCanvasElement>("#view");
if (!appNode || !canvasNode) throw new Error("Syncline failed to start");
const app: HTMLDivElement = appNode;
const canvas: HTMLCanvasElement = canvasNode;
const context = canvas.getContext("2d");
if (!context) throw new Error("Canvas is unavailable");
const ctx: CanvasRenderingContext2D = context;

const el = {
  hud: must("#hud"),
  score: must("#score"),
  combo: must("#combo"),
  coach: must("#coach"),
  ready: must("#ready"),
  menu: must("#menu"),
  paused: must("#paused"),
  over: must("#over"),
  best: must("#best"),
  bestLabel: must("#best-label"),
  play: mustButton("#play"),
  again: mustButton("#again"),
  resume: mustButton("#resume"),
  pause: mustButton("#pause"),
  mute: mustButton("#mute"),
  pauseHome: mustButton("#pause-home"),
  pauseMute: mustButton("#pause-mute"),
  share: mustButton("#share"),
  overHome: mustButton("#over-home"),
  endless: mustButton("#mode-endless"),
  today: mustButton("#mode-today"),
  skins: must("#skins"),
  finalScore: must("#final-score"),
  overKicker: must("#over-kicker"),
  newBest: must("#new-best"),
  statSyncs: must("#stat-syncs"),
  statGems: must("#stat-gems"),
  statCombo: must("#stat-combo"),
  meter: [...document.querySelectorAll<HTMLElement>(".meter i")],
};

const audio = new AudioBus();
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const save = loadSave();
let runMode: RunMode = save.mode;
let skin = skinById(save.skin);
let mode: Mode = "menu";
let sim: Sim | null = null;
let arm = 0;
let crashLeft = 0;
let shake = 0;
let flash = 0;
let coach = true;
let shownScore = -1;
let demoBeat = 0;
let player = { x: 0, y: 0 };
const particles: Particle[] = [];
const floaters: Floater[] = [];
const rings: Ring[] = [];
const trail: { x: number; y: number }[] = [];
let viewW = 1;
let viewH = 1;
let clock = 0;

audio.setMuted(save.muted);
el.mute.setAttribute("aria-pressed", save.muted ? "true" : "false");
el.pauseMute.textContent = save.muted ? "Muted" : "Sound";
applySkin(skin);
renderSkinPicker();
syncModeButtons();
showBest();

function must(id: string): HTMLElement {
  const node = document.querySelector(id);
  if (!node) throw new Error(`Missing ${id}`);
  return node as HTMLElement;
}

function mustButton(id: string): HTMLButtonElement {
  return must(id) as HTMLButtonElement;
}

function format(n: number): string {
  return Math.floor(n).toLocaleString("en-US");
}

function personalBest(): number {
  const today = save.todaySeed === dailySeed() ? save.todayBest : 0;
  return Math.max(save.best, today);
}

function showBest(): void {
  if (runMode === "today") {
    el.bestLabel.textContent = "Today";
    const current = save.todaySeed === dailySeed() ? save.todayBest : 0;
    el.best.textContent = format(current);
  } else {
    el.bestLabel.textContent = "Best";
    el.best.textContent = format(save.best);
  }
}

function syncModeButtons(): void {
  el.endless.setAttribute("aria-selected", runMode === "endless" ? "true" : "false");
  el.today.setAttribute("aria-selected", runMode === "today" ? "true" : "false");
  showBest();
}

function persist(): void {
  const next: Save = {
    best: save.best,
    todaySeed: save.todaySeed,
    todayBest: save.todayBest,
    skin: skin.id,
    muted: audio.muted,
    mode: runMode,
  };
  Object.assign(save, next);
  writeSave(next);
}

function applySkin(next: Skin): void {
  skin = next;
  document.documentElement.style.setProperty("--glow", next.glow);
  persist();
  renderSkinPicker();
}

function renderSkinPicker(): void {
  const unlockedBy = personalBest();
  el.skins.replaceChildren();
  for (const option of SKINS) {
    const locked = unlockedBy < option.min;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "skin";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", option.id === skin.id ? "true" : "false");
    button.setAttribute("aria-label", locked ? `${option.name}, unlocks at ${format(option.min)}` : option.name);
    if (locked) button.setAttribute("aria-disabled", "true");
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = `radial-gradient(circle at 35% 30%, #ffffff, ${option.glow} 46%, ${option.barrier} 100%)`;
    swatch.style.boxShadow = `0 0 16px ${option.glow}`;
    const name = document.createElement("small");
    name.textContent = locked ? format(option.min) : option.name;
    button.append(swatch, name);
    button.addEventListener("click", () => {
      if (locked) return;
      applySkin(option);
    });
    el.skins.append(button);
  }
}

function setMode(next: Mode): void {
  mode = next;
  el.menu.classList.toggle("hidden", next !== "menu");
  el.paused.classList.toggle("hidden", next !== "paused");
  el.over.classList.toggle("hidden", next !== "over");
  el.hud.classList.toggle("hidden", next === "menu" || next === "paused" || next === "over");
  el.ready.classList.toggle("hidden", next !== "arming");
  el.coach.classList.toggle("hidden", next !== "playing" || !coach);
  if (next === "menu") showBest();
}

function freshSeed(): number {
  if (runMode === "today") return dailySeed();
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

function startRun(): void {
  audio.unlock();
  sim = createSim(freshSeed());
  coach = true;
  shake = 0;
  flash = 0;
  shownScore = -1;
  particles.length = 0;
  floaters.length = 0;
  rings.length = 0;
  trail.length = 0;
  el.score.textContent = "0";
  el.combo.textContent = "";
  setMode("playing");
}

function finishRun(): void {
  if (!sim) return;
  const score = Math.floor(sim.score);
  let improved = false;
  if (runMode === "endless" && score > save.best) {
    save.best = score;
    improved = true;
  }
  if (runMode === "today") {
    const seed = dailySeed();
    if (save.todaySeed !== seed) {
      save.todaySeed = seed;
      save.todayBest = 0;
    }
    if (score > save.todayBest) {
      save.todayBest = score;
      improved = true;
    }
  }
  persist();
  renderSkinPicker();
  el.finalScore.textContent = format(score);
  el.statSyncs.textContent = String(sim.syncs);
  el.statGems.textContent = String(sim.gems);
  el.statCombo.textContent = String(sim.bestCombo);
  el.overKicker.textContent = runMode === "today" ? "Today" : "Run over";
  el.newBest.classList.toggle("hidden", !improved);
  el.newBest.textContent = runMode === "today" ? "Best today" : "New best";
  el.share.textContent = "Share";
  setMode("over");
}

function goHome(): void {
  sim = null;
  setMode("menu");
}

function toggleMute(): void {
  audio.setMuted(!audio.muted);
  el.mute.setAttribute("aria-pressed", audio.muted ? "true" : "false");
  el.pauseMute.textContent = audio.muted ? "Muted" : "Sound";
  persist();
}

function handleEvents(events: SimEvent[]): void {
  for (const event of events) {
    if (event.type === "beat") {
      audio.kick();
      if (Math.floor(sim?.beat ?? 0) % 2 === 0) audio.hat();
    } else if (event.type === "shift") {
      audio.shift();
    } else if (event.type === "sync") {
      audio.sync();
      flash = Math.max(flash, 0.28);
      shake = Math.max(shake, 6);
      rings.push({ life: 1 });
      burst(18, skin.glow);
      floater(event.text, skin.glow);
    } else if (event.type === "gem") {
      audio.gem();
      burst(14, "#fff4c2");
      floater(event.text, "#fff4c2");
    } else if (event.type === "near") {
      audio.near();
      shake = Math.max(shake, 8);
      floater(event.text, "#ffffff");
    } else if (event.type === "crash") {
      audio.crash();
      shake = 22;
      flash = 0.9;
      burst(36, "#ffffff");
      if (navigator.vibrate) navigator.vibrate(40);
      mode = "crashed";
      crashLeft = 0.72;
      el.coach.classList.add("hidden");
      el.ready.classList.add("hidden");
    }
  }
}

function burst(count: number, color: string): void {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random();
    const speed = 40 + Math.random() * 180;
    particles.push({
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.45 + Math.random() * 0.25,
      max: 0.7,
      color,
      size: 2 + Math.random() * 3,
    });
  }
  if (particles.length > 100) particles.splice(0, particles.length - 100);
}

function floater(text: string, color: string): void {
  floaters.push({ text, color, x: player.x, y: player.y - 28, life: 0.8 });
  if (floaters.length > 6) floaters.shift();
}

function tap(dir: -1 | 1): void {
  if ((mode !== "playing" && mode !== "arming") || !sim) return;
  audio.unlock();
  coach = false;
  el.coach.classList.add("hidden");
  const events = move(sim, dir, mode === "playing");
  handleEvents(events);
  if (navigator.vibrate && events.length) navigator.vibrate(10);
}

function updateHud(): void {
  if (!sim) return;
  const shown = Math.floor(sim.score);
  if (shown !== shownScore) {
    shownScore = shown;
    el.score.textContent = format(shown);
  }
  el.combo.textContent = sim.combo > 1 ? `X${sim.combo}` : "";
  const pip = ((Math.floor(sim.beat) % 4) + 4) % 4;
  el.meter.forEach((dot, index) => dot.classList.toggle("on", index === pip));
}

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  step(dt);
  paint();
  requestAnimationFrame(frame);
}

function step(dt: number): void {
  clock += dt;
  shake *= Math.exp(-3.2 * dt);
  flash *= Math.exp(-4.5 * dt);
  for (const particle of particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }
  for (let i = particles.length - 1; i >= 0; i -= 1) if (particles[i].life <= 0) particles.splice(i, 1);
  for (const item of floaters) {
    item.y -= 36 * dt;
    item.life -= dt;
  }
  for (let i = floaters.length - 1; i >= 0; i -= 1) if (floaters[i].life <= 0) floaters.splice(i, 1);
  for (const ring of rings) ring.life -= dt * 1.6;
  for (let i = rings.length - 1; i >= 0; i -= 1) if (rings[i].life <= 0) rings.splice(i, 1);

  if (mode === "menu") {
    demoBeat += dt * (96 / 60) * 0.7;
    return;
  }
  if (!sim) return;
  if (mode === "arming") {
    arm -= dt;
    if (arm <= 0) setMode("playing");
    return;
  }
  if (mode === "playing") {
    handleEvents(tick(sim, dt));
    updateHud();
    return;
  }
  if (mode === "crashed") {
    crashLeft -= dt;
    updateHud();
    if (crashLeft <= 0) finishRun();
  }
}

function paint(): void {
  const menu = mode === "menu";
  const beat = menu ? demoBeat : (sim?.beat ?? 0);
  const lanePos = menu ? 1 + Math.sin(demoBeat * 0.85) * 0.95 : (sim?.lanePos ?? 1);
  const point = draw(ctx, viewW, viewH, {
    beat,
    bpm: menu ? 96 : (sim?.bpm ?? 96),
    lanePos,
    rows: menu || !sim ? [] : sim.chart.rows,
    skin,
    combo: sim?.combo ?? 0,
    shake,
    flash,
    menu,
    crashed: mode === "crashed" || mode === "over",
    reducedMotion,
    clock,
    trail,
    particles,
    floaters,
    rings,
  });
  player = point;
  trail.push(point);
  if (trail.length > 10) trail.shift();
}

let last = performance.now();

function resize(): void {
  const rect = app.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  viewW = Math.max(1, rect.width);
  viewH = Math.max(1, rect.height);
  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resize);
resize();
requestAnimationFrame(frame);

app.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });

app.addEventListener("pointerdown", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest("#mute, a, summary")) return;
  const rect = app.getBoundingClientRect();
  const inHeader = event.clientY - rect.top < 96;
  if ((mode === "playing" || mode === "arming") && (inHeader || target.closest("#pause"))) {
    event.preventDefault();
    setMode("paused");
    return;
  }
  if (target.closest("button")) return;
  if (mode !== "playing" && mode !== "arming") return;
  event.preventDefault();
  tap(event.clientX - rect.left < rect.width / 2 ? -1 : 1);
});

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    if (mode === "menu") cycleSkin(-1);
    else tap(-1);
  } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    if (mode === "menu") cycleSkin(1);
    else tap(1);
  } else if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (mode === "menu") startRun();
    else if (mode === "over") startRun();
    else if (mode === "paused") resume();
  } else if (event.key === "Escape" && (mode === "playing" || mode === "arming")) {
    setMode("paused");
  } else if (event.key === "m" || event.key === "M") {
    toggleMute();
  }
});

function cycleSkin(dir: number): void {
  const unlocked = SKINS.filter((option) => personalBest() >= option.min);
  const index = Math.max(0, unlocked.findIndex((option) => option.id === skin.id));
  const next = unlocked[(index + dir + unlocked.length) % unlocked.length];
  if (next) applySkin(next);
}

function resume(): void {
  if (!sim) return;
  arm = 0.85;
  setMode("arming");
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && (mode === "playing" || mode === "arming")) setMode("paused");
});

el.play.addEventListener("click", startRun);
el.again.addEventListener("click", startRun);
el.resume.addEventListener("click", resume);
el.pause.addEventListener("click", () => setMode("paused"));
el.pauseHome.addEventListener("click", goHome);
el.overHome.addEventListener("click", goHome);
el.mute.addEventListener("click", toggleMute);
el.pauseMute.addEventListener("click", toggleMute);
el.endless.addEventListener("click", () => {
  runMode = "endless";
  syncModeButtons();
  persist();
});
el.today.addEventListener("click", () => {
  runMode = "today";
  syncModeButtons();
  persist();
});
el.share.addEventListener("click", async () => {
  if (!sim) return;
  const label = runMode === "today" ? "today" : "endless";
  const text = `Syncline ${label}: ${format(sim.score)} · ${sim.syncs} syncs · ${sim.gems} gems`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Syncline", text });
      return;
    }
  } catch {
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    el.share.textContent = "Copied";
  } catch {
    el.share.textContent = text;
  }
});
