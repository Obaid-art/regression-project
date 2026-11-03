/* app.js — the page: six stations, Plotly pictures, the Word report and the slides. The arithmetic lives in core.js. */
'use strict';
const $ = id => document.getElementById(id), C = CORE;
const COL = { blue: '#2F6DB5', halo: '#9EC2EB', amber: '#D9781E', added: '#FAC785', green: '#2E7D5B', red: '#B5453F', purple: '#7B2FA0', ink: '#1A1A1A', grey: '#8A95A0', rule: '#DFE5EA' };
const ST = { g: null, meta: null, x: [], y: [], removed: {}, keep: [], S: null, attempts: [], line: null, board: [], nets: {}, pick: null, intuition: {}, effect: null, std: null, cmp: null, law: null, locked: false };
const NEUR = [1, 2, 4, 8, 16, 32, 64], EPO = [50, 100, 300, 1000, 3000, 10000], LRS = [0.001, 0.003, 0.01, 0.03, 0.1], BAT = [4, 8, 16, 32];

// ---------- pictures
const FONT = { family: '"Segoe UI", system-ui, Arial, sans-serif', size: 16, color: COL.ink };
function layout(title, xt, yt, extra) {
  return Object.assign({ title: { text: title, font: { size: 19, color: COL.blue, family: FONT.family }, x: 0.02, xanchor: 'left' }, font: FONT, margin: { l: 70, r: 20, t: 52, b: 118 }, paper_bgcolor: '#fff', plot_bgcolor: '#fff',
    xaxis: { title: { text: xt, font: { size: 16 } }, gridcolor: COL.rule, zeroline: false, linecolor: '#9FB3CC' }, yaxis: { title: { text: yt, font: { size: 16 } }, gridcolor: COL.rule, zeroline: false, linecolor: '#9FB3CC' },
    legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.3, yanchor: 'top', font: { size: 14 } }, hovermode: 'closest', showlegend: true }, extra || {});
}
function dots(x, y, name, test, rows, size) { return { x, y, name, mode: 'markers', type: 'scatter', customdata: rows, hovertemplate: rows ? 'row %{customdata}<br>%{x}, %{y}<extra></extra>' : '%{x}, %{y}<extra></extra>', marker: { size: size || 12, color: test ? COL.added : COL.halo, line: { color: test ? COL.amber : COL.blue, width: 2 } } }; }
function curve(x, y, name, color, dash) { return { x, y, name, mode: 'lines', type: 'scatter', hoverinfo: 'skip', line: { color, width: 4, dash: dash || 'solid' } }; }
function sticks(xs, ys, f) { const x = [], y = []; for (let i = 0; i < xs.length; i++) { x.push(xs[i], xs[i], null); y.push(ys[i], f([xs[i]])[0], null); } return { x, y, name: 'the error', mode: 'lines', type: 'scatter', hoverinfo: 'skip', line: { color: COL.red, width: 2.5 } }; }
function draw(id, traces, lay) { return Plotly.react($(id), traces, lay, { displayModeBar: false, responsive: true }); }
const ax = () => [`${ST.meta.x} (${ST.meta.xu})`, `${ST.meta.y} (${ST.meta.yu})`];
async function figure(traces, lay, w, h) {   // a PNG of a picture, for the report: drawn off screen at a fixed size
  const d = document.createElement('div'); d.style.cssText = `position:fixed;left:-20000px;top:0;width:${w}px;height:${h}px`; document.body.appendChild(d);
  await Plotly.newPlot(d, traces, Object.assign({}, lay, { width: w, height: h }), { staticPlot: true }); const url = await Plotly.toImage(d, { format: 'png', width: w, height: h, scale: 2 }); Plotly.purge(d); d.remove(); return url;
}

