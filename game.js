const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const message = document.getElementById("message");
const startBtn = document.getElementById("startBtn");

const W = canvas.width;
const H = canvas.height;

// --- Física del salto ---------------------------------------------------
// Antes: la rana saltaba con velocidad fija (~590) y los nenúfares podían
// aparecer hasta 300px+ por encima de su punto de salto -> altura máxima
// alcanzable (~116px) nunca llegaba a esas plataformas. Ahora el juego es
// de scroll vertical infinito: la rana rebota sola y las plataformas se
// generan SIEMPRE dentro del rango físico que su salto puede alcanzar.
const GRAVITY = 1700;
const JUMP_V = 780;                 // velocidad de rebote
const MAX_JUMP_H = (JUMP_V * JUMP_V) / (2 * GRAVITY); // ≈179px alcanzables
const PAD_GAP_MIN = 70;
const PAD_GAP_MAX = 150;            // siempre < MAX_JUMP_H, con margen
const FROG_SPEED = 340;
const FOLLOW_LINE = H * 0.38;       // altura de pantalla donde "vive" la cámara

let running = false;
let score = 0;
let bonus = 0;
let best = Number(localStorage.getItem?.("ranas_best") || 0) || 0;
let lives = 3;
let invuln = 0;
let last = 0;
let camY = 0;          // cámara: solo sube, nunca retrocede
let difficulty = 1;
let condorTimer = 0;
const keys = {};

const frog = {
  x: W / 2, y: 0, w: 40, h: 32,
  vx: 0, vy: 0,
  facing: 1
};

let pads = [];
let condors = [];
let particles = [];
let floaters = []; // textos flotantes tipo "+30"

function randRange(a, b) { return a + Math.random() * (b - a); }

function reset() {
  score = 0;
  bonus = 0;
  lives = 3;
  invuln = 0;
  difficulty = 1;
  camY = 0;
  condorTimer = 3;

  frog.x = W / 2;
  frog.y = H - 90;
  frog.vx = 0;
  frog.vy = -JUMP_V; // arranca ya rebotando, como en Doodle Jump

  pads = [
    { x: W / 2, y: H - 40, r: 60, start: true, moving: false, vx: 0 }
  ];
  let topY = H - 40;
  while (topY > -H) {
    topY -= randRange(PAD_GAP_MIN, PAD_GAP_MAX - 30);
    pads.push(makePad(topY));
  }

  condors = [];
  particles = [];
  floaters = [];
  scoreEl.textContent = score;
  bestEl.textContent = best;
}

function makePad(y) {
  const r = randRange(26, 42);
  const moving = Math.random() < Math.min(0.35, 0.08 + difficulty * 0.03);
  return {
    x: randRange(r + 10, W - r - 10),
    y, r, start: false,
    moving,
    vx: moving ? (Math.random() < 0.5 ? -1 : 1) * randRange(50, 90 + difficulty * 8) : 0
  };
}

function topPadY() {
  return pads.reduce((min, p) => Math.min(min, p.y), Infinity);
}

function start() {
  reset();
  running = true;
  startBtn.textContent = "Reiniciar";
  message.textContent = "¡La rana rebota sola! Muévete con ← → y esquiva o salta los cóndores.";
  last = performance.now();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === "r") start();
});
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);
startBtn.addEventListener("click", start);

// Controles táctiles: mitad izquierda/derecha del canvas
canvas.addEventListener("touchstart", handleTouch, { passive: true });
canvas.addEventListener("touchmove", handleTouch, { passive: true });
canvas.addEventListener("touchend", () => { keys["arrowleft"] = keys["arrowright"] = false; });
function handleTouch(e) {
  const rect = canvas.getBoundingClientRect();
  const t = e.touches[0];
  const x = (t.clientX - rect.left) * (W / rect.width);
  keys["arrowleft"] = x < W / 2;
  keys["arrowright"] = x >= W / 2;
}

function spawnCondorIfDue(dt) {
  condorTimer -= dt;
  if (condorTimer > 0) return;
  condorTimer = Math.max(2.2, 5.5 - difficulty * 0.18);

  const fromLeft = Math.random() < 0.5;
  const speed = randRange(120, 170) + difficulty * 10;
  condors.push({
    x: fromLeft ? -60 : W + 60,
    y: camY - randRange(30, 90),
    w: 62, h: 30,
    vx: fromLeft ? speed : -speed,
    wingPhase: Math.random() * Math.PI * 2,
    passed: false,
    wasBelow: true,
    hitCooldown: 0
  });
}

