// A small WebGL2 globe: the NASA frame wrapped on a sphere, with the spotlight drawn as the exact
// pixel circle Dev A measures, shown as a brighter patch. No libraries, so it works offline like the rest of the app.
//
// The patch is worked out in frame pixels, not on the sphere: what you see lit is exactly what is measured.
// Near the poles it looks oval on the globe, because the flat map stretches east-west there.
//
// It can also draw the picture scan (Play the picture) in place of the spotlight: the line or the
// radar, worked out in frame pixels the same way, so the globe shows exactly the cells being played.
// The scan only mixes the picture toward black or white; its colours are never changed.
import {
  RADAR_GLOW,
  RADAR_TRAIL_DEGREES,
  SCAN_DIM,
  SCAN_DIM_EDGE,
  SCAN_GLOW,
  SCAN_TRAIL,
  globeScale,
  viewRotation,
  type View,
} from './geo';

export { viewRotation, type View } from './geo';

const VERTEX = `#version 300 es
in vec3 aPos;
in vec2 aUv;
uniform mat3 uRot;
uniform vec2 uScale;
out vec2 vUv;
out float vFacing;
void main() {
  vec3 p = uRot * aPos;
  vUv = aUv;
  vFacing = p.z;
  gl_Position = vec4(p.x * uScale.x, p.y * uScale.y, -p.z * 0.5, 1.0);
}`;

const f = (x: number) => x.toFixed(4);

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
in float vFacing;
uniform sampler2D uTex;
uniform vec2 uFrame;   // frame size in pixels
uniform vec3 uSpot;    // centre x, centre y, radius (frame pixels): the spotlight, or the radar's circle
uniform int uMode;     // 0: the spotlight. 1: the scan's line. 2: the scan's radar.
uniform float uPos;    // the scan: how far through the sweep, 0 to 1
uniform float uLevels[12]; // the scan: level of each band under the line now (the bars beside the globe)
uniform float uPx;     // one CSS pixel, in device pixels
uniform float uShape;  // the scan: widest half-width of the shape on the line, device pixels
out vec4 outColour;

// The scan's look, the same numbers as the flat picture (globe/geo.ts, styles.css .scan-view).
const float DIM = ${f(SCAN_DIM)};
const float DIM_EDGE = ${f(SCAN_DIM_EDGE)};
const float GLOW = ${f(SCAN_GLOW)};
const float TRAIL = ${f(SCAN_TRAIL)};
const float RADAR_GLOW = ${f(RADAR_GLOW)};
const float RADAR_TRAIL = ${f((RADAR_TRAIL_DEGREES * Math.PI) / 180)};
const float TAU = 6.2831853;

// How much of a stroke 'w' pixels wide either side covers a point 'd' pixels from its middle (1 px soft edge).
float cover(float d, float w) { return clamp(w + 0.5 - d, 0.0, 1.0); }

// Level of the band at 'b' (0 is the middle of band 0), smooth between band middles and falling to
// 0 at the two ends, like the shape on the flat picture.
float levelAt(float b) {
  if (b <= -0.5 || b >= 11.5) return 0.0;
  if (b < 0.0) return uLevels[0] * smoothstep(-0.5, 0.0, b);
  if (b >= 11.0) return uLevels[11] * (1.0 - smoothstep(11.0, 11.5, b));
  int i = int(floor(b));
  return mix(uLevels[i], uLevels[i + 1], smoothstep(0.0, 1.0, b - float(i)));
}

