// WebGL glass tiles for the memories atlas. Every tile is one instance of a small quad drawn
// twice: a shadow/glow pass, then the glass pass, so a neighbour's shadow never lands on a
// tile. Thumbnails stream into two pooled texture arrays (128 px cells for most tiles,
// 256 px cells for tiles that are large on screen and for letter cards), cell by cell.
import * as THREE from 'three';
import { TILE, type Camera, type Layout } from '../atlasLayout';
import type { GlassAtlasRenderer, GlassLetterCard, GlassPick, GlassTile } from './types';

const FOV = 32;
const FOCAL = 0.5 / Math.tan((FOV * Math.PI) / 360); // screen-height multiplier for the focal length
// How far the grid falls away toward the screen edges. The fall levels off beyond CURVE_REACH
// half-screens so far tiles keep sliding off screen instead of folding back toward the centre.
const CURVE = 0.18;
const CURVE_REACH = 1.4;
const MARGIN = 0.2; // quad padding around a tile, in tile widths, for the shadow and glow
const PAGE = 1024;
const LO = { cell: 128, layers: 16 };
const HI = { cell: 256, layers: 4 };
const CARD_SLOTS = 20; // the first hi-res cells belong to letter cards
const LO_MIN_PX = 40;
const HI_MIN_PX = 160;
const MAX_LOADS = 12;
const EASE_MS = 200;