function update(dt) {
  difficulty += dt * 0.02;

  // --- movimiento horizontal ---
  frog.vx = 0;
  if (keys["arrowleft"] || keys["a"]) { frog.vx = -FROG_SPEED; frog.facing = -1; }
  if (keys["arrowright"] || keys["d"]) { frog.vx = FROG_SPEED; frog.facing = 1; }
  frog.x += frog.vx * dt;
  if (frog.x < -frog.w) frog.x = W + frog.w;
  if (frog.x > W + frog.w) frog.x = -frog.w;

  // --- gravedad y salto (en coordenadas de mundo) ---
  frog.vy += GRAVITY * dt;
  frog.y += frog.vy * dt;

  // --- colisión con nenúfares (solo cuando cae) ---
  if (frog.vy > 0) {
    for (const p of pads) {
      const dx = frog.x - p.x;
      const dy = (frog.y + frog.h / 2) - p.y;
      if (Math.abs(dx) < p.r + frog.w * 0.35 && dy > -14 && dy < p.r * 0.6) {
        frog.y = p.y - frog.h;
        frog.vy = -JUMP_V;
        burst(frog.x, p.y, "#c40d89");
      }
    }
  }

  // --- plataformas que se mueven de lado a lado ---
  for (const p of pads) {
    if (p.moving) {
      p.x += p.vx * dt;
      if (p.x < p.r + 6 || p.x > W - p.r - 6) p.vx *= -1;
    }
  }

  // --- cámara: solo sube, nunca retrocede ---
  camY = Math.min(camY, frog.y - FOLLOW_LINE);

  // --- reciclar nenúfares que quedaron fuera de pantalla por abajo ---
  for (const p of pads) {
    const screenY = p.y - camY;
    if (screenY > H + 70) {
      const ny = topPadY() - randRange(PAD_GAP_MIN, PAD_GAP_MAX);
      Object.assign(p, makePad(ny));
    }
  }

  // --- cóndores ---
  spawnCondorIfDue(dt);
  for (const c of condors) {
    c.x += c.vx * dt;
    c.wingPhase += dt * 10;
    if (c.hitCooldown > 0) c.hitCooldown -= dt;

    const belowNow = frog.y > c.y;
    // Colisión directa -> golpe
    const dx = Math.abs(frog.x - c.x);
    const dy = Math.abs((frog.y + frog.h / 2) - c.y);
    if (invuln <= 0 && dx < (c.w / 2 + frog.w / 2 - 6) && dy < (c.h / 2 + frog.h / 2 - 6)) {
      lives--;
      invuln = 1.4;
      frog.vy = -JUMP_V * 0.7;
      burst(frog.x, frog.y, "#e63946");
      floaters.push({ x: frog.x, y: frog.y - 30, text: "¡Cóndor!", color: "#e63946", life: 1 });
      if (lives <= 0) {
        endGame();
      } else {
        message.textContent = `¡Un cóndor te golpeó! Vidas: ${lives}`;
      }
    }
    // Cruce limpio por encima -> bono
    if (!c.passed && c.wasBelow && !belowNow) {
      c.passed = true;
      if (dx < c.w / 2 + 60) {
        bonus += 30;
        floaters.push({ x: c.x, y: c.y - 10, text: "+30 ¡Salto de cóndor!", color: "#f4a300", life: 1.1 });
        burst(c.x, c.y, "#f4a300");
      }
    }
    c.wasBelow = belowNow;
  }
  condors = condors.filter(c => (c.y - camY) < H + 100 && (c.y - camY) > -400);

  // --- partículas y textos flotantes ---
  particles.forEach(p => {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.life -= dt;
  });
  particles = particles.filter(p => p.life > 0);

  floaters.forEach(f => { f.y -= 40 * dt; f.life -= dt; });
  floaters = floaters.filter(f => f.life > 0);

  if (invuln > 0) invuln -= dt;

  // --- puntaje: altura escalada + bonos de cóndor ---
  const heightScore = Math.max(0, Math.floor(-camY / 8));
  score = heightScore + bonus;
  scoreEl.textContent = score;

  // --- fin del juego: caer por debajo de la pantalla visible ---
  if (frog.y - camY > H + 90) {
    endGame();
  }
}