// ---------- stations
const nav = [...document.querySelectorAll('nav button')];
function show(k) { document.querySelectorAll('.station').forEach(s => s.classList.toggle('on', s.id === 'st' + k)); nav.forEach(b => b.classList.toggle('on', +b.dataset.st === k)); window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => window.dispatchEvent(new Event('resize')), 50); }
function unlock(k) { nav[k].disabled = false; } function done(k) { nav[k].classList.add('done'); }
nav.forEach(b => b.addEventListener('click', () => show(+b.dataset.st)));
document.querySelectorAll('textarea[data-q]').forEach(t => t.addEventListener('input', () => { ST.intuition[t.dataset.q] = t.value; save(); }));
function save() { if (!ST.g) return; try { localStorage.setItem('project-g' + ST.g, JSON.stringify({ removed: ST.removed, intuition: ST.intuition, members: $('members').value })); $('saved').textContent = 'saved in this browser'; } catch (e) { } }
function load() { try { const d = JSON.parse(localStorage.getItem('project-g' + ST.g) || 'null'); if (!d) return; ST.removed = d.removed || {}; ST.intuition = d.intuition || {}; $('members').value = d.members || ''; document.querySelectorAll('textarea[data-q]').forEach(t => t.value = ST.intuition[t.dataset.q] || ''); } catch (e) { } }

// ---------- 0 · the group
for (const g of Object.keys(DATA)) { const m = DATA[g]; const b = document.createElement('button'); b.className = 'rig'; b.innerHTML = `<div class="g">group ${g}</div><b>${m.name}</b><span>${m.story}</span>`; b.addEventListener('click', () => choose(g)); $('rigs').appendChild(b); }
function choose(g) {
  const m = DATA[g], { x, y } = C.parse(m.csv); Object.assign(ST, { g, meta: m, x, y, removed: {}, keep: [], S: null, attempts: [], line: null, board: [], nets: {}, pick: null, intuition: {}, effect: null, std: null, cmp: null, law: null, locked: false });
  load(); $('story').textContent = `Group ${g} · ${m.name}. ${m.story} ${x.length} rows of ${m.x} (${m.xu}) against ${m.y} (${m.yu}).`;
  unlock(1); done(0); show(1); drawData(); listRemoved(); $('card1b').hidden = true; $('hint').hidden = true;
}

