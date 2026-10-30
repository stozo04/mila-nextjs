// WebGL glass tiles for the memories atlas. Every tile is one instance of a small quad drawn
// twice: a shadow/glow pass, then the glass pass, so a neighbour's shadow never lands on a
// tile. The grid lies on one sphere at every zoom (see atlasLayout): a few screens wide when
// zoomed in, the whole globe when zoomed out, wrapping round in both directions. Thumbnails
// stream into two pooled texture arrays (128 px cells for most tiles, 256 px cells for tiles
// that are large on screen and for letter cards), cell by cell.
import * as THREE from 'three';
import { FLAT_CURVE, GLOBE_LATITUDE, MATCH_SCALE, TILE, globeAmount, globeRadius, wrapDelta, type Camera, type Layout } from '../atlasLayout';
import type { GlassAtlasRenderer, GlassLetterCard, GlassPick, GlassTile } from './types';

const FOV = 32;
const FOCAL = 0.5 / Math.tan((FOV * Math.PI) / 360); // screen-height multiplier for the focal length
const HORIZON_MARGIN = 0.02; // hide tiles this close to edge-on at the sphere's horizon
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
  uniform vec2 uPeriod; // the grid's width and height: it wraps in both directions
  uniform float uRadius;
  uniform float uLatScale;
  uniform float uGlobe;
  uniform float uDistance;
  uniform float uHorizon;
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
    // The shortest way round to this tile from the camera, then its place on the sphere.
    vec2 delta = mod(aCenter - uCam + 0.5 * uPeriod, uPeriod) - 0.5 * uPeriod;
    float lon = delta.x / uRadius;
    float lat = delta.y / uRadius * uLatScale;
    vec3 n = vec3(sin(lon) * cos(lat), -sin(lat), cos(lon) * cos(lat));
    if (abs(lon) >= 1.5707 || abs(lat) >= 1.5707 || n.z <= uHorizon) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // facing away: every vertex off screen
      vAa = 1.0;
      return;
    }
    // Tangent to the sphere, so tiles toward the edges turn away. The whole tile is one
    // flat piece, so its two triangles stay coplanar and the photo has no seam.
    vec3 centre = uRadius * n - vec3(0.0, 0.0, uRadius);
    vec3 east = vec3(cos(lon), 0.0, -sin(lon));
    vec3 south = vec3(-sin(lon) * sin(lat), -cos(lat), -cos(lon) * sin(lat));
    float hx = mix(1.0, cos(lat), uGlobe);
    vec2 local = vLocal * uTile * aState.z;
    vec3 world = centre + east * local.x * hx + south * local.y * uLatScale;
    // Edge smoothing width in tile units, from the tile's foreshortened size on screen.
    // Screen-space derivatives (fwidth) are unreliable along the quad's internal edge.
    float facing = max(dot(n, normalize(vec3(0.0, 0.0, uDistance) - centre)), 0.2);
    float pixels = uTile * aState.z * uFocal / (uDistance - centre.z) * min(hx, uLatScale) * facing;
    vAa = 0.75 / (pixels * uPixelRatio);
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  precision highp sampler2DArray;
  uniform sampler2DArray uLo;
  uniform sampler2DArray uHi;
  uniform vec4 uCells; // lo cell / page, hi cell / page, lo inset, hi inset
  uniform int uPass; // 0: shadow and glow, 1: glass
  uniform float uGlobe;
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
      // Shadows fade on the globe, where a drop shadow onto the page would read wrongly.
      float shadow = 0.2 * (1.0 - smoothstep(-0.06, 0.16, box(p - vec2(0.0, 0.045)))) * (1.0 - 0.75 * dim) * (1.0 - uGlobe);
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

    col *= 1.0 - 0.08 * smoothstep(0.2, 0.5, p.y) * e; // thicker glass reads a little darker at the bottom
    col = mix(col, col * 0.78, smoothstep(-0.014, 0.0, d)); // dark contact line at the very edge

    vec2 light = normalize(vec2(-0.6, -0.8));
    // Only the glass edge catches light; the photo itself stays clear (a full sheen washed it out).
    float rim = pow(e, 4.0) * (0.06 + 0.18 * max(dot(n, light), 0.0));
    col += vec3(rim);

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