const vertexShader = /* glsl */ `
  in vec2 aCenter;
  in vec3 aColor;
  in vec3 aLo;
  in vec3 aHi;
  in vec3 aState; // dim, glow, scale
  uniform vec2 uCam;
  uniform float uZoom;
  uniform float uHalfMin;
  uniform float uCurve;
  uniform float uReach;
  uniform float uTile;
  uniform float uFocal;
  uniform float uPixelRatio;
  out vec2 vLocal;
  flat out float vAa;
  flat out vec3 vColor;
  flat out vec3 vLo;
  flat out vec3 vHi;
  flat out vec3 vState;
  void main() {
    vLocal = vec2(position.x, -position.y); // y down, like the rest of the atlas
    vColor = aColor;
    vLo = aLo;
    vHi = aHi;
    vState = aState;
    vec2 world = aCenter + vLocal * uTile * aState.z;
    // The grid curves, not the tile: each tile falls back as one flat piece from its centre,
    // so its triangles stay coplanar and the photo has no seam along their shared edge.
    vec2 fromCentre = (aCenter - uCam) * uZoom / uHalfMin;
    float r2 = dot(fromCentre, fromCentre);
    float fall = uCurve * r2 / (1.0 + r2 / (uReach * uReach)) * uHalfMin / uZoom;
    // Edge smoothing width in tile units, from the tile's size on screen. Screen-space
    // derivatives (fwidth) are unreliable along the quad's internal edge on some GPUs.
    float distance = uFocal / uZoom;
    vAa = 0.75 / (uTile * aState.z * uZoom * distance / (distance + fall) * uPixelRatio);
    gl_Position = projectionMatrix * viewMatrix * vec4(world.x, -world.y, -fall, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  precision highp sampler2DArray;
  uniform sampler2DArray uLo;
  uniform sampler2DArray uHi;
  uniform vec4 uCells; // lo cell / page, hi cell / page, lo inset, hi inset
  uniform int uPass; // 0: shadow and glow, 1: glass
  in vec2 vLocal;
  flat in vec3 vColor;
  flat in vec3 vLo;
  flat in vec3 vHi;
  flat in vec3 vState;
  flat in float vAa;
  out vec4 outColor;

  const float RADIUS = 0.18;
  const float BEVEL = 0.08;
  const vec3 PINK = vec3(0.76, 0.094, 0.357);

  float box(vec2 p) {
    vec2 q = abs(p) - vec2(0.5 - RADIUS);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - RADIUS;
  }

  vec3 photo(vec2 uv) {
    uv = clamp(uv, 0.0, 1.0);
    if (vHi.x >= 0.0) {
      vec2 cell = (vHi.yz + mix(vec2(uCells.w), vec2(1.0 - uCells.w), uv)) * uCells.y;
      return textureLod(uHi, vec3(cell, vHi.x), 0.0).rgb;
    }
    if (vLo.x >= 0.0) {
      vec2 cell = (vLo.yz + mix(vec2(uCells.z), vec2(1.0 - uCells.z), uv)) * uCells.x;
      return textureLod(uLo, vec3(cell, vLo.x), 0.0).rgb;
    }
    return vColor;
  }

  void main() {
    vec2 p = vLocal;
    float d = box(p);
    float aa = vAa;
    float dim = vState.x;
    float glow = vState.y;

    if (uPass == 0) {
      // A rose-tinted shadow, so it reads as depth on the pink page rather than grey dirt.
      float shadow = 0.2 * (1.0 - smoothstep(-0.06, 0.16, box(p - vec2(0.0, 0.045)))) * (1.0 - 0.75 * dim);
      float halo = glow * (1.0 - smoothstep(0.0, 0.05 + 0.06 * glow, d)) * step(0.0, d);
      float alpha = halo + shadow * (1.0 - halo);
      outColor = vec4(PINK * halo + vec3(0.42, 0.12, 0.25) * shadow * (1.0 - halo), alpha);
      return;
    }

    float coverage = 1.0 - smoothstep(-aa, aa, d);
    if (coverage <= 0.0) discard;

    // Lens: inside the bevel band the photo bends toward the rim. The colour split stays
    // around a pixel at the very rim; wider, it read as a rainbow sheen across the photo.
    float e = clamp(1.0 + d / BEVEL, 0.0, 1.0);
    vec2 h = vec2(0.002, 0.0);
    vec2 n = normalize(vec2(box(p + h.xy) - box(p - h.xy), box(p + h.yx) - box(p - h.yx)) + 1e-6);
    vec2 bend = -n * e * e * 0.04;
    vec2 uv = p + 0.5;
    vec3 col = vec3(photo(uv + bend).r, photo(uv + bend * 0.97).g, photo(uv + bend * 0.94).b);

    col = mix(col, vec3(1.0), 0.04); // a touch of milkiness from the glass body
    col *= 1.0 - 0.2 * smoothstep(0.2, 0.5, p.y) * e; // thicker glass reads darker at the bottom
    col = mix(col, col * 0.78, smoothstep(-0.014, 0.0, d)); // dark contact line at the very edge

    vec2 light = normalize(vec2(-0.6, -0.8));
    float sheen = 0.16 * smoothstep(0.75, -0.7, p.x + p.y) * (1.0 - smoothstep(-0.15, 0.45, p.y));
    float streak = 0.3 * exp(-pow((p.x + p.y + 0.52) * 13.0, 2.0)) * smoothstep(0.15, -0.35, p.y);
    float rim = pow(e, 3.0) * (0.22 + 0.4 * max(dot(n, light), 0.0));
    col += vec3(sheen + streak + rim);

    float grey = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(grey), 0.85 * dim);
    col = mix(col, PINK, glow * 0.65 * smoothstep(-0.03, 0.0, d)); // pink rim on matches
    float alpha = coverage * (1.0 - 0.78 * dim);
    outColor = vec4(min(col, 1.0) * alpha, alpha);
  }
`;

class Pool {
  readonly perRow: number;
  readonly perLayer: number;
  readonly owner: Int32Array;
  readonly lastUsed: Float64Array;
  readonly texture: THREE.DataArrayTexture;

  constructor(readonly cell: number, layers: number, readonly reserved = 0) {
    this.perRow = PAGE / cell;
    this.perLayer = this.perRow * this.perRow;
    this.owner = new Int32Array(this.perLayer * layers).fill(-1);
    this.lastUsed = new Float64Array(this.perLayer * layers);
    this.texture = new THREE.DataArrayTexture(null, PAGE, PAGE, layers);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.source.dataReady = false; // allocate on the GPU only; cells are filled one by one
    this.texture.needsUpdate = true; // the one and only full upload, which just allocates
  }

  coords(slot: number) {
    const within = slot % this.perLayer;
    return { layer: Math.floor(slot / this.perLayer), x: within % this.perRow, y: Math.floor(within / this.perRow) };
  }