// ---------- 1 · look and clean
let inspected = null;
function keptRows() { return ST.x.map((_, i) => !ST.removed[i + 1]); }
function drawData() {
  const keep = keptRows(), rows = [], xs = [], ys = []; for (let i = 0; i < ST.x.length; i++) if (keep[i]) { rows.push(i + 1); xs.push(ST.x[i]); ys.push(ST.y[i]); }
  const [xt, yt] = ax(); draw('p1', [dots(xs, ys, 'a measurement', false, rows, 13)], layout(`group ${ST.g}: ${ST.meta.name}`, xt, yt, { showlegend: false }));
  $('p1').on('plotly_click', ev => { const p = ev.points[0]; inspect(p.customdata); });
  $('count1') && 0;
}
function inspect(row) { inspected = row; const i = row - 1; $('inspect').innerHTML = `<div class="row">row ${row}</div><div class="muted">${ST.meta.x} = <b>${C.g3(ST.x[i])}</b> ${ST.meta.xu} &nbsp;·&nbsp; ${ST.meta.y} = <b>${C.g3(ST.y[i])}</b> ${ST.meta.yu}</div>`; $('removeBtn').disabled = ST.locked; }
$('removeBtn').addEventListener('click', () => { if (!inspected) return; const i = inspected - 1; $('mText').textContent = `Row ${inspected}: ${ST.meta.x} = ${C.g3(ST.x[i])} ${ST.meta.xu}, ${ST.meta.y} = ${C.g3(ST.y[i])} ${ST.meta.yu}. Say why, in one line.`; $('mWhy').value = ''; $('modal').hidden = false; $('mWhy').focus(); });
$('mNo').addEventListener('click', () => $('modal').hidden = true);
$('mYes').addEventListener('click', () => { const why = $('mWhy').value.trim(); if (!why) { $('mWhy').focus(); $('mWhy').placeholder = 'A reason is required: it goes into your report.'; return; } ST.removed[inspected] = why; $('modal').hidden = true; inspected = null; $('inspect').innerHTML = '<div class="muted">Removed. Click another point, or keep your choice.</div>'; $('removeBtn').disabled = true; drawData(); listRemoved(); save(); });
function listRemoved() {
  const rows = Object.keys(ST.removed).map(Number).sort((a, b) => a - b); $('removed').innerHTML = rows.length ? '<h2 style="margin-top:14px">Removed</h2>' + rows.map(r => `<div class="item"><b>row ${r}</b><span>${ST.removed[r]}</span>${ST.locked ? '' : `<button class="btn sec sm" data-undo="${r}">put it back</button>`}</div>`).join('') : '';
  $('removed').querySelectorAll('button[data-undo]').forEach(b => b.addEventListener('click', () => { delete ST.removed[+b.dataset.undo]; drawData(); listRemoved(); save(); }));
}
$('tableBtn').addEventListener('click', () => { const t = $('table'); t.hidden = !t.hidden; if (!t.hidden) t.innerHTML = '<table><thead><tr><th>row</th><th>' + ST.meta.x + '</th><th>' + ST.meta.y + '</th></tr></thead><tbody>' + ST.x.map((v, i) => `<tr${ST.removed[i + 1] ? ' style="opacity:.35"' : ''}><td>${i + 1}</td><td>${C.g3(v)}</td><td>${C.g3(ST.y[i])}</td></tr>`).join('') + '</tbody></table>'; });
let hints = 0;
$('hintBtn').addEventListener('click', () => { hints++; const pl = C.planted(ST.meta); const found = pl.filter(p => ST.removed[p.row]).length; const h = $('hint'); h.hidden = false; h.innerHTML = hints === 1 ? `This dataset has <b>${pl.length}</b> planted problems: ${pl.filter(p => p.kind !== 'outlier').length} rows that cannot be real, and ${pl.filter(p => p.kind === 'outlier').length} outlier. You have removed ${found} of them so far.` : hints === 2 ? `Look at the units, at the sign, and at the ends of the range. A sensor can read exactly zero when it is dead. You have removed ${found} of ${pl.length}.` : `Think about what the rig can physically read (${ST.meta.x} from ${C.g3(ST.meta.xmin)} to ${C.g3(ST.meta.xmax)} ${ST.meta.xu}; ${ST.meta.y} from ${C.g3(ST.meta.ymin)} to ${C.g3(ST.meta.ymax)} ${ST.meta.yu}). You have removed ${found} of ${pl.length}.`; });
$('keepBtn').addEventListener('click', () => { ST.locked = true; ST.keep = keptRows(); $('removeBtn').disabled = true; listRemoved(); $('card1b').hidden = false; $('card1b').scrollIntoView({ behavior: 'smooth' }); done(1); });
$('back1').addEventListener('click', () => { ST.locked = false; listRemoved(); $('card1b').hidden = true; $('p1b').hidden = true; $('t1b').innerHTML = ''; $('ask1b').hidden = true; $('to2').disabled = true; });
function cleaningEffect() {   // the line twice on the same sealed rows: with the removed rows put back into training, and with the cleaning
  const removed = Object.keys(ST.removed).map(Number); const S = C.split(ST.x, ST.y, ST.keep);
  const back = removed.filter(r => !S.rte.includes(r)); const xtrAll = S.xtr.concat(back.map(r => ST.x[r - 1])), ytrAll = S.ytr.concat(back.map(r => ST.y[r - 1]));
  const withR = C.lineOn(xtrAll, ytrAll), without = C.lineOn(S.xtr, S.ytr);
  const res = { with: { test: C.r2(S.yte, withR.f(S.xte)), eq: C.eqText(ST.meta, withR.a, withR.b), b: withR.b }, without: { test: C.r2(S.yte, without.f(S.xte)), eq: C.eqText(ST.meta, without.a, without.b), b: without.b }, removed };
  return { S, xtrAll, ytrAll, withR, without, res };
}
$('effectBtn').addEventListener('click', () => {
  const removed = Object.keys(ST.removed).map(Number); if (!removed.length) { $('t1b').innerHTML = '<div class="tile ink"><div class="k">nothing removed yet</div><div class="v small">put a row back? no: remove something first, or go on</div></div>'; $('to2').disabled = false; $('ask1b').hidden = false; return; }
  const { S, xtrAll, ytrAll, withR, without, res } = cleaningEffect(); const [xt, yt] = ax();
  ST.effect = res; $('p1b').hidden = false;
  const grid = S.grid;
  draw('p1b_with', [dots(xtrAll, ytrAll, 'training rows', false), dots(S.xte, S.yte, 'sealed test rows', true), curve(grid, withR.f(grid), 'the line', COL.ink)], layout(`with the removed rows put back:  test R² = ${C.fmt(res.with.test, 3)}`, xt, yt));
  draw('p1b_without', [dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'sealed test rows', true), curve(grid, without.f(grid), 'the line', COL.ink)], layout(`with your cleaning:  test R² = ${C.fmt(res.without.test, 3)}`, xt, yt));
  const tilt = Math.abs(withR.b - without.b) / Math.max(Math.abs(without.b), 1e-9) * 100;
  $('t1b').innerHTML = `<div class="tile red"><div class="k">test R², rows put back</div><div class="v">${C.fmt(res.with.test, 3)}</div></div><div class="tile green"><div class="k">test R², your cleaning</div><div class="v">${C.fmt(res.without.test, 3)}</div></div><div class="tile ink"><div class="k">slope change</div><div class="v">${tilt.toFixed(0)} %</div></div><div class="tile ink"><div class="k">the line, your cleaning</div><div class="v small">${res.without.eq}</div></div>`;
  $('ask1b').hidden = false; $('to2').disabled = false; save();
});
$('to2').addEventListener('click', () => { unlock(2); show(2); });

