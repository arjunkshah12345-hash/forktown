/**
 * Tiny pure-TS MLP — no deps. Deterministic matmul + ReLU + tanh.
 * Used as the cognitive substrate for mind + agent policies.
 */

export type Vec = Float64Array;
export type Mat = Float64Array; // row-major [rows * cols]

export function vec(n: number, fill = 0): Vec {
  const v = new Float64Array(n);
  if (fill) v.fill(fill);
  return v;
}

export function mat(rows: number, cols: number): Mat {
  return new Float64Array(rows * cols);
}

/** Seeded LCG → weights in [-scale, scale] */
export function initMat(rows: number, cols: number, seed: number, scale = 0.35): Mat {
  const m = mat(rows, cols);
  let s = seed >>> 0 || 1;
  for (let i = 0; i < m.length; i++) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    m[i] = ((s / 0xffffffff) * 2 - 1) * scale;
  }
  return m;
}

export function initVec(n: number, seed: number, scale = 0.1): Vec {
  const v = vec(n);
  let s = seed >>> 0 || 1;
  for (let i = 0; i < n; i++) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    v[i] = ((s / 0xffffffff) * 2 - 1) * scale;
  }
  return v;
}

export function relu(x: number): number {
  return x > 0 ? x : 0;
}

export function tanh(x: number): number {
  if (x > 8) return 1;
  if (x < -8) return -1;
  const e = Math.exp(2 * x);
  return (e - 1) / (e + 1);
}

export function sigmoid(x: number): number {
  if (x > 12) return 1;
  if (x < -12) return 0;
  return 1 / (1 + Math.exp(-x));
}

/** y = Wx + b */
export function affine(out: Vec, W: Mat, x: Vec, b: Vec, rows: number, cols: number) {
  for (let r = 0; r < rows; r++) {
    let s = b[r]!;
    const row = r * cols;
    for (let c = 0; c < cols; c++) s += W[row + c]! * x[c]!;
    out[r] = s;
  }
}

export function applyRelu(v: Vec) {
  for (let i = 0; i < v.length; i++) v[i] = relu(v[i]!);
}

export function applyTanh(v: Vec) {
  for (let i = 0; i < v.length; i++) v[i] = tanh(v[i]!);
}

export function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}

export function entropy(probs: number[]): number {
  let h = 0;
  for (const p of probs) {
    if (p > 1e-12) h -= p * Math.log(p);
  }
  return h;
}

export function argmax(vals: number[]): number {
  let best = 0;
  for (let i = 1; i < vals.length; i++) if (vals[i]! > vals[best]!) best = i;
  return best;
}

/** Dot product of two equal-length arrays */
export function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] ?? 0) * (b[i] ?? 0);
  return s;
}

export interface MlpSpec {
  name: string;
  version: string;
  sizes: number[]; // [in, h1, h2, ..., out]
}

export interface MlpWeights {
  layers: Array<{ W: Mat; b: Vec; in: number; out: number }>;
}

export function buildMlp(spec: MlpSpec, seed: number, scale = 0.32): MlpWeights {
  const layers: MlpWeights["layers"] = [];
  for (let i = 0; i < spec.sizes.length - 1; i++) {
    const inn = spec.sizes[i]!;
    const out = spec.sizes[i + 1]!;
    layers.push({
      W: initMat(out, inn, seed + i * 9973, scale / Math.sqrt(inn)),
      b: initVec(out, seed + i * 7919 + 1, scale * 0.15),
      in: inn,
      out,
    });
  }
  return { layers };
}

/** Forward pass; returns output vector + hidden activations for attribution */
export function forward(
  net: MlpWeights,
  input: Vec,
): { out: Vec; hiddens: Vec[] } {
  let x = input;
  const hiddens: Vec[] = [];
  for (let i = 0; i < net.layers.length; i++) {
    const layer = net.layers[i]!;
    const y = vec(layer.out);
    affine(y, layer.W, x, layer.b, layer.out, layer.in);
    const last = i === net.layers.length - 1;
    if (!last) applyRelu(y);
    hiddens.push(y);
    x = y;
  }
  return { out: x, hiddens };
}

/**
 * Feature attribution via input×|first-layer column sum| heuristic —
 * cheap, deterministic, readable in reports.
 */
export function attributeInput(
  net: MlpWeights,
  input: Vec,
  featureNames: string[],
  topK = 6,
): Array<{ feature: string; weight: number }> {
  const first = net.layers[0];
  if (!first) return [];
  const scores: Array<{ feature: string; weight: number }> = [];
  for (let c = 0; c < first.in; c++) {
    let col = 0;
    for (let r = 0; r < first.out; r++) col += Math.abs(first.W[r * first.in + c]!);
    const contrib = (input[c] ?? 0) * col;
    scores.push({ feature: featureNames[c] ?? `f${c}`, weight: +contrib.toFixed(4) });
  }
  return scores.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)).slice(0, topK);
}
