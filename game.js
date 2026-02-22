const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');

const WORLD_W = 64;
const WORLD_H = 32;
const WORLD_D = 64;

const AIR = 0;
const GRASS = 1;
const DIRT = 2;
const STONE = 3;
const WOOD = 4;
const LEAF = 5;

const blocks = new Uint8Array(WORLD_W * WORLD_H * WORLD_D);

function idx(x, y, z) {
  return x + z * WORLD_W + y * WORLD_W * WORLD_D;
}

function inBounds(x, y, z) {
  return x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H && z >= 0 && z < WORLD_D;
}

function getBlock(x, y, z) {
  if (!inBounds(x, y, z)) return AIR;
  return blocks[idx(x, y, z)];
}

function setBlock(x, y, z, value) {
  if (!inBounds(x, y, z)) return;
  blocks[idx(x, y, z)] = value;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function makeWorld() {
  for (let x = 0; x < WORLD_W; x++) {
    for (let z = 0; z < WORLD_D; z++) {
      const hill =
        8 +
        Math.sin(x * 0.15) * 2.8 +
        Math.cos(z * 0.17) * 3.2 +
        Math.sin((x + z) * 0.08) * 2.2 +
        Math.random() * 1.8;
      const h = clamp(Math.floor(hill), 3, WORLD_H - 6);
      for (let y = 0; y <= h; y++) {
        if (y === h) setBlock(x, y, z, GRASS);
        else if (y > h - 3) setBlock(x, y, z, DIRT);
        else setBlock(x, y, z, STONE);
      }

      if (Math.random() < 0.02 && h > 7) {
        const trunk = 3 + Math.floor(Math.random() * 2);
        for (let t = 1; t <= trunk; t++) setBlock(x, h + t, z, WOOD);
        for (let lx = -2; lx <= 2; lx++) {
          for (let lz = -2; lz <= 2; lz++) {
            for (let ly = trunk - 1; ly <= trunk + 1; ly++) {
              const dist = Math.abs(lx) + Math.abs(lz) + Math.abs(ly - trunk);
              if (dist <= 3) setBlock(x + lx, h + ly, z + lz, LEAF);
            }
          }
        }
      }
    }
  }
}

const player = {
  x: WORLD_W / 2,
  y: 20,
  z: WORLD_D / 2,
  vx: 0,
  vy: 0,
  vz: 0,
  yaw: 0,
  pitch: 0,
  width: 0.35,
  height: 1.8,
  onGround: false,
};

const keys = new Set();
let pointerLocked = false;

function isSolidAt(x, y, z) {
  return getBlock(Math.floor(x), Math.floor(y), Math.floor(z)) !== AIR;
}

function collides(px, py, pz) {
  const r = player.width;
  const minX = Math.floor(px - r);
  const maxX = Math.floor(px + r);
  const minY = Math.floor(py);
  const maxY = Math.floor(py + player.height);
  const minZ = Math.floor(pz - r);
  const maxZ = Math.floor(pz + r);

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (getBlock(x, y, z) !== AIR) return true;
      }
    }
  }
  return false;
}

function dirFromAngles(yaw, pitch) {
  const cp = Math.cos(pitch);
  return {
    x: Math.sin(yaw) * cp,
    y: Math.sin(pitch),
    z: Math.cos(yaw) * cp,
  };
}

function raycast(maxDist = 6, step = 0.05) {
  const eyeY = player.y + player.height * 0.9;
  const dir = dirFromAngles(player.yaw, player.pitch);
  let last = { x: Math.floor(player.x), y: Math.floor(eyeY), z: Math.floor(player.z) };

  for (let t = 0; t <= maxDist; t += step) {
    const x = player.x + dir.x * t;
    const y = eyeY + dir.y * t;
    const z = player.z + dir.z * t;
    const bx = Math.floor(x);
    const by = Math.floor(y);
    const bz = Math.floor(z);

    if (!inBounds(bx, by, bz)) break;
    if (getBlock(bx, by, bz) !== AIR) {
      return {
        hit: { x: bx, y: by, z: bz },
        place: last,
      };
    }
    last = { x: bx, y: by, z: bz };
  }
  return null;
}

const COLORS = {
  [GRASS]: '#5fb84d',
  [DIRT]: '#8a5a38',
  [STONE]: '#a3adba',
  [WOOD]: '#8f633f',
  [LEAF]: '#419347',
};