  /** A free cell, else the least recently used one not seen in this frame. */
  take(tile: number, frame: number): { slot: number; evicted: number } | null {
    let best = -1;
    for (let slot = this.reserved; slot < this.owner.length; slot++) {
      if (this.owner[slot] < 0) { best = slot; break; }
      if (this.lastUsed[slot] < frame && (best < 0 || this.lastUsed[slot] < this.lastUsed[best])) best = slot;
    }
    if (best < 0) return null;
    const evicted = this.owner[best];
    this.owner[best] = tile;
    this.lastUsed[best] = frame;
    return { slot: best, evicted };
  }
}

type Metrics = { x: Float32Array; y: Float32Array; size: Float32Array };

function parseColor(hex: string) {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return Number.isFinite(value) ? [(value >> 16 & 255) / 255, (value >> 8 & 255) / 255, (value & 255) / 255] : [0.9, 0.84, 0.87];
}

function wrap(context: CanvasRenderingContext2D, text: string, width: number, maxLines: number) {
  const lines: string[] = [];
  for (const word of text.split(/\s+/)) {
    const last = lines.at(-1);
    if (last !== undefined && context.measureText(`${last} ${word}`).width <= width) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines.length > maxLines ? [...lines.slice(0, maxLines - 1), `${lines[maxLines - 1]}…`] : lines;
}

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sw = width / scale;
  const sh = height / scale;
  context.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, x, y, width, height);
}