// The picture scan, drawn in place of the spotlight: the picture's colour 'c', mixed only toward
// black or white. P is the place in frame pixels; Px and Py are the frame pixels per device pixel
// along the screen's x and y, which turn a distance on the map into one on the screen, so lines keep
// their width at every latitude and zoom.
vec3 scanColour(vec3 c, vec2 P, vec2 Px, vec2 Py) {
  vec3 col = c;
  float W = uFrame.x;

  if (uMode == 1) {
    // The line is a meridian: everything is measured in frame pixels east of it.
    float fe = P.x - uPos * W;                  // below 0: already played
    float fl = fe - W * floor(fe / W + 0.5);    // to the nearest copy of the line (it wraps at 180°)
    float g = max(length(vec2(Px.x, Py.x)), 1e-6);
    float d = abs(fl) / g;                      // device pixels from the line
    // Played and still to come: the part ahead is dimmed, with a soft edge; a glow behind the line.
    col = mix(col, vec3(0.0), DIM * clamp(fe / (DIM_EDGE * W), 0.0, 1.0));
    if (fe < 0.0) col = mix(col, vec3(1.0), GLOW * clamp(1.0 + fe / (TRAIL * W), 0.0, 1.0));
    // The white shape riding the line: wide where a band is loud. Band 0 is the bottom (south).
    float hw = levelAt((1.0 - P.y / uFrame.y) * 12.0 - 0.5) * uShape;
    if (hw > 0.0) {
      col = mix(col, vec3(1.0), 0.78 * cover(d, hw));
      col = mix(col, vec3(0.0), 0.65 * cover(abs(d - hw), 0.75 * uPx));
    }
    // The line: a black edge, a soft white halo over it, a white core.
    col = mix(col, vec3(0.0), 0.6 * cover(d, 4.5 * uPx));
    col = mix(col, vec3(1.0), 0.3 * cover(d, 7.5 * uPx));
    col = mix(col, vec3(1.0), cover(d, 1.75 * uPx));
    return col;
  }

  // The radar, all in frame pixels around the circle's centre, as the score reads it (radarPoint).
  vec2 q = P - uSpot.xy;
  q.x -= W * floor(q.x / W + 0.5);              // the nearer way round the 180° line
  float r = uSpot.z;
  float rho = max(length(q), 1e-6);
  float theta = atan(-q.y, q.x);                // 0 east, anticlockwise (screen y points down)
  if (theta < 0.0) theta += TAU;
  float a = TAU * uPos;
  // Distance on the screen (device pixels) of a map function with map gradient G.
  vec2 Grho = q / rho;
  float gRho = max(length(vec2(dot(Grho, Px), dot(Grho, Py))), 1e-6);
  vec2 dir = vec2(cos(a), -sin(a));
  vec2 Gacross = vec2(dir.y, -dir.x);
  float gAcross = max(length(vec2(dot(Gacross, Px), dot(Gacross, Py))), 1e-6);
  float along = dot(q, dir);
  float across = q.x * dir.y - q.y * dir.x;

  bool inside = rho <= r;
  // Outside the circle is never read, and the part of the circle not reached yet waits in the dark.
  if (!inside || theta > a) col = mix(col, vec3(0.0), DIM);
  // Thin rings every third band: how far out a note is.
  for (int k = 3; k <= 9; k += 3) {
    col = mix(col, vec3(1.0), 0.34 * cover(abs(rho - r * float(k) / 12.0) / gRho, 0.5 * uPx));
  }
  // The rim: a black outline and a white ring, and the part of it the line has passed, thicker.
  float dRim = abs(rho - r) / gRho;
  col = mix(col, vec3(0.0), cover(dRim, 3.0 * uPx));
  col = mix(col, vec3(1.0), cover(dRim, 1.25 * uPx));
  if (theta <= a) col = mix(col, vec3(1.0), cover(dRim, 3.5 * uPx));
  // A soft glow behind the needle.
  float behind = a - theta;
  if (inside && behind >= 0.0 && behind < RADAR_TRAIL) col = mix(col, vec3(1.0), RADAR_GLOW * (1.0 - behind / RADAR_TRAIL));
  // The needle, from the centre to the rim, with the white shape riding it.
  if (along >= 0.0 && along <= r) {
    float d = abs(across) / gAcross;
    float hw = levelAt(along / r * 12.0 - 0.5) * 0.2 * r / gAcross;
    if (hw > 0.0) {
      col = mix(col, vec3(1.0), 0.78 * cover(d, hw));
      col = mix(col, vec3(0.0), 0.65 * cover(abs(d - hw), 0.75 * uPx));
    }
    col = mix(col, vec3(0.0), 0.6 * cover(d, 4.5 * uPx));
    col = mix(col, vec3(1.0), 0.3 * cover(d, 7.5 * uPx));
    col = mix(col, vec3(1.0), cover(d, 1.75 * uPx));
  }
  return col;
}