const FACE_DEFS = [
  { n: [0, 0, 1], shade: 1.0, c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], shade: 0.65, c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
  { n: [1, 0, 0], shade: 0.8, c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { n: [-1, 0, 0], shade: 0.75, c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { n: [0, 1, 0], shade: 1.15, c: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
  { n: [0, -1, 0], shade: 0.55, c: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]] },
];

function shadeHex(hex, factor) {
  const r = Math.floor(parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.floor(parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.floor(parseInt(hex.slice(5, 7), 16) * factor);
  return `rgb(${clamp(r, 0, 255)}, ${clamp(g, 0, 255)}, ${clamp(b, 0, 255)})`;
}

function project(wx, wy, wz, fov) {
  const dx = wx - player.x;
  const dy = wy - (player.y + player.height * 0.9);
  const dz = wz - player.z;

  const cosy = Math.cos(-player.yaw);
  const siny = Math.sin(-player.yaw);
  const x1 = dx * cosy - dz * siny;
  const z1 = dx * siny + dz * cosy;

  const cosp = Math.cos(-player.pitch);
  const sinp = Math.sin(-player.pitch);
  const y2 = dy * cosp - z1 * sinp;
  const z2 = dy * sinp + z1 * cosp;

  if (z2 <= 0.05) return null;

  const sx = canvas.width / 2 + (x1 / z2) * fov;
  const sy = canvas.height / 2 - (y2 / z2) * fov;
  return { sx, sy, z: z2 };
}

function render() {
  ctx.fillStyle = '#86c5ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
  ctx.fillStyle = '#9fcf6b';
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

  const fov = canvas.height * 0.9;
  const faces = [];

  const radius = 18;
  const minX = clamp(Math.floor(player.x) - radius, 0, WORLD_W - 1);
  const maxX = clamp(Math.floor(player.x) + radius, 0, WORLD_W - 1);
  const minY = clamp(Math.floor(player.y) - 8, 0, WORLD_H - 1);
  const maxY = clamp(Math.floor(player.y) + 16, 0, WORLD_H - 1);
  const minZ = clamp(Math.floor(player.z) - radius, 0, WORLD_D - 1);
  const maxZ = clamp(Math.floor(player.z) + radius, 0, WORLD_D - 1);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const block = getBlock(x, y, z);
        if (block === AIR) continue;

        for (const face of FACE_DEFS) {
          const nx = x + face.n[0];
          const ny = y + face.n[1];
          const nz = z + face.n[2];
          if (getBlock(nx, ny, nz) !== AIR) continue;

          const pts = [];
          let depth = 0;
          let hidden = false;
          for (const corner of face.c) {
            const p = project(x + corner[0], y + corner[1], z + corner[2], fov);
            if (!p) {
              hidden = true;
              break;
            }
            depth += p.z;
            pts.push(p);
          }
          if (hidden) continue;

          faces.push({
            pts,
            depth: depth / 4,
            color: shadeHex(COLORS[block], face.shade),
          });
        }
      }
    }
  }

  faces.sort((a, b) => b.depth - a.depth);
  for (const f of faces) {
    ctx.beginPath();
    ctx.moveTo(f.pts[0].sx, f.pts[0].sy);
    for (let i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i].sx, f.pts[i].sy);
    ctx.closePath();
    ctx.fillStyle = f.color;
    ctx.fill();
  }

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 8, centerY);
  ctx.lineTo(centerX + 8, centerY);
  ctx.moveTo(centerX, centerY - 8);
  ctx.lineTo(centerX, centerY + 8);
  ctx.stroke();

  const hit = raycast();
  if (hit) {
    const p = project(hit.hit.x + 0.5, hit.hit.y + 0.5, hit.hit.z + 0.5, fov);
    if (p) {
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(p.sx - 8, p.sy - 8, 16, 16);
    }
  }
}

function update(dt) {
  const moveSpeed = keys.has('shift') ? 8.5 : 5.8;
  const forward = (keys.has('w') ? 1 : 0) - (keys.has('s') ? 1 : 0);
  const right = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);

  const norm = Math.hypot(forward, right) || 1;
  const fx = (Math.sin(player.yaw) * forward + Math.cos(player.yaw) * right) / norm;
  const fz = (Math.cos(player.yaw) * forward - Math.sin(player.yaw) * right) / norm;

  player.vx = fx * moveSpeed;
  player.vz = fz * moveSpeed;

  player.vy -= 20 * dt;
  if (player.onGround && keys.has(' ')) {
    player.vy = 7.2;
    player.onGround = false;
  }

  let nx = player.x + player.vx * dt;
  if (!collides(nx, player.y, player.z)) player.x = nx;

  let nz = player.z + player.vz * dt;
  if (!collides(player.x, player.y, nz)) player.z = nz;

  let ny = player.y + player.vy * dt;
  if (!collides(player.x, ny, player.z)) {
    player.y = ny;
    player.onGround = false;
  } else {
    if (player.vy < 0) player.onGround = true;
    player.vy = 0;
  }

  player.x = clamp(player.x, 1, WORLD_W - 2);
  player.z = clamp(player.z, 1, WORLD_D - 2);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.03, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
window.addEventListener('keydown', (e) => {
  keys.add(e.key.toLowerCase());
  if (e.key === ' ') e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

canvas.addEventListener('mousedown', (e) => {
  if (!pointerLocked) {
    canvas.requestPointerLock();
    return;
  }
  const hit = raycast();
  if (!hit) return;

  if (e.button === 0) {
    setBlock(hit.hit.x, hit.hit.y, hit.hit.z, AIR);
  } else if (e.button === 2) {
    const { x, y, z } = hit.place;
    if (!collides(x + 0.5, y, z + 0.5)) setBlock(x, y, z, GRASS);
  }
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
  overlay.classList.toggle('hidden', pointerLocked);
});

document.addEventListener('mousemove', (e) => {
  if (!pointerLocked) return;
  player.yaw += e.movementX * 0.0028;
  player.pitch = clamp(player.pitch - e.movementY * 0.0022, -1.45, 1.45);
});

makeWorld();
resize();
loop(last);