// Where each tile landed in the last frame: projected centre, foreshortened size, and whether
// it faces the camera. Typed arrays, refilled in place, so a spinning globe allocates nothing.
type Metrics = { x: Float32Array; y: Float32Array; size: Float32Array; front: Uint8Array };
const metricsFor = (count: number): Metrics =>
  ({ x: new Float32Array(count), y: new Float32Array(count), size: new Float32Array(count), front: new Uint8Array(count) });

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
    uPeriod: { value: new THREE.Vector2(1, 1) },
    uRadius: { value: 1 },
    uLatScale: { value: 1 },
    uGlobe: { value: 0 },
    uDistance: { value: 1 },
    uHorizon: { value: 0 },
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
  let grid = { width: 1, height: 1 };
  let geometry: THREE.InstancedBufferGeometry | null = null;
  let meshes: THREE.Mesh[] = [];
  let attributes: Record<'aCenter' | 'aColor' | 'aLo' | 'aHi' | 'aState', THREE.InstancedBufferAttribute> | null = null;
  let target = new Float32Array(0);
  let from = new Float32Array(0);
  let easeStart = 0;
  let loSlot = new Int32Array(0);
  let hiSlot = new Int32Array(0);
  let metrics = metricsFor(0);
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

  // The sphere for this frame, shared by the shader (as uniforms) and the CPU (pick, loading).
  const sphere = { radius: 1, latScale: 1, globe: 0, distance: 1, focal: 1, horizon: 0 };

  function updateSphere() {
    sphere.focal = height * FOCAL;
    sphere.distance = sphere.focal / cam.zoom;
    sphere.globe = globeAmount(cam.zoom, grid, width, height);
    // Sized to the half-diagonal, so the sphere's edge never shows in a corner on any screen shape.
    const flat = (Math.hypot(width, height) / 2 / cam.zoom) * FLAT_CURVE;
    const globe = globeRadius(grid);
    // Interpolating curvature, not radius, keeps the zoomed-in sphere from ballooning early.
    sphere.radius = 1 / ((1 - sphere.globe) / flat + sphere.globe / globe);
    sphere.latScale = 1 + (GLOBE_LATITUDE / (grid.height / 2 / globe) - 1) * sphere.globe;
    // A tile faces the camera while cos(lon)cos(lat) clears the horizon seen from the camera.
    sphere.horizon = sphere.radius / (sphere.distance + sphere.radius) + HORIZON_MARGIN;
  }

  // The shader's maths on the CPU for one tile, into these scalars (no allocation per tile).
  const at = { lon: 0, lat: 0, nx: 0, ny: 0, nz: 0, cx: 0, cy: 0, cz: 0, hx: 1, front: false };
  function locate(tile: number) {
    const { radius, latScale, globe, horizon } = sphere;
    at.lon = wrapDelta(positions[tile].x, cam.x, grid.width) / radius;
    at.lat = (wrapDelta(positions[tile].y, cam.y, grid.height) / radius) * latScale;
    const cosLat = Math.cos(at.lat);
    at.nx = Math.sin(at.lon) * cosLat;
    at.ny = -Math.sin(at.lat);
    at.nz = Math.cos(at.lon) * cosLat;
    at.front = Math.abs(at.lon) < 1.5707 && Math.abs(at.lat) < 1.5707 && at.nz > horizon;
    at.cx = radius * at.nx;
    at.cy = radius * at.ny;
    at.cz = radius * at.nz - radius;
    at.hx = 1 + (cosLat - 1) * globe;
  }

  // Camera at (0, 0, distance) looking down -z; three's y is up, the atlas's is down.
  const screen = { x: 0, y: 0 };
  function projectPoint(x: number, y: number, z: number) {
    const k = sphere.focal / (sphere.distance - z);
    screen.x = width / 2 + x * k;
    screen.y = height / 2 - y * k;
  }

  function updateCamera() {
    updateSphere();
    camera.aspect = width / height;
    camera.position.set(0, 0, sphere.distance);
    // The nearest point of the sphere is the z = 0 plane; the farthest visible is its horizon.
    camera.near = sphere.distance * 0.25;
    camera.far = sphere.distance + sphere.radius * 2.2;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    uniforms.uCam.value.set(cam.x, cam.y);
    uniforms.uPeriod.value.set(grid.width, grid.height);
    uniforms.uRadius.value = sphere.radius;
    uniforms.uLatScale.value = sphere.latScale;
    uniforms.uGlobe.value = sphere.globe;
    uniforms.uDistance.value = sphere.distance;
    uniforms.uHorizon.value = sphere.horizon;
    uniforms.uFocal.value = sphere.focal;
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

  // Measures every tile on screen, marks the cells still in use, and starts the most central
  // loads. Candidates go into reusable typed arrays: this runs every frame while the globe spins.
  let candidates = new Int32Array(0);
  let candidateDistance = new Float32Array(0);
  function schedule() {
    let count = 0;
    for (let tile = 0; tile < tiles.length; tile++) {
      locate(tile);
      metrics.front[tile] = at.front ? 1 : 0;
      if (!at.front) { metrics.size[tile] = 0; continue; }
      projectPoint(at.cx, at.cy, at.cz);
      const facing = Math.max(0, at.nx * -at.cx + at.ny * -at.cy + at.nz * (sphere.distance - at.cz))
        / Math.hypot(at.cx, at.cy, sphere.distance - at.cz);
      const size = TILE * (sphere.focal / (sphere.distance - at.cz)) * Math.min(at.hx, sphere.latScale) * facing;
      metrics.x[tile] = screen.x;
      metrics.y[tile] = screen.y;
      metrics.size[tile] = size;
      const visible = screen.x + size > 0 && screen.x - size < width && screen.y + size > 0 && screen.y - size < height;
      if (!visible) continue;
      if (loSlot[tile] >= 0) lo.lastUsed[loSlot[tile]] = frame;
      if (hiSlot[tile] >= 0) hi.lastUsed[hiSlot[tile]] = frame;
      const needsLo = size >= LO_MIN_PX && loSlot[tile] < 0;
      const needsHi = size >= HI_MIN_PX && hiSlot[tile] < 0 && !isCardTile(tile);
      const thumb = tiles[tile].thumb;
      if ((needsLo || needsHi) && thumb && !failed.has(thumb) && !loading.has(tile)) {
        candidates[count] = tile;
        candidateDistance[count] = Math.hypot(screen.x - width / 2, screen.y - height / 2);
        count++;
      }
    }
    // Start the nearest few: a short selection beats sorting thousands every frame.
    while (inFlight < MAX_LOADS && count > 0) {
      let nearest = 0;
      for (let index = 1; index < count; index++) if (candidateDistance[index] < candidateDistance[nearest]) nearest = index;
      load(candidates[nearest]);
      count--;
      candidates[nearest] = candidates[count];
      candidateDistance[nearest] = candidateDistance[count];
    }
  }

  // ---- search state ------------------------------------------------------------------
  const cardFor = (tile: number) => (matches ? cards.findIndex(card => card.tileIndex === tile) : -1);
  const isCardTile = (tile: number) => cardFor(tile) >= 0;

  function targetState(tile: number): [number, number, number] {
    if (!matches) return [0, 0, 1];
    if (isCardTile(tile)) return [0, 0.6, MATCH_SCALE];
    const rank = matches.get(tile);
    return rank === undefined ? [1, 0, 1] : [0, rank === 0 ? 1 : 0.6, MATCH_SCALE];
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
      metrics = metricsFor(count);
      candidates = new Int32Array(count);
      candidateDistance = new Float32Array(count);
      grid = { width: Math.max(1, layout.width), height: Math.max(1, layout.height) };
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
      updateSphere();
      // The tile's four projected corners, tested as a convex quad (foreshortening included).
      const corners = new Float32Array(8);
      const hit = (tile: number, scale: number) => {
        locate(tile);
        if (!at.front) return false;
        const cosLat = Math.cos(at.lat);
        const east = [Math.cos(at.lon), 0, -Math.sin(at.lon)];
        const south = [-Math.sin(at.lon) * Math.sin(at.lat), -cosLat, -Math.cos(at.lon) * Math.sin(at.lat)];
        const half = (TILE * scale) / 2;
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([u, v], corner) => {
          const a = u * half * at.hx;
          const b = v * half * sphere.latScale;
          projectPoint(at.cx + east[0] * a + south[0] * b, at.cy + east[1] * a + south[1] * b, at.cz + east[2] * a + south[2] * b);
          corners[corner * 2] = screen.x;
          corners[corner * 2 + 1] = screen.y;
        });
        let sign = 0;
        for (let corner = 0; corner < 4; corner++) {
          const x0 = corners[corner * 2], y0 = corners[corner * 2 + 1];
          const x1 = corners[((corner + 1) % 4) * 2], y1 = corners[((corner + 1) % 4) * 2 + 1];
          const cross = (x1 - x0) * (screenY - y0) - (y1 - y0) * (screenX - x0);
          if (cross === 0) continue;
          if (sign === 0) sign = Math.sign(cross);
          else if (Math.sign(cross) !== sign) return false;
        }
        return true;
      };
      if (matches) {
        const card = cards.findIndex(c => hit(c.tileIndex, MATCH_SCALE));
        if (card >= 0) return { kind: 'letter', card } satisfies GlassPick;
      }
      let best: GlassPick = null;
      for (let tile = 0; tile < tiles.length; tile++) {
        const matched = !!matches?.has(tile);
        if (hit(tile, matched ? MATCH_SCALE : 1)) {
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