void main() {
  vec3 c = texture(uTex, vUv).rgb;
  if (uMode != 0) {
    vec2 P = vUv * uFrame;
    outColour = vec4(scanColour(c, P, dFdx(P), dFdy(P)), 1.0);
    return;
  }
  vec2 d = vUv * uFrame - uSpot.xy;
  d.x = min(abs(d.x), uFrame.x - abs(d.x));
  float dist = length(d);
  float e = dist - uSpot.z;
  float w = max(fwidth(dist), 1e-4);
  // The spotlight is simply a brighter patch with a soft edge; the rest of the globe stays close
  // to the original picture.
  float inside = 1.0 - smoothstep(-2.0 * w, 2.0 * w, e);
  vec3 lit = min(c * 1.6 + 0.08, vec3(1.0));
  vec3 rest = c * 0.85;
  vec3 col = mix(rest, lit, inside);
  // Where the spotlight's centre cannot go: within one radius of the map's edges (the 180° line
  // and the poles), because a region must sit wholly inside the flat frame to be measured.
  vec2 px = vUv * uFrame;
  float edge = max(step(px.x, uSpot.z) + step(uFrame.x - uSpot.z, px.x), step(px.y, uSpot.z) + step(uFrame.y - uSpot.z, px.y));
  edge = min(edge, 1.0) * (1.0 - inside);
  float hatch = step(0.75, fract((px.x + px.y) / 10.0));
  col = mix(col, col * 0.45 + vec3(0.10) * hatch, edge);
  // A thin blue atmosphere at the edge of the Earth.
  col += vec3(0.30, 0.55, 1.0) * pow(1.0 - clamp(vFacing, 0.0, 1.0), 3.0) * 0.35;
  outColour = vec4(col, 1.0);
}`;

// The night sky behind the globe: decorative only, not data. Stars turn with the globe when you drag.
const SKY_VERTEX = `#version 300 es
out vec2 vNdc;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) * 2.0 - 1.0; // one triangle covers the screen
  vNdc = p;
  gl_Position = vec4(p, 0.999, 1.0);
}`;

const SKY_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vNdc;
uniform mat3 uRot;
uniform vec2 uScale;
uniform float uAspect;
uniform float uTime;
out vec4 outColour;

float hash(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash(i), n100 = hash(i + vec3(1, 0, 0)), n010 = hash(i + vec3(0, 1, 0)), n110 = hash(i + vec3(1, 1, 0));
  float n001 = hash(i + vec3(0, 0, 1)), n101 = hash(i + vec3(1, 0, 1)), n011 = hash(i + vec3(0, 1, 1)), n111 = hash(i + vec3(1, 1, 1));
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y), mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}

float fbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

// One layer of stars: each grid cell may hold one star, sized and twinkling by its own random number.
vec3 stars(vec3 dir, float density, float chance, float size) {
  vec3 cell = floor(dir * density);
  float h = hash(cell);
  if (h > chance) return vec3(0.0);
  vec3 jitter = vec3(hash(cell + 3.1), hash(cell + 7.7), hash(cell + 13.3)) - 0.5;
  vec3 star = normalize((cell + 0.5 + jitter * 0.7) / density);
  float d = length(dir - star) * density;
  float glow = exp(-d * d / (size * size));
  float twinkle = 0.75 + 0.25 * sin(uTime * (1.0 + 2.0 * hash(cell + 2.0)) + 6.2831 * h);
  vec3 tint = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.9, 0.75), hash(cell + 5.0));
  return tint * glow * twinkle * (0.6 + 0.8 * hash(cell + 9.0));
}

void main() {
  vec2 screen = vec2(vNdc.x * max(uAspect, 1.0), vNdc.y * max(1.0 / uAspect, 1.0));
  vec3 rayCam = normalize(vec3(screen * 0.9, -1.0));
  vec3 dir = transpose(uRot) * rayCam;   // stars turn with the globe

  // Deep space, a little lighter towards the bottom.
  vec3 col = mix(vec3(0.010, 0.014, 0.035), vec3(0.025, 0.030, 0.070), 0.5 - 0.5 * vNdc.y);

  // A faint Milky Way: a soft band of glowing dust along one great circle.
  vec3 bandNormal = normalize(vec3(0.35, 0.85, 0.40));
  float band = exp(-pow(dot(dir, bandNormal), 2.0) * 14.0);
  float dust = fbm(dir * 5.0);
  col += band * (vec3(0.16, 0.13, 0.26) * dust + vec3(0.05, 0.07, 0.12)) * 0.9;
  col += band * vec3(0.10, 0.09, 0.08) * smoothstep(0.55, 0.9, fbm(dir * 11.0 + 4.0));

  col += stars(dir, 90.0, 0.07, 0.10) * 1.4;
  col += stars(dir, 220.0, 0.10, 0.12) * 0.9;
  col += stars(dir, 420.0, 0.12, 0.14) * 0.5 * (0.4 + band);

  // Soft blue glow of the atmosphere around the Earth.
  float r = length(vec2(vNdc.x / uScale.x, vNdc.y / uScale.y));
  if (r > 1.0) col += vec3(0.25, 0.50, 1.0) * exp(-(r - 1.0) * 9.0) * 0.55;

  outColour = vec4(col, 1.0);
}`;

