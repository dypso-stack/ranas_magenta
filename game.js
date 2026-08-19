const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const message = document.getElementById("message");
const startBtn = document.getElementById("startBtn");

const W = canvas.width;
const H = canvas.height;

let running = false;
let score = 0;
let lives = 3;
let last = 0;
let spawnTimer = 0;
let difficulty = 1;
const keys = {};

const frog = {
  x: W / 2, y: H - 75, w: 42, h: 34,
  vx: 0, vy: 0, speed: 320, jump: 590,
  onGround: true
};

let pads = [];
let particles = [];

function reset() {
  score = 0;
  lives = 3;
  difficulty = 1;
  pads = [
    // Plataforma inicial: la rana siempre comienza sobre ella.
    {x: W / 2, y: H - 35, r: 82, vx: 0, start: true},
    {x: 110, y: 390, r: 42, vx: 0},
    {x: 350, y: 300, r: 38, vx: 0},
    {x: 610, y: 215, r: 42, vx: 0},
    {x: 800, y: 125, r: 36, vx: 0}
  ];
  particles = [];
  frog.x = W / 2;
  frog.y = H - 75;
  frog.vx = frog.vy = 0;
  frog.onGround = true;
  scoreEl.textContent = score;
}

function start() {
  reset();
  running = true;
  startBtn.textContent = "Reiniciar";
  message.textContent = "¡Salta de nenúfar en nenúfar!";
  last = performance.now();
  requestAnimationFrame(loop);
}

function jump() {
  if (!running) return;
  if (frog.onGround) {
    frog.vy = -frog.jump;
    frog.onGround = false;
  }
}

window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.code === "Space") { e.preventDefault(); jump(); }
  if (e.key.toLowerCase() === "r") start();
});

window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

startBtn.addEventListener("click", start);

function spawnPad() {
  pads.push({
    x: W + 50,
    y: 90 + Math.random() * 300,
    r: 28 + Math.random() * 16,
    vx: -(70 + difficulty * 20)
  });
}

function update(dt) {
  difficulty += dt * 0.015;

  frog.vx = 0;
  if (keys["arrowleft"] || keys["a"]) frog.vx = -frog.speed;
  if (keys["arrowright"] || keys["d"]) frog.vx = frog.speed;

  frog.x += frog.vx * dt;
  frog.x = Math.max(24, Math.min(W - 24, frog.x));

  frog.vy += 1500 * dt;
  frog.y += frog.vy * dt;
  frog.onGround = false;

  for (const p of pads) {
    p.x += p.vx * dt;
    if (!p.start && p.x < -70) {
      p.x = W + 60;
      p.y = 80 + Math.random() * 330;
      p.r = 28 + Math.random() * 16;
      score++;
      scoreEl.textContent = score;
    }

    const dx = frog.x - p.x;
    const dy = (frog.y + frog.h / 2) - p.y;
    const distance = Math.hypot(dx, dy);

    if (frog.vy > 0 && distance < p.r + 18 && frog.y < p.y && frog.y + frog.h > p.y - 20) {
      frog.y = p.y - frog.h;
      frog.vy = -390 - Math.min(score * 3, 160);
      frog.onGround = true;
      burst(frog.x, p.y);
    }
  }

  if (frog.y > H + 60) {
    lives--;
    if (lives <= 0) {
      running = false;
      message.innerHTML = `Fin del juego. Puntuación: <b>${score}</b>. Pulsa Reiniciar para volver a jugar.`;
    } else {
      frog.x = W / 2;
      frog.y = H - 75;
      frog.vy = 0;
      message.textContent = `¡Cuidado! Te quedan ${lives} vidas.`;
    }
  }

  spawnTimer += dt;
  if (spawnTimer > Math.max(.9, 2.1 - difficulty * .03)) {
    spawnTimer = 0;
    spawnPad();
  }

  particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 500 * dt;
    p.life -= dt;
  });
  particles = particles.filter(p => p.life > 0);
}

function burst(x, y) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - .5) * 180,
      vy: -Math.random() * 160,
      life: .5
    });
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  // Water
  ctx.fillStyle = "#bde8e3";
  ctx.fillRect(0, 0, W, H);

  // Subtle water lines
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

  // Pads
  for (const p of pads) drawPad(p);

  // Frog
  drawFrog(frog.x, frog.y);

  // Particles
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = "#c40d89";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // HUD
  ctx.fillStyle = "rgba(22,15,65,.75)";
  ctx.font = "800 15px Inter, sans-serif";
  ctx.fillText(`VIDAS: ${"♥".repeat(lives)}`, 20, 30);
}

function drawPad(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = p.start ? "#4fae68" : "#68b96f";
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
  ctx.arc(-p.r*.3, -p.r*.3, p.r*.16, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawFrog(x, y) {
  ctx.save();
  ctx.translate(x, y);

  // body
  ctx.fillStyle = "#c40d89";
  ctx.beginPath();
  ctx.ellipse(0, 8, 21, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // eyes
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

  // legs
  ctx.strokeStyle = "#8e075f";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-13, 18); ctx.lineTo(-25, 27);
  ctx.moveTo(13, 18); ctx.lineTo(25, 27);
  ctx.stroke();

  // smile
  ctx.strokeStyle = "#160f41";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 4, 8, 0.15, Math.PI - 0.15);
  ctx.stroke();

  ctx.restore();
}

function loop(now) {
  if (!running) {
    draw();
    return;
  }
  const dt = Math.min((now - last) / 1000, .033);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

reset();
draw();