// ---------- 2 · split and standardise
$('splitBtn').addEventListener('click', () => {
  ST.keep = keptRows(); const S = ST.S = C.split(ST.x, ST.y, ST.keep); ST.attempts = []; ST.line = null; ST.board = []; ST.nets = {}; ST.pick = null; ST.cmp = null; const [xt, yt] = ax(); const m = ST.meta;
  $('p2').hidden = false;
  draw('p2a', [dots(S.xtr, S.ytr, `${S.xtr.length} training rows`, false, S.rtr), dots(S.xte, S.yte, `${S.xte.length} sealed test rows`, true, S.rte)], layout('every fourth kept row is sealed', xt, yt));
  draw('p2b', [{ x: S.xtr.map(S.zx), y: S.xtr.map(() => 1), name: m.x + '′', mode: 'markers', type: 'scatter', marker: { size: 12, color: COL.halo, line: { color: COL.blue, width: 2 } }, hovertemplate: '%{x:.2f}<extra></extra>' }, { x: S.ytr.map(S.zy), y: S.ytr.map(() => 0), name: m.y + '′', mode: 'markers', type: 'scatter', marker: { size: 12, color: COL.added, line: { color: COL.amber, width: 2 } }, hovertemplate: '%{x:.2f}<extra></extra>' }],
    layout('both live between about −2 and +2', 'standardised value: (value − mean) / std', '', { yaxis: { tickvals: [1, 0], ticktext: [m.x + '′', m.y + '′'], range: [-0.7, 1.7], gridcolor: COL.rule }, showlegend: false }));
  const x0 = S.xtr[0], y0 = S.ytr[0];
  $('t2').innerHTML = `<div class="tile ink"><div class="k">${m.x}: mean, std</div><div class="v small">${C.g3(S.mx)} ${m.xu}, ${C.g3(S.sx)} ${m.xu}</div></div><div class="tile ink"><div class="k">${m.y}: mean, std</div><div class="v small">${C.g3(S.my)} ${m.yu}, ${C.g3(S.sy)} ${m.yu}</div></div><div class="tile blue"><div class="k">first training row, by substitution</div><div class="v small">x′ = (${C.g3(x0)} − ${C.g3(S.mx)}) / ${C.g3(S.sx)} = ${C.fmt(S.zx(x0), 2)}</div></div><div class="tile amber"><div class="k">and its output</div><div class="v small">y′ = (${C.g3(y0)} − ${C.g3(S.my)}) / ${C.g3(S.sy)} = ${C.fmt(S.zy(y0), 2)}</div></div>`;
  $('card2b').hidden = false; done(2);
});
$('stdBtn').addEventListener('click', () => {
  if (!ST.S) return; $('stdBtn').disabled = true; $('n2b').textContent = 'training…';
  setTimeout(() => {
    const S = ST.S, r = C.stdEffect(S); ST.std = { raw: r.raw.test, std: r.std.test, rawTrain: r.raw.train, stdTrain: r.std.train }; const [xt, yt] = ax(); const lo = Math.min(...S.ytr, ...S.yte), hi = Math.max(...S.ytr, ...S.yte), pad = 0.25 * (hi - lo);
    $('p2c').hidden = false;
    for (const [id, key, title] of [['p2c_raw', 'raw', 'raw numbers'], ['p2c_std', 'std', 'standardised']]) {
      const yy = r[key].f(S.grid).map(v => isFinite(v) ? Math.max(lo - pad, Math.min(hi + pad, v)) : null);
      draw(id, [dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'sealed test rows', true), curve(S.grid, yy, 'the network', COL.green)], layout(`${title}:  test R² = ${C.fmt(Math.max(r[key].test, -9), 2)}`, xt, yt, { yaxis: { range: [lo - pad, hi + pad], title: { text: yt }, gridcolor: COL.rule } }));
    }
    $('t2b').innerHTML = `<div class="tile red"><div class="k">raw numbers, test R²</div><div class="v">${C.fmt(Math.max(r.raw.test, -9), 2)}</div></div><div class="tile green"><div class="k">standardised, test R²</div><div class="v">${C.fmt(r.std.test, 2)}</div></div>`;
    $('n2b').textContent = 'Same network, same recipe (gradient descent), same epochs. On raw numbers every step is the wrong size: too big for one weight, too small for another, and the bends switch off. One currency first.';
    $('to3').disabled = false; $('stdBtn').disabled = false;
  }, 30);
});
$('to3').addEventListener('click', () => { unlock(3); show(3); setTimeout(() => showLine(+$('m').value), 100); });

