// A small WebGL2 globe: the NASA frame wrapped on a sphere, with the spotlight drawn as the exact
// pixel circle Dev A measures, shown as a brighter patch. No libraries, so it works offline like the rest of the app.
//
// The patch is worked out in frame pixels, not on the sphere: what you see lit is exactly what is measured.
// Near the poles it looks oval on the globe, because the flat map stretches east-west there.

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

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
in float vFacing;
uniform sampler2D uTex;
uniform vec2 uFrame;   // frame size in pixels
uniform vec3 uSpot;    // centre x, centre y, radius (frame pixels)
out vec4 outColour;
void main() {
  vec3 c = texture(uTex, vUv).rgb;
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

export interface View {
  lon: number; // longitude facing the viewer, degrees
  lat: number; // latitude facing the viewer, degrees
}

export interface SpotUniform {
  cx: number;
  cy: number;
  r: number;
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

function sphere(stacks: number, slices: number) {
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

/** Rotation that turns (view.lon, view.lat) to face the viewer, as a column-major mat3. */
export function viewRotation(view: View): Float32Array {
  const yaw = (-view.lon * Math.PI) / 180;
  const pitch = (view.lat * Math.PI) / 180;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  // Row-major Rx(pitch) * Ry(yaw), written out column by column.
  return new Float32Array([cy, sp * sy, -cp * sy, 0, cp, sp, sy, -sp * cy, cp * cy]);
}

export class GlobeRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private sky: WebGLProgram;
  private skyVao: WebGLVertexArrayObject | null;
  private skyLoc: Record<string, WebGLUniformLocation | null>;
  private count: number;
  private texture: WebGLTexture | null = null;
  private loc: Record<string, WebGLUniformLocation | null>;
  private buffers: WebGLBuffer[] = [];
  private shaders: WebGLShader[] = [];

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
    const program = gl.createProgram()!;
    gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Globe shaders did not link.');
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
      ['uRot', 'uScale', 'uTex', 'uFrame', 'uSpot'].map((n) => [n, gl.getUniformLocation(program, n)]),
    );
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    const sky = gl.createProgram()!;
    gl.attachShader(sky, shader(gl.VERTEX_SHADER, SKY_VERTEX));
    gl.attachShader(sky, shader(gl.FRAGMENT_SHADER, SKY_FRAGMENT));
    gl.linkProgram(sky);
    if (!gl.getProgramParameter(sky, gl.LINK_STATUS)) throw new Error('Sky shaders did not link.');
    this.sky = sky;
    this.skyVao = gl.createVertexArray();
    this.skyLoc = Object.fromEntries(
      ['uRot', 'uScale', 'uAspect', 'uTime'].map((n) => [n, gl.getUniformLocation(sky, n)]),
    );
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
    this.buffers.forEach((b) => gl.deleteBuffer(b));
    this.buffers = [];
    gl.deleteVertexArray(this.globeVao);
    gl.deleteVertexArray(this.skyVao);
    this.shaders.forEach((s) => gl.deleteShader(s));
    this.shaders = [];
    gl.deleteProgram(this.program);
    gl.deleteProgram(this.sky);
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

  /** time: seconds, for the stars' twinkle (pass a constant to keep them still). zoom: 1 = whole globe. */
  draw(view: View, frame: { width: number; height: number }, spot: SpotUniform, time = 0, zoom = 1) {
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
    const size = 0.86 * zoom;
    const scale = w >= h ? [(size * h) / w, size] : [size, (size * w) / h];
    const rotation = viewRotation(view);

    // The sky first, behind everything.
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.sky);
    gl.bindVertexArray(this.skyVao);
    gl.uniformMatrix3fv(this.skyLoc.uRot, false, rotation);
    gl.uniform2f(this.skyLoc.uScale, scale[0], scale[1]);
    gl.uniform1f(this.skyLoc.uAspect, w / h);
    gl.uniform1f(this.skyLoc.uTime, time);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);

    if (!this.texture) return;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.globeVao);
    gl.uniformMatrix3fv(this.loc.uRot, false, rotation);
    gl.uniform2f(this.loc.uScale, scale[0], scale[1]);
    gl.uniform1i(this.loc.uTex, 0);
    gl.uniform2f(this.loc.uFrame, frame.width, frame.height);
    gl.uniform3f(this.loc.uSpot, spot.cx, spot.cy, spot.r);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
  }
}
