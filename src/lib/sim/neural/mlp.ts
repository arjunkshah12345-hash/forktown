/**
 * Tiny pure-TS MLP — forward + backprop. Deterministic. No deps.
 */

export type Vec = Float64Array;
export type Mat = Float64Array;

export function vec(n: number, fill = 0): Vec {
  const v = new Float64Array(n);
  if (fill) v.fill(fill);
  return v;
}

export function mat(rows: number, cols: number): Mat {
  return new Float64Array(rows * cols);
}

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

export function sigmoid(x: number): number {
  if (x > 12) return 1;
  if (x < -12) return 0;
  return 1 / (1 + Math.exp(-x));
}

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

export interface MlpSpec {
  name: string;
  version: string;
  sizes: number[];
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

export function cloneMlp(net: MlpWeights): MlpWeights {
  return {
    layers: net.layers.map((l) => ({
      W: new Float64Array(l.W),
      b: new Float64Array(l.b),
      in: l.in,
      out: l.out,
    })),
  };
}

export function serializeMlp(net: MlpWeights): number[][][] {
  return net.layers.map((l) => [Array.from(l.W), Array.from(l.b)]);
}

export function loadMlp(sizes: number[], data: number[][][]): MlpWeights {
  const layers: MlpWeights["layers"] = [];
  for (let i = 0; i < sizes.length - 1; i++) {
    const inn = sizes[i]!;
    const out = sizes[i + 1]!;
    const [W, b] = data[i]!;
    layers.push({
      W: Float64Array.from(W!),
      b: Float64Array.from(b!),
      in: inn,
      out,
    });
  }
  return { layers };
}

export function forward(net: MlpWeights, input: Vec): { out: Vec; hiddens: Vec[] } {
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
 * One SGD step: MSE on scalar output. Returns loss.
 * Activations: input → relu hiddens → linear out
 */
export function trainStep(
  net: MlpWeights,
  input: Vec,
  target: number,
  lr: number,
): number {
  const n = net.layers.length;
  const pre: Vec[] = [];
  const post: Vec[] = [];
  let x: Vec = input;
  for (let i = 0; i < n; i++) {
    const layer = net.layers[i]!;
    const z = vec(layer.out);
    affine(z, layer.W, x, layer.b, layer.out, layer.in);
    pre.push(z);
    const a = new Float64Array(z);
    if (i < n - 1) applyRelu(a);
    post.push(a);
    x = a;
  }
  const pred = post[n - 1]![0]!;
  const err = pred - target;
  const loss = 0.5 * err * err;

  // deltas
  const deltas: Vec[] = new Array(n);
  deltas[n - 1] = vec(net.layers[n - 1]!.out);
  deltas[n - 1]![0] = err;

  for (let i = n - 2; i >= 0; i--) {
    const layer = net.layers[i + 1]!;
    const d = vec(net.layers[i]!.out);
    for (let c = 0; c < layer.in; c++) {
      let s = 0;
      for (let r = 0; r < layer.out; r++) s += layer.W[r * layer.in + c]! * deltas[i + 1]![r]!;
      d[c] = pre[i]![c]! > 0 ? s : 0;
    }
    deltas[i] = d;
  }

  // update
  let prevAct: Vec = input;
  for (let i = 0; i < n; i++) {
    const layer = net.layers[i]!;
    const d = deltas[i]!;
    for (let r = 0; r < layer.out; r++) {
      layer.b[r]! -= lr * d[r]!;
      const row = r * layer.in;
      for (let c = 0; c < layer.in; c++) {
        layer.W[row + c]! -= lr * d[r]! * prevAct[c]!;
      }
    }
    prevAct = post[i]!;
  }
  return loss;
}

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