// ---------- 3 · the line
function showLine(mstd) {
  const S = ST.S; if (!S) return; const [xt, yt] = ax(); const L = C.lossAt(S, mstd); ST.attempts.push({ m: mstd, L });
  const f = v => v.map(u => S.unzy(mstd * S.zx(u)));
  draw('p3a', [dots(S.xtr, S.ytr, 'training rows', false), curve(S.grid, f(S.grid), 'the line', COL.ink), sticks(S.xtr, S.ytr, f)], layout(`attempt ${ST.attempts.length}:  m = ${C.fmt(mstd, 2)},  loss L = ${C.fmt(L, 2)}`, xt, yt));
  const mm = Array.from({ length: 161 }, (_, i) => -2 + i / 40); const bowl = mm.map(v => C.lossAt(S, v));
  draw('p3b', [curve(mm, bowl, 'the whole bowl', COL.halo), { x: ST.attempts.map(a => a.m), y: ST.attempts.map(a => a.L), name: 'your attempts', mode: 'markers', type: 'scatter', marker: { size: 12, color: COL.added, line: { color: COL.red, width: 2 } }, hovertemplate: 'm = %{x:.2f}, L = %{y:.2f}<extra></extra>' }, { x: [mstd], y: [L], name: 'this attempt', mode: 'markers', type: 'scatter', marker: { size: 18, color: COL.red }, hoverinfo: 'skip' }], layout('the bowl: loss against the slope', 'slope m (standardised)', 'loss L'));
  $('t3').innerHTML = `<div class="tile ink"><div class="k">loss L</div><div class="v">${C.fmt(L, 2)}</div></div><div class="tile blue"><div class="k">training R²</div><div class="v">${C.fmt(C.r2(S.ytr, f(S.xtr)), 3)}</div></div><div class="tile amber"><div class="k">test R²</div><div class="v">${C.fmt(C.r2(S.yte, f(S.xte)), 3)}</div></div>`;
}
$('m').addEventListener('input', () => $('mv').textContent = C.fmt(+$('m').value, 2)); $('m').addEventListener('change', () => showLine(+$('m').value));
$('fitBtn').addEventListener('click', () => {
  const S = ST.S; const ln = C.lineOn(S.xtr, S.ytr); ln.train = C.r2(S.ytr, ln.f(S.xtr)); ln.test = C.r2(S.yte, ln.f(S.xte)); ln.eq = C.eqText(ST.meta, ln.a, ln.b); ST.line = ln; const [xt, yt] = ax();
  draw('p3a', [dots(S.xtr, S.ytr, 'training rows', false), curve(S.grid, ln.f(S.grid), 'the line', COL.ink), sticks(S.xtr, S.ytr, ln.f)], layout(`the bottom of the bowl:  m = ${C.fmt(ln.mstd, 3)},  training R² = ${C.fmt(ln.train, 3)}`, xt, yt));
  draw('p3b', [dots(S.xte, S.yte, 'sealed test rows', true), curve(S.grid, ln.f(S.grid), 'the line', COL.ink), sticks(S.xte, S.yte, ln.f)], layout(`the sealed test rows:  R² = ${C.fmt(ln.test, 3)}`, xt, yt));
  $('eq3').hidden = false; $('eq3').innerHTML = `m = Σx′y′ / Σx′² = ${C.g3(ln.sxy)} / ${C.g3(ln.sxx)} = <b>${C.fmt(ln.mstd, 3)}</b> &nbsp;·&nbsp; in plant units: <b>${ln.eq}</b>`;
  $('t3').innerHTML = `<div class="tile ink"><div class="k">loss at the bottom</div><div class="v">${C.fmt(ln.loss, 2)}</div></div><div class="tile blue"><div class="k">training R²</div><div class="v">${C.fmt(ln.train, 3)}</div></div><div class="tile amber"><div class="k">test R²</div><div class="v">${C.fmt(ln.test, 3)}</div></div>`;
  $('to4').disabled = false; done(3);
});
$('to4').addEventListener('click', () => { unlock(4); show(4); });