function endGame() {
  running = false;
  if (score > best) {
    best = score;
    try { localStorage.setItem?.("ranas_best", String(best)); } catch (e) {}
  }
  bestEl.textContent = best;
  message.innerHTML = `Fin del juego. Puntuación: <b>${score}</b> (récord: ${best}). Pulsa Reiniciar.`;
}

function burst(x, y, color) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - .5) * 200,
      vy: -Math.random() * 180,
      life: .5,
      color
    });
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = "#bde8e3";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255,255,255,.38)";
  ctx.lineWidth = 2;
  for (let y = 35; y < H; y += 55) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < W; x += 70) {
      ctx.quadraticCurveTo(x + 18, y - 5, x + 35, y);
      ctx.quadraticCurveTo(x + 52, y + 5, x + 70, y);
    }
    ctx.stroke();
  }

  for (const p of pads) drawPad(p, p.y - camY);
  for (const c of condors) drawCondor(c, c.x, c.y - camY);

  drawFrog(frog.x, frog.y - camY);

  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color || "#c40d89";
    ctx.beginPath();
    ctx.arc(p.x, p.y - camY, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  floaters.forEach(f => {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.color;
    ctx.font = "800 14px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(f.text, f.x, f.y - camY);
    ctx.textAlign = "left";
  });
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(22,15,65,.75)";
  ctx.font = "800 15px Inter, sans-serif";
  ctx.fillText(`VIDAS: ${"♥".repeat(Math.max(0, lives))}`, 20, 30);
}

function drawPad(p, screenY) {
  if (screenY < -80 || screenY > H + 80) return;
  ctx.save();
  ctx.translate(p.x, screenY);
  ctx.fillStyle = p.start ? "#4fae68" : (p.moving ? "#3f9d55" : "#68b96f");
  ctx.beginPath();
  ctx.arc(0, 0, p.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#bde8e3";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(p.r, -5);
  ctx.arc(0, 0, p.r, -0.08, 0.45);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,.25)";
  ctx.beginPath();
  ctx.arc(-p.r * .3, -p.r * .3, p.r * .16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFrog(x, screenY) {
  ctx.save();
  ctx.translate(x, screenY);
  if (invuln > 0 && Math.floor(invuln * 12) % 2 === 0) ctx.globalAlpha = 0.35;

  ctx.fillStyle = "#c40d89";
  ctx.beginPath();
  ctx.ellipse(0, 8, 21, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const ex of [-12, 12]) {
    ctx.fillStyle = "#c40d89";
    ctx.beginPath();
    ctx.arc(ex, -10, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#160f41";
    ctx.beginPath();
    ctx.arc(ex, -11, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "#8e075f";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-13, 18); ctx.lineTo(-25, 27);
  ctx.moveTo(13, 18); ctx.lineTo(25, 27);
  ctx.stroke();

  ctx.strokeStyle = "#160f41";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 4, 8, 0.15, Math.PI - 0.15);
  ctx.stroke();

  ctx.restore();
}

function drawCondor(c, x, screenY) {
  if (screenY < -80 || screenY > H + 80) return;
  const flap = Math.sin(c.wingPhase) * 12;
  const dir = c.vx >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(x, screenY);
  ctx.scale(dir, 1);

  // sombra corta
  ctx.fillStyle = "rgba(22,15,65,.12)";
  ctx.beginPath();
  ctx.ellipse(0, 20, 26, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // alas
  ctx.fillStyle = "#2b2438";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-30, -8 - flap, -34, 4 - flap);
  ctx.quadraticCurveTo(-16, 6, 0, 4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(30, -8 - flap, 34, 4 - flap);
  ctx.quadraticCurveTo(16, 6, 0, 4);
  ctx.closePath();
  ctx.fill();

  // cuerpo
  ctx.fillStyle = "#160f41";
  ctx.beginPath();
  ctx.ellipse(0, 2, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // collar blanco (cóndor andino)
  ctx.strokeStyle = "#f4f4f4";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(6, -1, 6, -0.6, 2.2);
  ctx.stroke();

  // cabeza
  ctx.fillStyle = "#c9403f";
  ctx.beginPath();
  ctx.arc(11, -5, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function loop(now) {
  if (!running) { draw(); return; }
  const dt = Math.min((now - last) / 1000, .033);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

reset();
draw();
