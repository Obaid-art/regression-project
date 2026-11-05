/* core.js — the arithmetic of the project, written plainly so that a student can read exactly what the page does.
   No library. Used by the page (app.js) and by the Node test (test.js). Same numbers as the notebook. */
'use strict';
const CORE = (() => {
  // ---------- numbers
  function mean(a) { let s = 0; for (const v of a) s += v; return s / a.length; }
  function std(a) { const m = mean(a); let s = 0; for (const v of a) s += (v - m) * (v - m); return Math.sqrt(s / a.length); }
  function median(a) { const b = a.slice().sort((p, q) => p - q), n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; }
  function r2(y, p) { const m = mean(y); let se = 0, st = 0; for (let i = 0; i < y.length; i++) { se += (y[i] - p[i]) ** 2; st += (y[i] - m) ** 2; } return st > 0 ? 1 - se / st : NaN; }
  function g3(v) {   // three significant figures, plain digits, a real minus sign
    v = Number(v); if (v === 0) return '0'; if (!isFinite(v)) return '—';
    let t; const a = Math.abs(v);
    if (a >= 1e-3 && a < 1e7) { t = v.toPrecision(3); if (/e/i.test(t)) t = v.toFixed(0); if (t.includes('.')) t = t.replace(/\.?0+$/, ''); }
    else t = v.toExponential(2);
    return t.replace('-', '−');
  }
  function fmt(v, d) { return (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace('-', '−'); }
  function score(v) { return v < -1 ? fmt(v, 0) : fmt(v, 3); }   // an R² below −1 is a catastrophe, not a number with three decimals
  // ---------- seeded random
  function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function randn(rng) { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function shuffled(n, rng) { const idx = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } return idx; }
  // ---------- linear algebra: solve A x = b
  function solve(A, b) {
    const n = b.length, M = A.map((r, i) => r.concat([b[i]]));
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]]; const piv = M[c][c]; if (Math.abs(piv) < 1e-12) continue;
      for (let r = c + 1; r < n; r++) { const f = M[r][c] / piv; if (f === 0) continue; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = Math.abs(M[r][r]) < 1e-12 ? 0 : s / M[r][r]; }
    return x;
  }
  function lstsq(cols, y) {   // least squares: columns of the design matrix
    const d = cols.length, A = Array.from({ length: d }, () => new Array(d).fill(0)), b = new Array(d).fill(0);
    for (let i = 0; i < y.length; i++) for (let p = 0; p < d; p++) { b[p] += cols[p][i] * y[i]; for (let q = 0; q < d; q++) A[p][q] += cols[p][i] * cols[q][i]; }
    return solve(A, b);
  }
  // ---------- the data
  function parse(csv) {
    const lines = csv.trim().split('\n').filter(l => l.trim()); const x = [], y = [];
    for (const l of lines.slice(1)) { const [a, b] = l.split(',').map(Number); x.push(a); y.push(b); }
    return { x, y };
  }
  function planted(meta) { return meta.planted || []; }
  // ---------- the split: every fourth kept row is test data
  function split(x, y, keep) {
    const xs = [], ys = [], rows = [];
    for (let i = 0; i < x.length; i++) if (keep[i]) { xs.push(x[i]); ys.push(y[i]); rows.push(i + 1); }
    const S = { xtr: [], ytr: [], xte: [], yte: [], rtr: [], rte: [] };
    for (let k = 0; k < xs.length; k++) { const test = k % 4 === 3; (test ? S.xte : S.xtr).push(xs[k]); (test ? S.yte : S.ytr).push(ys[k]); (test ? S.rte : S.rtr).push(rows[k]); }
    S.mx = mean(S.xtr); S.sx = std(S.xtr) || 1; S.my = mean(S.ytr); S.sy = std(S.ytr) || 1;
    S.zx = v => (v - S.mx) / S.sx; S.zy = v => (v - S.my) / S.sy; S.unzy = v => v * S.sy + S.my;
    const lo = Math.min(...xs), hi = Math.max(...xs); S.grid = Array.from({ length: 200 }, (_, i) => lo + (hi - lo) * i / 199);
    return S;
  }
  // ---------- the line: on standardised data, through the middle, one knob
  function lineOn(xtr, ytr) {
    const mx = mean(xtr), sx = std(xtr) || 1, my = mean(ytr), sy = std(ytr) || 1;
    let sxy = 0, sxx = 0; for (let i = 0; i < xtr.length; i++) { const xp = (xtr[i] - mx) / sx, yp = (ytr[i] - my) / sy; sxy += xp * yp; sxx += xp * xp; }
    const mstd = sxy / sxx, b = mstd * sy / sx, a = my - b * mx;
    const f1 = v => ((v - mx) / sx * mstd) * sy + my, f = v => Array.isArray(v) ? v.map(f1) : f1(v);
    let loss = 0; for (let i = 0; i < xtr.length; i++) { const xp = (xtr[i] - mx) / sx, yp = (ytr[i] - my) / sy; loss += (yp - mstd * xp) ** 2; }
    return { mstd, a, b, f, loss, sxy, sxx };
  }
  function lossAt(S, mstd) { let L = 0; for (let i = 0; i < S.xtr.length; i++) { const xp = S.zx(S.xtr[i]), yp = S.zy(S.ytr[i]); L += (yp - mstd * xp) ** 2; } return L; }
  function eqText(meta, a, b) { return `${meta.y} = ${g3(a)} ${b < 0 ? '−' : '+'} ${g3(Math.abs(b))} · ${meta.x}`; }
  // ---------- the network: layers of ReLU, Adam or plain gradient descent, batches
  function Net(hidden, seed) {
    const rng = mulberry32(seed || 1); const sizes = [1].concat(hidden, [1]); const W = [], B = [];
    for (let l = 0; l < sizes.length - 1; l++) { const sc = Math.sqrt(2 / (sizes[l] + sizes[l + 1])); W.push(Array.from({ length: sizes[l + 1] }, () => Array.from({ length: sizes[l] }, () => randn(rng) * sc))); B.push(new Array(sizes[l + 1]).fill(0)); }
    const mW = W.map(w => w.map(r => r.map(() => 0))), vW = W.map(w => w.map(r => r.map(() => 0))), mB = B.map(b => b.map(() => 0)), vB = B.map(b => b.map(() => 0));
    const L = W.length; let t = 0, epochs = 0; const nParams = W.reduce((s, w) => s + w.length * w[0].length, 0) + B.reduce((s, b) => s + b.length, 0);
    function forward(x) { const A = [[x]], Z = []; for (let l = 0; l < L; l++) { const prev = A[l], out = [], z = []; for (let i = 0; i < W[l].length; i++) { let s = B[l][i]; for (let j = 0; j < prev.length; j++) s += W[l][i][j] * prev[j]; z.push(s); out.push(l === L - 1 ? s : Math.max(0, s)); } A.push(out); Z.push(z); } return { A, Z }; }
    function predict1(x) { return forward(x).A[L][0]; }
    function predict(xs) { return xs.map(predict1); }
    function epoch(X, y, lr, batch, plain) {
      const order = shuffled(X.length, mulberry32(1000 + epochs)); epochs++;
      for (let s = 0; s < order.length; s += batch) {
        const ids = order.slice(s, s + batch), gW = W.map(w => w.map(r => r.map(() => 0))), gB = B.map(b => b.map(() => 0));
        for (const i of ids) {
          const { A, Z } = forward(X[i]); let delta = [(A[L][0] - y[i]) / ids.length];
          for (let l = L - 1; l >= 0; l--) {
            const prev = A[l];
            for (let r = 0; r < W[l].length; r++) { gB[l][r] += delta[r]; for (let j = 0; j < prev.length; j++) gW[l][r][j] += delta[r] * prev[j]; }
            if (l > 0) { const nd = new Array(prev.length).fill(0); for (let j = 0; j < prev.length; j++) { let q = 0; for (let r = 0; r < W[l].length; r++) q += W[l][r][j] * delta[r]; nd[j] = Z[l - 1][j] > 0 ? q : 0; } delta = nd; }
          }
        }
        t++; const c1 = 1 - 0.9 ** t, c2 = 1 - 0.999 ** t;
        for (let l = 0; l < L; l++) for (let r = 0; r < W[l].length; r++) {
          for (let j = 0; j < W[l][r].length; j++) {
            const g = gW[l][r][j];
            if (plain) W[l][r][j] -= lr * g;
            else { mW[l][r][j] = 0.9 * mW[l][r][j] + 0.1 * g; vW[l][r][j] = 0.999 * vW[l][r][j] + 0.001 * g * g; W[l][r][j] -= lr * (mW[l][r][j] / c1) / (Math.sqrt(vW[l][r][j] / c2) + 1e-8); }
          }
          const g = gB[l][r];
          if (plain) B[l][r] -= lr * g;
          else { mB[l][r] = 0.9 * mB[l][r] + 0.1 * g; vB[l][r] = 0.999 * vB[l][r] + 0.001 * g * g; B[l][r] -= lr * (mB[l][r] / c1) / (Math.sqrt(vB[l][r] / c2) + 1e-8); }
        }
      }
    }
    return { predict, epoch, nParams, W, B };
  }
  // train on standardised data; returns a predictor in plant units
  function trainNet(S, layers, neurons, E, lr, batch, seed, onEpoch) {
    const net = Net(Array(layers).fill(neurons), seed); const X = S.xtr.map(S.zx), y = S.ytr.map(S.zy);
    const f = v => v.map(u => S.unzy(net.predict([S.zx(u)])[0]));
    for (let e = 1; e <= E; e++) { net.epoch(X, y, lr, batch, false); if (onEpoch && (e % Math.max(1, Math.floor(E / 10)) === 0 || e === E)) onEpoch(e, f); }
    const tr = r2(S.ytr, f(S.xtr)), te = r2(S.yte, f(S.xte));
    return { f, weights: net.nParams, train: isFinite(tr) ? tr : -9, test: isFinite(te) ? te : -9 };
  }
  // the same network, plain gradient descent, on raw numbers and on standardised ones
  function stdEffect(S) {
    const out = {};
    for (const raw of [true, false]) {
      const net = Net([8, 8], 7); const X = raw ? S.xtr.slice() : S.xtr.map(S.zx), y = raw ? S.ytr.slice() : S.ytr.map(S.zy);
      for (let e = 0; e < 300; e++) net.epoch(X, y, 0.05, 16, true);
      const f = raw ? (v => v.map(u => net.predict([u])[0])) : (v => v.map(u => S.unzy(net.predict([S.zx(u)])[0])));
      const clean = p => p.map(u => isFinite(u) ? u : NaN); const tr = r2(S.ytr, clean(f(S.xtr))), te = r2(S.yte, clean(f(S.xte)));
      out[raw ? 'raw' : 'std'] = { f: v => clean(f(v)), train: isFinite(tr) ? tr : -9, test: isFinite(te) ? te : -9 };
    }
    return out;
  }
  // ---------- the physical laws, one or two numbers fitted by least squares
  const LAWS = {
    lin: { cols: x => [x.map(() => 1), x], tr: 'none' }, sqrt: { cols: x => [x.map(v => Math.sqrt(Math.max(v, 0)))], tr: 'none' },
    exp: { cols: x => [x.map(() => 1), x], tr: 'log' }, arrhenius: { cols: x => [x.map(() => 1), x.map(v => 1 / Math.max(v, 1e-9))], tr: 'log' },
    torricelli: { cols: x => [x.map(() => 1), x], tr: 'sqrt' }, quad: { cols: x => [x.map(() => 1), x.map(v => v * v)], tr: 'none' }, ergun: { cols: x => [x, x.map(v => v * v)], tr: 'none' },
  };
  function fitLaw(meta, S) {
    const kind = meta.law; if (kind === 'none') return null;
    const law = LAWS[kind]; let x = S.xtr, y = S.ytr, target, back;
    if (law.tr === 'log') { const ok = y.map(v => v > 0); x = x.filter((_, i) => ok[i]); y = y.filter((_, i) => ok[i]); target = y.map(Math.log); back = v => Math.exp(v); }
    else if (law.tr === 'sqrt') { const ok = y.map(v => v >= 0); x = x.filter((_, i) => ok[i]); y = y.filter((_, i) => ok[i]); target = y.map(Math.sqrt); back = v => Math.max(v, 0) ** 2; }
    else { target = y; back = v => v; }
    const coef = lstsq(law.cols(x), target);
    const f = v => { const cols = law.cols(v); return v.map((_, i) => back(cols.reduce((s, c, k) => s + c[i] * coef[k], 0))); };
    return { kind, text: meta.law_text, coef, n: coef.length, f, train: r2(S.ytr, f(S.xtr)), test: r2(S.yte, f(S.xte)) };
  }
  // ---------- the comparison on the test rows
  function compare(meta, S, line, pick) {   // two candidates on the test rows: the line and the network the group picked
    const tol = 0.02;
    const rows = [{ name: 'linear regression', params: 2, train: line.train, test: line.test, f: line.f, color: '#1A1A1A' },
                  { name: `neural network (run ${pick.run}: ${pick.layers} × ${pick.neurons}, ${pick.epochs} epochs)`, params: pick.weights, train: pick.train, test: pick.test, f: pick.f, color: '#2E7D5B' }];
    const same = line.test >= pick.test - tol;
    const verdict = same ? `Same test score. Linear regression needed 2 parameters. The neural network needed ${pick.weights}. Linear regression wins.` : `The neural network scored ${fmt(pick.test - line.test, 2)} higher on the test data. The data is not a straight line. The neural network wins.`;
    return { rows, verdict, same, nline: 2, nnet: pick.weights };
  }
  function handQuestion(cmp) {   // the last question, with the real counts of this run
    if (!cmp) return 'Which model would you hand to the plant engineer, linear regression or the neural network? Why?';
    return (cmp.same ? `Same test score. Linear regression needed 2 parameters: you only chose the slope. The neural network needed ${cmp.nnet}.` : `Linear regression: 2 parameters. The neural network: ${cmp.nnet} parameters, and a higher test score.`) + ' Which one would you hand to the plant engineer, and why?';
  }
  return { mean, std, median, r2, g3, fmt, score, handQuestion, mulberry32, parse, planted, split, lineOn, lossAt, eqText, Net, trainNet, stdEffect, fitLaw, compare, LAWS };
})();
if (typeof module !== 'undefined') module.exports = CORE;