// ---------- 4 · the network board
const knobs = [['layers', 'layersv', v => v], ['neurons', 'neuronsv', v => NEUR[v]], ['epochs', 'epochsv', v => EPO[v]], ['lr', 'lrv', v => LRS[v]], ['batch', 'batchv', v => BAT[v]]];
for (const [id, out, f] of knobs) $(id).addEventListener('input', () => $(out).textContent = f(+$(id).value));
let training = false;
$('trainBtn').addEventListener('click', () => {
  if (training || !ST.S) return; const S = ST.S, L = +$('layers').value, n = NEUR[+$('neurons').value], E = EPO[+$('epochs').value], lr = LRS[+$('lr').value], b = BAT[+$('batch').value];
  training = true; $('trainBtn').disabled = true; $('n4').textContent = `training ${L} × ${n}, ${E} epochs…`; const [xt, yt] = ax(); const run = ST.board.length + 1;
  const net = C.Net(Array(L).fill(n), run); const X = S.xtr.map(S.zx), y = S.ytr.map(S.zy); const f = v => v.map(u => S.unzy(net.predict([S.zx(u)])[0])); let e = 0; const chunk = Math.max(1, Math.floor(E / 20));
  const lo = Math.min(...S.ytr, ...S.yte), hi = Math.max(...S.ytr, ...S.yte), pad = 0.25 * (hi - lo);
  function step() {
    const stop = Math.min(E, e + chunk); for (; e < stop; e++) net.epoch(X, y, lr, b, false);
    const yy = f(S.grid).map(v => isFinite(v) ? Math.max(lo - pad, Math.min(hi + pad, v)) : null);
    draw('p4', [dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'sealed test rows', true), curve(S.grid, yy, 'the network', COL.green)], layout(`${L} layer${L > 1 ? 's' : ''} × ${n} neurons · learning rate ${lr} · batch ${b} · epoch ${e} of ${E}`, xt, yt, { yaxis: { range: [lo - pad, hi + pad], title: { text: yt }, gridcolor: COL.rule } }));
    $('prog').style.width = (100 * e / E) + '%';
    if (e < E) setTimeout(step, 0);
    else {
      const tr = C.r2(S.ytr, f(S.xtr)), te = C.r2(S.yte, f(S.xte)); const row = { run, layers: L, neurons: n, epochs: E, lr, batch: b, weights: net.nParams, train: isFinite(tr) ? tr : -9, test: isFinite(te) ? te : -9, f, yg: yy };
      ST.board.push(row); ST.nets[run] = row; $('trv').textContent = C.fmt(row.train, 3); $('tev').textContent = C.fmt(row.test, 3); $('trv').classList.add('pulse'); $('tev').classList.add('pulse'); setTimeout(() => { $('trv').classList.remove('pulse'); $('tev').classList.remove('pulse'); }, 700);
      $('n4').textContent = `run ${run} is on the board. Training R² ${C.fmt(row.train, 3)}, test R² ${C.fmt(row.test, 3)}.`; training = false; $('trainBtn').disabled = false; board(); done(4);
    }
  }
  setTimeout(step, 10);
});
function best() { return ST.board.length ? ST.board.reduce((p, q) => q.test > p.test ? q : p) : null; }
function chosen() { return ST.pick && ST.nets[ST.pick] ? ST.nets[ST.pick] : best(); }
function board() {
  const b = best(); $('count').textContent = ST.board.length ? `· ${ST.board.length} run${ST.board.length > 1 ? 's' : ''}` : '';
  $('rows').innerHTML = ST.board.map(r => { const tags = []; if (r === b) tags.push('<span class="badge">★ best test</span>'); if (r.run === ST.pick) tags.push('<span class="badge amber">your pick</span>'); if (r.train - r.test > 0.10) tags.push('<span class="badge red">memorising</span>'); else if (r.train < 0.5) tags.push('<span class="badge grey">too simple</span>');
    return `<tr class="run${r === b ? ' best' : ''}${r.run === ST.pick ? ' pick' : ''}" data-run="${r.run}"><td>${r.run}</td><td>${r.layers}</td><td>${r.neurons}</td><td>${r.epochs}</td><td>${r.lr}</td><td>${r.batch}</td><td>${r.weights}</td><td style="color:${COL.blue};font-weight:700">${C.fmt(r.train, 3)}</td><td style="color:${COL.amber};font-weight:700">${C.fmt(r.test, 3)}</td><td>${tags.join('')}</td></tr>`; }).join('');
  $('rows').querySelectorAll('tr').forEach(tr => { tr.style.cursor = 'pointer'; tr.addEventListener('click', () => { ST.pick = +tr.dataset.run; board(); $('to5').disabled = false; }); });
  const badges = []; if (ST.board.some(r => r.train - r.test > 0.10)) badges.push('<span class="chip green">challenge 1 done: you made it memorise</span>');
  if (b && ST.board.some(r => r !== b && r.weights < b.weights && r.test >= b.test - 0.02)) badges.push('<span class="chip green">challenge 2 done: a smaller network keeps the best score</span>');
  $('badges').innerHTML = badges.join(''); if (ST.board.length && !ST.pick) $('to5').disabled = true;
}
$('to5').addEventListener('click', () => { unlock(5); show(5); });