// Copies the still sky (drawn once into a texture) to the screen: the night sky costs more than a
// frame in software rendering, and the scan redraws every frame.
const COPY_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vNdc;
uniform sampler2D uSky;
out vec4 outColour;
void main() {
  outColour = texture(uSky, vNdc * 0.5 + 0.5);
}`;

export interface SpotUniform {
  cx: number;
  cy: number;
  r: number;
}

/** The picture scan, drawn in place of the spotlight. */
export interface ScanUniform {
  mode: 'line' | 'radar';
  /** How far through the sweep, 0 to 1. */
  position: number;
  /** Level of each band under the line now, 0 to 1 (12 bands). */
  levels: ArrayLike<number>;
  /** The radar's circle, in frame pixels. */
  circle: SpotUniform | null;
  /** Widest half-width of the shape riding the line, in CSS pixels. */
  shapePx: number;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Globe shader did not compile: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

/** The globe's mesh: positions on the unit sphere and the map position (u, v) of each. Exported for a test. */
export function sphere(stacks: number, slices: number) {
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i <= stacks; i++) {
    const lat = ((90 - (180 * i) / stacks) * Math.PI) / 180;
    for (let j = 0; j <= slices; j++) {
      const lon = ((-180 + (360 * j) / slices) * Math.PI) / 180;
      positions.push(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
      uvs.push(j / slices, i / stacks);
    }
  }
  const indices: number[] = [];
  for (let i = 0; i < stacks; i++) {
    for (let j = 0; j < slices; j++) {
      const a = i * (slices + 1) + j;
      const b = a + slices + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { positions: new Float32Array(positions), uvs: new Float32Array(uvs), indices: new Uint16Array(indices) };
}

export class GlobeRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private sky: WebGLProgram;
  private copy: WebGLProgram;
  private skyVao: WebGLVertexArrayObject | null;
  private skyLoc: Record<string, WebGLUniformLocation | null>;
  private copyLoc: WebGLUniformLocation | null;
  private count: number;
  private texture: WebGLTexture | null = null;
  private loc: Record<string, WebGLUniformLocation | null>;
  private buffers: WebGLBuffer[] = [];
  private shaders: WebGLShader[] = [];
  /** The still sky, drawn once into a texture while the scan plays. */
  private still: { texture: WebGLTexture; framebuffer: WebGLFramebuffer; key: string; rotation: Float32Array } | null = null;
  private levels = new Float32Array(12);

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
    if (!gl) throw new Error('This browser cannot draw the 3D globe (WebGL2 is off or not supported).');
    this.gl = gl;
    const shader = (type: number, source: string) => {
      const s = compile(gl, type, source);
      this.shaders.push(s);
      return s;
    };
    const buffer = () => {
      const b = gl.createBuffer()!;
      this.buffers.push(b);
      return b;
    };
    const link = (vertex: string, fragment: string, what: string) => {
      const p = gl.createProgram()!;
      gl.attachShader(p, shader(gl.VERTEX_SHADER, vertex));
      gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`${what} shaders did not link.`);
      return p;
    };
    const program = link(VERTEX, FRAGMENT, 'Globe');
    this.program = program;

    const mesh = sphere(64, 128);
    this.count = mesh.indices.length;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const attribute = (name: string, data: Float32Array, size: number) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer());
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const where = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(where);
      gl.vertexAttribPointer(where, size, gl.FLOAT, false, 0, 0);
    };
    attribute('aPos', mesh.positions, 3);
    attribute('aUv', mesh.uvs, 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    this.loc = Object.fromEntries(
      ['uRot', 'uScale', 'uTex', 'uFrame', 'uSpot', 'uMode', 'uPos', 'uLevels', 'uPx', 'uShape'].map((n) => [n, gl.getUniformLocation(program, n)]),
    );
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    this.sky = link(SKY_VERTEX, SKY_FRAGMENT, 'Sky');
    this.copy = link(SKY_VERTEX, COPY_FRAGMENT, 'Sky copy');
    this.skyVao = gl.createVertexArray();
    this.skyLoc = Object.fromEntries(
      ['uRot', 'uScale', 'uAspect', 'uTime'].map((n) => [n, gl.getUniformLocation(this.sky, n)]),
    );
    this.copyLoc = gl.getUniformLocation(this.copy, 'uSky');
    gl.bindVertexArray(vao);
    this.globeVao = vao;
  }

  private globeVao: WebGLVertexArrayObject | null;

  /** Free every GPU resource this globe made (call when the component unmounts).
   *  The context itself is left alone: React may mount the same canvas again. */
  dispose() {
    const gl = this.gl;
    if (this.texture) gl.deleteTexture(this.texture);
    this.texture = null;
    this.dropStill();
    this.buffers.forEach((b) => gl.deleteBuffer(b));
    this.buffers = [];
    gl.deleteVertexArray(this.globeVao);
    gl.deleteVertexArray(this.skyVao);
    this.shaders.forEach((s) => gl.deleteShader(s));
    this.shaders = [];
    gl.deleteProgram(this.program);
    gl.deleteProgram(this.sky);
    gl.deleteProgram(this.copy);
  }

  setImage(image: TexImageSource) {
    const gl = this.gl;
    if (this.texture) gl.deleteTexture(this.texture);
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  /** What draws the globe, as the browser names it (for the browser tests' log). */
  rendererName(): string {
    const gl = this.gl;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  }

  /** The colour drawn at a point, in device pixels from the canvas's top left. Call it right after
   *  draw(), in the same task: the browser keeps the drawing until the page is next shown. */
  readPixel(x: number, y: number): [number, number, number, number] {
    const gl = this.gl;
    const out = new Uint8Array(4);
    // The pixel the point falls in; WebGL counts rows from the bottom.
    gl.readPixels(Math.floor(x), this.canvas.height - 1 - Math.floor(y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
    return [out[0], out[1], out[2], out[3]];
  }

  private dropStill() {
    if (!this.still) return;
    this.gl.deleteTexture(this.still.texture);
    this.gl.deleteFramebuffer(this.still.framebuffer);
    this.still = null;
  }

  private drawSky(rotation: Float32Array, scale: number[], w: number, h: number, time: number) {
    const gl = this.gl;
    gl.useProgram(this.sky);
    gl.bindVertexArray(this.skyVao);
    gl.uniformMatrix3fv(this.skyLoc.uRot, false, rotation);
    gl.uniform2f(this.skyLoc.uScale, scale[0], scale[1]);
    gl.uniform1f(this.skyLoc.uAspect, w / h);
    gl.uniform1f(this.skyLoc.uTime, time);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** The sky held still (stars neither twinkle nor turn), drawn into a texture once and copied after.
   *  Drawn again only when the canvas or the globe's size changes. */
  private drawStillSky(rotation: Float32Array, scale: number[], w: number, h: number) {
    const gl = this.gl;
    const key = `${w}x${h}:${scale[0].toFixed(5)},${scale[1].toFixed(5)}`;
    if (!this.still || this.still.key !== key) {
      const held = this.still?.rotation ?? rotation.slice();
      this.dropStill();
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const framebuffer = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.viewport(0, 0, w, h);
      this.drawSky(held, scale, w, h, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this.still = { texture, framebuffer, key, rotation: held };
    }
    gl.useProgram(this.copy);
    gl.bindVertexArray(this.skyVao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.still.texture);
    gl.uniform1i(this.copyLoc, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** time: seconds, for the stars' twinkle (pass a constant to keep them still). zoom: 1 = whole globe.
   *  scan: the picture scan, drawn in place of the spotlight; while it is given the stars hold still. */
  draw(view: View, frame: { width: number; height: number }, spot: SpotUniform, time = 0, zoom = 1, scan: ScanUniform | null = null) {
    const gl = this.gl;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(this.canvas.clientWidth * dpr);
    const h = Math.round(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const scale = globeScale(zoom, w, h);
    const rotation = viewRotation(view);

    // The sky first, behind everything.
    gl.disable(gl.DEPTH_TEST);
    if (scan) {
      this.drawStillSky(rotation, scale, w, h);
      gl.viewport(0, 0, w, h);
    } else {
      this.dropStill();
      this.drawSky(rotation, scale, w, h, time);
    }
    gl.enable(gl.DEPTH_TEST);

    if (!this.texture) return;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.globeVao);
    gl.uniformMatrix3fv(this.loc.uRot, false, rotation);
    gl.uniform2f(this.loc.uScale, scale[0], scale[1]);
    gl.uniform1i(this.loc.uTex, 0);
    gl.uniform2f(this.loc.uFrame, frame.width, frame.height);
    const circle = scan?.mode === 'radar' && scan.circle ? scan.circle : spot;
    gl.uniform3f(this.loc.uSpot, circle.cx, circle.cy, circle.r);
    gl.uniform1i(this.loc.uMode, scan ? (scan.mode === 'radar' ? 2 : 1) : 0);
    gl.uniform1f(this.loc.uPos, scan?.position ?? 0);
    this.levels.fill(0);
    if (scan) for (let i = 0; i < 12; i++) this.levels[i] = scan.levels[i] ?? 0;
    gl.uniform1fv(this.loc.uLevels, this.levels);
    gl.uniform1f(this.loc.uPx, dpr);
    gl.uniform1f(this.loc.uShape, (scan?.shapePx ?? 0) * dpr);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
  }
}