export function createGlassRenderer(canvas: HTMLCanvasElement): GlassAtlasRenderer | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true });
  } catch {
    return null; // three needs WebGL 2
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 10);
  const lo = new Pool(LO.cell, LO.layers);
  const hi = new Pool(HI.cell, HI.layers, CARD_SLOTS);
  renderer.initTexture(lo.texture);
  renderer.initTexture(hi.texture);
  const scratch = { lo: document.createElement('canvas'), hi: document.createElement('canvas') };
  scratch.lo.width = scratch.lo.height = LO.cell;
  scratch.hi.width = scratch.hi.height = HI.cell;

  const uniforms = {
    uCam: { value: new THREE.Vector2() },
    uZoom: { value: 1 },
    uHalfMin: { value: 400 },
    uCurve: { value: CURVE },
    uReach: { value: CURVE_REACH },
    uTile: { value: TILE },
    uFocal: { value: 1 },
    uPixelRatio: { value: 1 },
    uLo: { value: lo.texture },
    uHi: { value: hi.texture },
    uCells: { value: new THREE.Vector4(LO.cell / PAGE, HI.cell / PAGE, 1.5 / LO.cell, 1.5 / HI.cell) },
    uPass: { value: 0 },
  };
  // Both passes share the same uniform objects (ShaderMaterial does not clone them), except uPass.
  const material = (pass: number) => new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader,
    fragmentShader,
    uniforms: { ...uniforms, uPass: { value: pass } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    premultipliedAlpha: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const materials = [material(0), material(1)];

  let tiles: GlassTile[] = [];
  let positions: Layout['positions'] = [];
  let geometry: THREE.InstancedBufferGeometry | null = null;
  let meshes: THREE.Mesh[] = [];
  let attributes: Record<'aCenter' | 'aColor' | 'aLo' | 'aHi' | 'aState', THREE.InstancedBufferAttribute> | null = null;
  let target = new Float32Array(0);
  let from = new Float32Array(0);
  let easeStart = 0;
  let loSlot = new Int32Array(0);
  let hiSlot = new Int32Array(0);
  let metrics: Metrics = { x: new Float32Array(0), y: new Float32Array(0), size: new Float32Array(0) };
  const loading = new Set<number>();
  const failed = new Set<string>();
  let inFlight = 0;
  let generation = 0;

  let cam: Camera = { x: 0, y: 0, zoom: 1 };
  let width = 1;
  let height = 1;
  let matches: Map<number, number> | null = null;
  let cards: GlassLetterCard[] = [];
  const cardImages = new Map<string, HTMLImageElement | 'loading' | 'error'>();
  let frame = 0;
  let pending = 0;
  let disposed = false;

  const halfMin = () => Math.min(width, height) / 2;

  // Same projection as the vertex shader, for picking and for deciding what to load.
  function project(x: number, y: number) {
    const focal = height * FOCAL;
    const distance = focal / cam.zoom;
    const dx = (x - cam.x) * cam.zoom;
    const dy = (y - cam.y) * cam.zoom;
    const r2 = (dx * dx + dy * dy) / halfMin() ** 2;
    const fall = CURVE * r2 / (1 + r2 / CURVE_REACH ** 2) * halfMin() / cam.zoom;
    const k = distance / (distance + fall);
    return { x: width / 2 + dx * k, y: height / 2 + dy * k, k };
  }

  function updateCamera() {
    const focal = height * FOCAL;
    const distance = focal / cam.zoom;
    camera.aspect = width / height;
    camera.position.set(cam.x, -cam.y, distance);
    camera.near = distance * 0.05;
    camera.far = distance * 4;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    uniforms.uCam.value.set(cam.x, cam.y);
    uniforms.uZoom.value = cam.zoom;
    uniforms.uHalfMin.value = halfMin();
    uniforms.uFocal.value = focal;
  }

  function upload(pool: Pool, slot: number, draw: (context: CanvasRenderingContext2D, size: number) => void) {
    const source = pool === lo ? scratch.lo : scratch.hi;
    const context = source.getContext('2d')!;
    context.clearRect(0, 0, source.width, source.height);
    draw(context, source.width);
    const { layer, x, y } = pool.coords(slot);
    renderer.copyTextureToTexture(new THREE.Texture(source), pool.texture, null, new THREE.Vector3(x * pool.cell, y * pool.cell, layer));
  }

  function setCell(attribute: THREE.InstancedBufferAttribute, tile: number, pool: Pool, slot: number) {
    const { layer, x, y } = slot < 0 ? { layer: -1, x: 0, y: 0 } : pool.coords(slot);
    attribute.setXYZ(tile, layer, x, y);
    attribute.needsUpdate = true;
  }

  function place(tile: number, image: HTMLImageElement) {
    if (!attributes) return;
    const size = metrics.size[tile];
    if (size >= LO_MIN_PX && loSlot[tile] < 0) {
      const taken = lo.take(tile, frame);
      if (taken) {
        if (taken.evicted >= 0) { loSlot[taken.evicted] = -1; setCell(attributes.aLo, taken.evicted, lo, -1); }
        loSlot[tile] = taken.slot;
        upload(lo, taken.slot, (context, side) => drawCover(context, image, 0, 0, side, side));
        setCell(attributes.aLo, tile, lo, taken.slot);
      }
    }
    if (size >= HI_MIN_PX && hiSlot[tile] < 0 && !isCardTile(tile)) {
      const taken = hi.take(tile, frame);
      if (taken) {
        if (taken.evicted >= 0) { hiSlot[taken.evicted] = -1; setCell(attributes.aHi, taken.evicted, hi, -1); }
        hiSlot[tile] = taken.slot;
        upload(hi, taken.slot, (context, side) => drawCover(context, image, 0, 0, side, side));
        setCell(attributes.aHi, tile, hi, taken.slot);
      }
    }
  }

  function load(tile: number) {
    const url = tiles[tile].thumb!;
    const current = generation;
    loading.add(tile);
    inFlight++;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    const done = () => { inFlight--; loading.delete(tile); };
    image.onload = () => {
      done();
      if (disposed || current !== generation) return;
      place(tile, image);
      requestFrame();
    };
    image.onerror = () => { done(); failed.add(url); requestFrame(); };
    image.src = url;
  }

  // Measures every tile on screen, marks the cells still in use, and starts the most central loads.
  function schedule() {
    const wanted: { tile: number; distance: number }[] = [];
    for (let tile = 0; tile < tiles.length; tile++) {
      const at = positions[tile];
      const projected = project(at.x, at.y);
      const size = TILE * cam.zoom * projected.k;
      metrics.x[tile] = projected.x;
      metrics.y[tile] = projected.y;
      metrics.size[tile] = size;
      const visible = projected.x + size > 0 && projected.x - size < width && projected.y + size > 0 && projected.y - size < height;
      if (!visible) continue;
      if (loSlot[tile] >= 0) lo.lastUsed[loSlot[tile]] = frame;
      if (hiSlot[tile] >= 0) hi.lastUsed[hiSlot[tile]] = frame;
      const needsLo = size >= LO_MIN_PX && loSlot[tile] < 0;
      const needsHi = size >= HI_MIN_PX && hiSlot[tile] < 0 && !isCardTile(tile);
      const thumb = tiles[tile].thumb;
      if ((needsLo || needsHi) && thumb && !failed.has(thumb) && !loading.has(tile)) {
        wanted.push({ tile, distance: Math.hypot(projected.x - width / 2, projected.y - height / 2) });
      }
    }
    wanted.sort((a, b) => a.distance - b.distance);
    for (const { tile } of wanted) {
      if (inFlight >= MAX_LOADS) break;
      load(tile);
    }
  }

  // ---- search state ------------------------------------------------------------------
  const cardFor = (tile: number) => (matches ? cards.findIndex(card => card.tileIndex === tile) : -1);
  const isCardTile = (tile: number) => cardFor(tile) >= 0;

  function targetState(tile: number): [number, number, number] {
    if (!matches) return [0, 0, 1];
    if (isCardTile(tile)) return [0, 0.6, 1.08];
    const rank = matches.get(tile);
    return rank === undefined ? [1, 0, 1] : [0, rank === 0 ? 1 : 0.6, 1.08];
  }

  function retarget() {
    if (!attributes) return;
    from = new Float32Array(attributes.aState.array as Float32Array);
    for (let tile = 0; tile < tiles.length; tile++) target.set(targetState(tile), tile * 3);
    easeStart = performance.now();
    requestFrame();
  }

  function ease(now: number) {
    if (!attributes || !easeStart) return false;
    const t = Math.min(1, (now - easeStart) / EASE_MS);
    const s = t * t * (3 - 2 * t);
    const state = attributes.aState.array as Float32Array;
    for (let index = 0; index < state.length; index++) state[index] = from[index] + (target[index] - from[index]) * s;
    attributes.aState.needsUpdate = true;
    if (t >= 1) easeStart = 0;
    return t < 1;
  }

  function drawCard(index: number) {
    if (!attributes) return;
    const card = cards[index];
    const image = card.image ? cardImages.get(card.image) : undefined;
    if (card.image && image === undefined) {
      cardImages.set(card.image, 'loading');
      const element = new Image();
      element.crossOrigin = 'anonymous';
      element.onload = () => { cardImages.set(card.image!, element); refreshCards(); };
      element.onerror = () => { cardImages.set(card.image!, 'error'); };
      element.src = card.image;
    }
    upload(hi, index, (context, side) => {
      const gradient = context.createLinearGradient(0, 0, 0, side);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, '#ffe9f2');
      context.fillStyle = gradient;
      context.fillRect(0, 0, side, side);
      const pad = side * 0.09;
      let y = pad;
      if (image instanceof HTMLImageElement) {
        drawCover(context, image, 0, 0, side, side * 0.55);
        y = side * 0.55 + pad * 0.6;
      }
      context.textBaseline = 'top';
      context.fillStyle = '#c2185b';
      context.font = `600 ${Math.round(side * 0.055)}px system-ui, sans-serif`;
      context.fillText(card.caption, pad, y, side - pad * 2);
      y += side * 0.085;
      context.fillStyle = '#542537';
      const titleSize = Math.round(side * (image instanceof HTMLImageElement ? 0.075 : 0.095));
      context.font = `700 ${titleSize}px system-ui, sans-serif`;
      for (const line of wrap(context, card.title, side - pad * 2, 3)) {
        context.fillText(line, pad, y);
        y += titleSize * 1.2;
      }
    });
    setCell(attributes.aHi, card.tileIndex, hi, index);
  }

  function refreshCards() {
    if (!attributes) return;
    // Tiles that were showing a card cell go back to their own photo (or colour).
    for (let tile = 0; tile < tiles.length; tile++) setCell(attributes.aHi, tile, hi, hiSlot[tile]);
    if (matches) cards.slice(0, CARD_SLOTS).forEach((_, index) => drawCard(index));
    requestFrame();
  }

  // ---- frames --------------------------------------------------------------------------
  function draw() {
    pending = 0;
    if (disposed || !geometry) return;
    frame++;
    const animating = ease(performance.now());
    updateCamera();
    schedule();
    renderer.render(scene, camera);
    if (animating) requestFrame();
  }

  function requestFrame() {
    if (!pending && !disposed) pending = requestAnimationFrame(draw);
  }

  function release() {
    for (const mesh of meshes) scene.remove(mesh);
    geometry?.dispose();
    geometry = null;
    meshes = [];
    attributes = null;
  }

  return {
    setTiles(next, layout) {
      release();
      generation++;
      tiles = next;
      positions = layout.positions;
      const count = tiles.length;
      lo.owner.fill(-1);
      hi.owner.fill(-1);
      loSlot = new Int32Array(count).fill(-1);
      hiSlot = new Int32Array(count).fill(-1);
      metrics = { x: new Float32Array(count), y: new Float32Array(count), size: new Float32Array(count) };
      loading.clear();

      const base = new THREE.PlaneGeometry(1 + MARGIN * 2, 1 + MARGIN * 2);
      geometry = new THREE.InstancedBufferGeometry();
      geometry.index = base.index;
      geometry.setAttribute('position', base.getAttribute('position'));
      geometry.instanceCount = count;
      const centers = new Float32Array(count * 2);
      const colors = new Float32Array(count * 3);
      positions.forEach((at, tile) => { centers[tile * 2] = at.x; centers[tile * 2 + 1] = at.y; colors.set(parseColor(tiles[tile].color), tile * 3); });
      const state = new Float32Array(count * 3);
      for (let tile = 0; tile < count; tile++) state[tile * 3 + 2] = 1;
      target = state.slice();
      from = state.slice();
      attributes = {
        aCenter: new THREE.InstancedBufferAttribute(centers, 2),
        aColor: new THREE.InstancedBufferAttribute(colors, 3),
        aLo: new THREE.InstancedBufferAttribute(new Float32Array(count * 3).fill(-1), 3),
        aHi: new THREE.InstancedBufferAttribute(new Float32Array(count * 3).fill(-1), 3),
        aState: new THREE.InstancedBufferAttribute(state, 3),
      };
      for (const [name, attribute] of Object.entries(attributes)) {
        attribute.setUsage(name === 'aCenter' || name === 'aColor' ? THREE.StaticDrawUsage : THREE.DynamicDrawUsage);
        geometry.setAttribute(name, attribute);
      }
      meshes = materials.map((m, pass) => {
        const mesh = new THREE.Mesh(geometry!, m);
        mesh.frustumCulled = false;
        mesh.renderOrder = pass;
        scene.add(mesh);
        return mesh;
      });
      matches = null;
      cards = [];
      requestFrame();
    },

    setSize(nextWidth, nextHeight, pixelRatio) {
      width = Math.max(1, nextWidth);
      height = Math.max(1, nextHeight);
      renderer.setPixelRatio(Math.min(2, pixelRatio || 1));
      uniforms.uPixelRatio.value = renderer.getPixelRatio();
      renderer.setSize(width, height, false);
      requestFrame();
    },

    setCamera(next) {
      cam = { ...next };
      requestFrame();
    },

    setMatches(next) {
      matches = next && new Map(next);
      refreshCards();
      retarget();
    },

    setLetterCards(next) {
      cards = next.slice(0, CARD_SLOTS);
      refreshCards();
      retarget();
    },

    pick(screenX, screenY) {
      const hit = (tile: number, scale: number) => {
        const at = positions[tile];
        const projected = project(at.x, at.y);
        const half = (TILE * scale * cam.zoom * projected.k) / 2;
        return Math.abs(screenX - projected.x) <= half && Math.abs(screenY - projected.y) <= half;
      };
      if (matches) {
        const card = cards.findIndex(c => hit(c.tileIndex, 1.08));
        if (card >= 0) return { kind: 'letter', card } satisfies GlassPick;
      }
      let best: GlassPick = null;
      for (let tile = 0; tile < tiles.length; tile++) {
        const matched = !!matches?.has(tile);
        if (hit(tile, matched ? 1.08 : 1)) {
          best = { kind: 'photo', index: tile };
          if (matched) break; // a lifted match sits on top of any neighbour it overlaps
        }
      }
      return best;
    },

    render() {
      if (pending) cancelAnimationFrame(pending);
      draw();
    },

    dispose() {
      disposed = true;
      if (pending) cancelAnimationFrame(pending);
      release();
      for (const m of materials) m.dispose();
      lo.texture.dispose();
      hi.texture.dispose();
      renderer.dispose();
    },
  };
}