// ---------- 5 · three candidates
$('cmpBtn').addEventListener('click', () => {
  const S = ST.S; if (!S || !ST.line) return; const pick = chosen(); if (!pick) return; const law = ST.law = C.fitLaw(ST.meta, S); const cmp = C.compare(ST.meta, S, ST.line, pick, law); const b = best();
  if (b !== pick) cmp.verdict += ` You picked run ${pick.run} (test R² ${C.fmt(pick.test, 3)}); the board's best test score was run ${b.run} (${C.fmt(b.test, 3)}).`;
  ST.cmp = cmp; const [xt, yt] = ax(); const lo = Math.min(...S.ytr, ...S.yte), hi = Math.max(...S.ytr, ...S.yte), pad = 0.25 * (hi - lo);
  $('card5').hidden = false;
  draw('p5', [dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'sealed test rows', true)].concat(cmp.rows.map(r => curve(S.grid, r.f(S.grid).map(v => isFinite(v) ? Math.max(lo - pad, Math.min(hi + pad, v)) : null), `${r.name.split(' (')[0]}: test R² ${C.fmt(r.test, 3)}`, r.color))), layout('three candidates, judged on the sealed rows', xt, yt, { yaxis: { range: [lo - pad, hi + pad], title: { text: yt }, gridcolor: COL.rule } }));
  $('cmpTable').innerHTML = '<thead><tr><th>model</th><th>numbers it needs</th><th>training R²</th><th>test R²</th></tr></thead><tbody>' + cmp.rows.map(r => `<tr><td>${r.name}</td><td>${r.params}</td><td>${C.fmt(r.train, 3)}</td><td style="font-weight:700">${C.fmt(r.test, 3)}</td></tr>`).join('') + '</tbody>';
  $('verdict').textContent = cmp.verdict; done(5); unlock(6);
});
$('to6').addEventListener('click', () => { unlock(6); show(6); });
$('members').addEventListener('input', save);

// ---------- 6 · the report (built in report.js, shared with the Node test)
$('reportBtn').addEventListener('click', async () => {
  const S = ST.S, m = ST.meta, g = ST.g; if (!S || !ST.line || !ST.cmp) { $('n6').textContent = 'Finish steps 2 to 5 first.'; return; }
  $('reportBtn').disabled = true; $('n6').textContent = 'drawing the figures…'; const [xt, yt] = ax(); const pick = chosen(), b = best(); const today = new Date().toISOString().slice(0, 10); const members = $('members').value.trim();
  const lo = Math.min(...S.ytr, ...S.yte), hi = Math.max(...S.ytr, ...S.yte), pad = 0.25 * (hi - lo); const clip = v => v.map(u => isFinite(u) ? Math.max(lo - pad, Math.min(hi + pad, u)) : null);
  const keptX = [], keptY = [], keptR = []; ST.keep.forEach((k, i) => { if (k) { keptX.push(ST.x[i]); keptY.push(ST.y[i]); keptR.push(i + 1); } });
  const F = {};
  F.data = await figure([dots(keptX, keptY, 'the rows you kept', false, keptR)], layout(`group ${g}: ${m.name}, after your cleaning`, xt, yt, { showlegend: false }), 1100, 600);
  F.split = await figure([dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'sealed test rows', true)], layout('every fourth kept row is sealed', xt, yt), 1100, 600);
  F.line = await figure([dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'sealed test rows', true), curve(S.grid, ST.line.f(S.grid), 'the line', COL.ink)], layout(`the line:  training R² ${C.fmt(ST.line.train, 3)},  test R² ${C.fmt(ST.line.test, 3)}`, xt, yt), 1100, 600);
  F.net = await figure([dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'sealed test rows', true), curve(S.grid, pick.yg, `run ${pick.run}: ${pick.layers} × ${pick.neurons}, ${pick.epochs} epochs`, COL.green)], layout(`your pick:  training R² ${C.fmt(pick.train, 3)},  test R² ${C.fmt(pick.test, 3)}`, xt, yt), 1100, 600);
  F.compare = await figure([dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'sealed test rows', true)].concat(ST.cmp.rows.map(r => curve(S.grid, clip(r.f(S.grid)), `${r.name.split(' (')[0]}: test R² ${C.fmt(r.test, 3)}`, r.color))), layout('three candidates, judged on the sealed rows', xt, yt), 1100, 640);
  if (ST.effect && ST.effect.removed.length) { const e = cleaningEffect(); F.effect = await figure([dots(e.xtrAll, e.ytrAll, 'training rows, removed rows put back', false), dots(S.xte, S.yte, 'sealed test rows', true), curve(S.grid, e.withR.f(S.grid), `with the removed rows put back: test R² ${C.fmt(e.res.with.test, 3)}`, COL.red, 'dash'), curve(S.grid, e.without.f(S.grid), `with our cleaning: test R² ${C.fmt(e.res.without.test, 3)}`, COL.ink)], layout('what our cleaning did to the line', xt, yt), 1100, 600); }
  if (ST.std) { const r = C.stdEffect(S); F.std = await figure([dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'sealed test rows', true), curve(S.grid, clip(r.raw.f(S.grid)), `raw numbers: test R² ${C.fmt(Math.max(r.raw.test, -9), 2)}`, COL.red), curve(S.grid, clip(r.std.f(S.grid)), `standardised: test R² ${C.fmt(r.std.test, 2)}`, COL.green)], layout('the same network, plain gradient descent, 300 epochs', xt, yt), 1100, 600); }
  $('n6').textContent = 'writing the report and the slides…';
  const R = REPORT.build({ C, docx, PptxGenJS }, ST, F, pick, b, members, today);
  const blob = await docx.Packer.toBlob(R.doc); const pblob = await R.pptx.write({ outputType: 'blob' }); const jblob = new Blob([JSON.stringify(R.results, null, 1)], { type: 'application/json' });
  $('dl').innerHTML = ''; for (const [name, bl] of [[`Group ${g} report.docx`, blob], [`Group ${g} slides.pptx`, pblob], [`Group ${g} results.json`, jblob]]) { const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = name; a.textContent = '⬇ ' + name; $('dl').appendChild(a); }
  $('n6').textContent = 'Done. Download the three files. Open the report in Word and write the boxes under every step. Then upload the report and the slides to Blackboard.'; $('reportBtn').disabled = false; done(6);
});
