/* app.js — the page: six stations, Plotly pictures, the Word report and the slides. The arithmetic lives in core.js. */
'use strict';
const $ = id => document.getElementById(id), C = CORE;
const COL = { blue: '#2F6DB5', halo: '#9EC2EB', amber: '#D9781E', added: '#FAC785', green: '#2E7D5B', red: '#B5453F', purple: '#7B2FA0', ink: '#1A1A1A', grey: '#8A95A0', rule: '#DFE5EA' };
const ST = { g: null, meta: null, x: [], y: [], removed: {}, keep: [], S: null, attempts: [], line: null, board: [], nets: {}, pick: null, intuition: {}, effect: null, std: null, cmp: null, law: null, locked: false, times: {} };
function stamp(step) { ST.times[step] = new Date().toISOString(); save(); const t = $('timeline'); if (t) t.textContent = timelineText(); }
function clock(iso) { const d = new Date(iso); return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); }
const STEPS = [['chosen', 'group chosen'], ['cleaned', 'cleaning kept'], ['split', 'split and standardised'], ['line', 'linear regression fitted'], ['trained', 'first network trained'], ['picked', 'pick made'], ['compared', 'candidates compared'], ['report', 'report made']];
function timelineText() { return STEPS.filter(([k]) => ST.times[k]).map(([k, lab]) => `${lab}: ${clock(ST.times[k])}`).join(' · '); }
function membersList() { const rows = [...document.querySelectorAll('#memberRows tbody tr')]; return rows.map(r => ({ name: r.querySelector('[data-m=name]').value.trim(), id: r.querySelector('[data-m=id]').value.trim() })).filter(m => m.name || m.id); }
const NEUR = [1, 2, 4, 8, 16, 32, 64], EPO = [50, 100, 300, 1000, 3000, 10000], LRS = [0.001, 0.003, 0.01, 0.03, 0.1], BAT = [4, 8, 16, 32];

// ---------- pictures
const FONT = { family: '"Segoe UI", system-ui, Arial, sans-serif', size: 16, color: COL.ink };
function deepAxes(extra) {   // an axis override keeps the default zero line, grid and fonts; only what it names changes
  const base = { xaxis: { title: { font: { size: 16, color: COL.ink } }, tickfont: { color: COL.ink }, gridcolor: '#DCE6F3', zeroline: true, zerolinecolor: COL.ink, zerolinewidth: 2.5, linecolor: COL.ink, linewidth: 1.5 }, yaxis: { title: { font: { size: 16, color: COL.ink } }, tickfont: { color: COL.ink }, gridcolor: '#DCE6F3', zeroline: true, zerolinecolor: COL.ink, zerolinewidth: 2.5, linecolor: COL.ink, linewidth: 1.5 } };
  const out = Object.assign({}, extra); for (const ax of ['xaxis', 'yaxis']) if (extra[ax]) out[ax] = Object.assign({}, base[ax], extra[ax], { title: Object.assign({}, base[ax].title, extra[ax].title || {}) }); return out;
}
function layout(title, xt, yt, extra) {
  return Object.assign({ title: { text: title, font: { size: 19, color: COL.blue, family: FONT.family }, x: 0.02, xanchor: 'left' }, font: FONT, margin: { l: 70, r: 20, t: 52, b: 118 }, paper_bgcolor: '#fff', plot_bgcolor: '#fff',
    xaxis: { title: { text: xt, font: { size: 16, color: COL.ink } }, tickfont: { color: COL.ink }, gridcolor: '#DCE6F3', zeroline: true, zerolinecolor: COL.ink, zerolinewidth: 2.5, linecolor: COL.ink, linewidth: 1.5 },
    yaxis: { title: { text: yt, font: { size: 16, color: COL.ink } }, tickfont: { color: COL.ink }, gridcolor: '#DCE6F3', zeroline: true, zerolinecolor: COL.ink, zerolinewidth: 2.5, linecolor: COL.ink, linewidth: 1.5 },
    legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.3, yanchor: 'top', font: { size: 14, color: COL.ink } }, hovermode: 'closest', showlegend: true }, deepAxes(extra || {}));
}
function dots(x, y, name, test, rows, size) { return { x, y, name, mode: 'markers', type: 'scatter', customdata: rows, hovertemplate: rows ? 'row %{customdata}<br>%{x}, %{y}<extra></extra>' : '%{x}, %{y}<extra></extra>', marker: { size: size || 12, color: test ? COL.added : COL.halo, line: { color: test ? COL.amber : COL.blue, width: 2 } } }; }
function curve(x, y, name, color, dash) { return { x, y, name, mode: 'lines', type: 'scatter', hoverinfo: 'skip', line: { color, width: 4, dash: dash || 'solid' } }; }
function sticks(xs, ys, f) { const x = [], y = []; for (let i = 0; i < xs.length; i++) { x.push(xs[i], xs[i], null); y.push(ys[i], f([xs[i]])[0], null); } return { x, y, name: 'the error', mode: 'lines', type: 'scatter', hoverinfo: 'skip', line: { color: COL.red, width: 2.5 } }; }
function draw(id, traces, lay) { return Plotly.react($(id), traces, lay, { displayModeBar: false, responsive: true }); }
const ax = () => [`${ST.meta.x} (${ST.meta.xu})`, `${ST.meta.y} (${ST.meta.yu})`];
async function figure(traces, lay, w, h) {   // a PNG of a picture, for the report: drawn off screen at a fixed size
  const d = document.createElement('div'); d.style.cssText = `position:fixed;left:-20000px;top:0;width:${w}px;height:${h}px`; document.body.appendChild(d);
  const big = JSON.parse(JSON.stringify(lay));   // print size: every font and mark bigger than on screen, so the figure reads on paper
  big.font = Object.assign({}, big.font, { size: 22 }); big.title = Object.assign({}, big.title, { font: Object.assign({}, (big.title || {}).font, { size: 30 }), yref: 'container', y: 0.985, yanchor: 'top' });
  for (const ax of ['xaxis', 'yaxis']) { if (!big[ax]) continue; if (big[ax].title) big[ax].title.font = Object.assign({}, big[ax].title.font, { size: 26 }); big[ax].tickfont = Object.assign({}, big[ax].tickfont, { size: 22 }); }
  // the legend sits above the plot, under the title, so it can never touch the axis title; the top margin is sized from the entries
  const named = traces.filter(t => t.name && t.showlegend !== false); const est = named.reduce((s, t) => s + t.name.length * 13 + 70, 0); const rows = big.showlegend === false || !named.length ? 0 : Math.max(1, Math.ceil(est / (w - 170)));
  big.legend = Object.assign({}, big.legend, { font: Object.assign({}, (big.legend || {}).font, { size: 22 }), orientation: 'h', x: 0, xanchor: 'left', y: 1, yanchor: 'bottom' }); big.margin = { l: 120, r: 30, t: 62 + rows * 38, b: 100 }; (big.annotations || []).forEach(a => { a.font = Object.assign({}, a.font, { size: 22 }); a.ay = (a.ay || 0) * 1.5; });
  const T = traces.map(t => { const c = Object.assign({}, t); if (c.marker) c.marker = Object.assign({}, c.marker, { size: (c.marker.size || 12) * 1.5, line: c.marker.line ? Object.assign({}, c.marker.line, { width: (c.marker.line.width || 1) * 1.5 }) : undefined }); if (c.line) c.line = Object.assign({}, c.line, { width: (c.line.width || 2) * 1.5 }); if (c.textfont) c.textfont = Object.assign({}, c.textfont, { size: (c.textfont.size || 12) * 1.7 }); return c; });
  await Plotly.newPlot(d, T, Object.assign(big, { width: w, height: h }), { staticPlot: true }); const url = await Plotly.toImage(d, { format: 'png', width: w, height: h, scale: 2 }); Plotly.purge(d); d.remove(); return url;
}

// ---------- stations
const nav = [...document.querySelectorAll('nav button')];
function show(k) { document.querySelectorAll('.station').forEach(s => s.classList.toggle('on', s.id === 'st' + k)); nav.forEach(b => b.classList.toggle('on', +b.dataset.st === k)); coach(k); window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => window.dispatchEvent(new Event('resize')), 50); }
function flash(el) { if (!el) return; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
const GUIDE = {
  1: () => { const pl = C.planted(ST.meta); const imp = pl.filter(p => p.kind !== 'outlier'), out = pl.find(p => p.kind === 'outlier'); return {
    title: 'The kettle: thirty-one readings, three of them wrong on purpose',
    body: `<p>Water heating in a kettle, a reading every two seconds. Look at the picture before you touch anything: most points climb in a straight line, and three do not belong.</p>
<ul><li><span class="do">Do</span> click a point that cannot be real and remove it with a reason. Row ${imp[0].row}: ${imp[0].note}. Row ${imp[1].row}: ${imp[1].note}.</li>
<li><span class="do">Do</span> look at row ${out.row} before deciding: ${out.note}. It is possible, but it sits far from every neighbour. Remove it and say why, or keep it and watch what it does in step 1b. Both are fine when the reason is sound.</li>
<li><span class="dont">Don't</span> remove a row just because it is a little high or a little low. Measurements have noise. Three in thirty-one is plenty.</li></ul>
<div class="model"><b>A good answer to question 1 (in step 1b):</b> "The kelvin row sits 270 degrees above the others and the negative row far below. Kept in, they drag the line towards them and the test score collapses. With them out, the line follows the real readings." Other answers can be right too; what counts is the reason.</div>`,
    act: ['Show me the first wrong row', () => { inspect(imp[0].row); flash($('inspect')); flash($('removeBtn')); }] }; },
  2: () => ({ title: 'Split first, then standardise', body: `<p>Press <b>Split and standardise</b>. Every fourth kept row turns orange: test data. No model sees those rows until testing.</p><p>Then press <b>Train twice</b>. The same neural network scores about zero on the raw numbers and near one on the standardised ones. That is why standardising is a must.</p><div class="model"><b>A good answer to question 2:</b> "On the raw numbers the network scored about zero; standardised, it scored near one. Time runs to 60 and temperature to 95, so without standardising the training steps were the wrong size and the network learned nothing."</div>`, act: ['Show me the split button', () => flash($('splitBtn'))] }),
  3: () => ({ title: 'One slope, chosen by hand', body: `<p>Move the slider and watch the loss. Agree on the slope with the smallest loss you can find, then press <b>This is our slope</b>. That is your line from here on.</p><ul><li><span class="do">Do</span> read the equation in plant units: for the kettle it should say roughly 22 + 1.2 · time.</li><li><span class="dont">Don't</span> stop at a good-looking picture. Compare the losses; the smaller one wins.</li></ul>`, act: ['Show me the slider', () => flash($('m'))] }),
  4: () => ({ title: 'Experiment, then pick by the test score', body: `<p>Train at least three times. Try 1 layer × 4 neurons × 300 epochs, then 2 × 8 × 1000, then 3 × 64 × 3000 with learning rate 0.03. Watch the two scores.</p><ul><li><span class="do">Do</span> pick by the <b>test</b> score. If two runs score the same, the one with fewer parameters is the better pick.</li><li><span class="dont">Don't</span> pick the highest <b>training</b> score. A network that memorises looks perfect there and fails on the test data.</li></ul><div class="model"><b>A good pick:</b> run 1 if it has the highest test score, or the smallest run that matches it. The test score decides, never the training score.</div>`, act: ['Show me the train button', () => flash($('trainBtn'))] }),
  5: () => ({ title: 'Guess first, then let the test data decide', body: `<p>Press the button. A kettle heats in a straight line, so linear regression should match the neural network with only two parameters.</p><div class="model"><b>What to expect:</b> the same test score on both sides, so linear regression wins with two parameters against many.</div>`, act: ['Show me the compare button', () => flash($('cmpBtn'))] }),
  6: () => ({ title: 'The last question, then your report', body: `<p>Answer question 3, type the names and student IDs, press <b>Make my report</b>, download the three files. The Word report is complete: upload it to Blackboard.</p><div class="model"><b>A good answer to question 3:</b> "Linear regression: it scores the same as the network with two parameters, and the engineer can check it by hand. It cannot be trusted above 95 °C, because the water boils and the line keeps climbing." Other answers can be right too.</div>`, act: ['Show me the report button', () => flash($('reportBtn'))] }),
};
function coach(k) {
  const box = $('guide'); if (ST.g !== '0' || !GUIDE[k]) { box.hidden = true; return; }
  const gd = GUIDE[k](); box.hidden = false; box.innerHTML = `<div class="who">The practice run · your coach</div><h3>${gd.title}</h3>${gd.body}<div class="actions"><button class="btn sm" id="guideAct">${gd.act[0]}</button></div>`;
  $('guideAct').addEventListener('click', gd.act[1]);
}
function unlock(k) { nav[k].disabled = false; } function done(k) { nav[k].classList.add('done'); }
nav.forEach(b => b.addEventListener('click', () => show(+b.dataset.st)));
document.querySelectorAll('textarea[data-q]').forEach(t => t.addEventListener('input', () => { ST.intuition[t.dataset.q] = t.value; save(); }));
function save() { if (!ST.g) return; try { localStorage.setItem('project-g' + ST.g, JSON.stringify({ removed: ST.removed, intuition: ST.intuition, members: membersList(), times: ST.times })); $('saved').textContent = 'saved in this browser'; } catch (e) { } }
function load() { try { const d = JSON.parse(localStorage.getItem('project-g' + ST.g) || 'null'); if (!d) return; ST.removed = d.removed || {}; ST.intuition = d.intuition || {}; ST.times = d.times || {}; const rows = [...document.querySelectorAll('#memberRows tbody tr')]; (d.members || []).forEach((m, i) => { if (rows[i]) { rows[i].querySelector('[data-m=name]').value = m.name || ''; rows[i].querySelector('[data-m=id]').value = m.id || ''; } }); document.querySelectorAll('textarea[data-q]').forEach(t => t.value = ST.intuition[t.dataset.q] || ''); } catch (e) { } }
document.querySelectorAll('#memberRows input').forEach(i => i.addEventListener('input', save));

// ---------- 0 · the group
for (const g of Object.keys(DATA).sort((a, b) => +a - +b)) { const m = DATA[g]; const b = document.createElement('button'); b.className = 'rig' + (g === '0' ? ' practice' : ''); b.innerHTML = `<div class="g">${g === '0' ? 'start here · practice run' : 'group ' + g}</div><b>${m.name}</b><span>${m.story}</span>`; b.addEventListener('click', () => choose(g)); $('rigs').appendChild(b); }
function choose(g) {
  const m = DATA[g], { x, y } = C.parse(m.csv); Object.assign(ST, { g, meta: m, x, y, removed: {}, keep: [], S: null, attempts: [], line: null, board: [], nets: {}, pick: null, intuition: {}, effect: null, std: null, cmp: null, law: null, locked: false, times: {} });
  load(); if (!ST.times.chosen) stamp('chosen'); $('story').textContent = `Group ${g} · ${m.name}. ${m.story} ${x.length} rows of ${m.x} (${m.xu}) against ${m.y} (${m.yu}).`;
  unlock(1); done(0); show(1); drawData(); listRemoved(); $('card1b').hidden = true; $('hint').hidden = true; coach(1);
}

// ---------- 1 · look and clean
let inspected = null;
function keptRows() { return ST.x.map((_, i) => !ST.removed[i + 1]); }
function drawData() {
  const keep = keptRows(), rows = [], xs = [], ys = []; for (let i = 0; i < ST.x.length; i++) if (keep[i]) { rows.push(i + 1); xs.push(ST.x[i]); ys.push(ST.y[i]); }
  const [xt, yt] = ax(); const extra = { showlegend: false, shapes: [], annotations: [] };
  const ymin = Math.min(...ys), xmin = Math.min(...xs);   // anything below zero gets a red tint and a word, so nobody can miss it
  if (ymin < 0) { extra.shapes.push({ type: 'rect', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: ymin * 1.15, y1: 0, fillcolor: 'rgba(181,69,63,0.10)', line: { width: 0 }, layer: 'below' }); extra.annotations.push({ xref: 'paper', x: 0.01, y: ymin * 0.6, text: 'below zero', showarrow: false, font: { color: COL.red, size: 15, family: FONT.family }, xanchor: 'left' }); }
  if (xmin < 0) { extra.shapes.push({ type: 'rect', yref: 'paper', y0: 0, y1: 1, xref: 'x', x0: xmin * 1.15, x1: 0, fillcolor: 'rgba(181,69,63,0.10)', line: { width: 0 }, layer: 'below' }); extra.annotations.push({ yref: 'paper', y: 0.97, x: xmin * 0.5, text: 'below zero', showarrow: false, font: { color: COL.red, size: 15, family: FONT.family }, textangle: -90 }); }
  draw('p1', [dots(xs, ys, 'a measurement', false, rows, 13)], layout(`group ${ST.g}: ${ST.meta.name}`, xt, yt, extra));
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
$('keepBtn').addEventListener('click', () => { ST.locked = true; ST.keep = keptRows(); stamp('cleaned'); $('removeBtn').disabled = true; listRemoved(); $('card1b').hidden = false; $('card1b').scrollIntoView({ behavior: 'smooth' }); done(1); });
$('back1').addEventListener('click', () => { ST.locked = false; listRemoved(); $('card1b').hidden = true; $('p1b').hidden = true; $('t1b').innerHTML = ''; $('ask1b').hidden = true; $('to2').disabled = true; });
function effectView(e, S, yt, xt) {   // y axis from the kept rows; a put-back row that flies off the chart is pinned at the edge and named
  const lo = Math.min(...S.ytr, ...S.yte), hi = Math.max(...S.ytr, ...S.yte), pad = 0.6 * (hi - lo); const r = [lo - pad, hi + pad]; const ann = [];
  const xs = S.xtr.concat(S.xte), xlo = Math.min(...xs), xhi = Math.max(...xs), xpad = 0.08 * (xhi - xlo), xr = [xlo - xpad, xhi + xpad];   // the x axis too: a negative temperature must not squash the picture
  e.xtrAll.forEach((x, i) => { const y = e.ytrAll[i]; const offY = y > r[1] || y < r[0], offX = x > xr[1] || x < xr[0]; if (offY || offX) { const up = y > r[1], row = e.back && i >= S.xtr.length ? e.back[i - S.xtr.length] : null, k = ann.length;
    const px = Math.max(xr[0], Math.min(xr[1], x)), py = offY ? (up ? r[1] : r[0]) : y; const pos = (px - xlo) / Math.max(xhi - xlo, 1e-9), xanchor = pos > 0.6 ? 'right' : pos < 0.4 ? 'left' : 'center';
    const what = offX ? `${ST.meta.x} ${C.g3(x)}` : C.g3(y);
    ann.push({ x: px, y: py, text: `${row ? 'row ' + row + ': ' : ''}${what}, off the chart`, showarrow: true, arrowhead: 2, arrowcolor: COL.red, ax: xanchor === 'right' ? 12 : xanchor === 'left' ? -12 : 0, ay: (offY ? (up ? 1 : -1) : -1) * (42 + 34 * (k % 2)), xanchor, font: { size: 15, color: COL.red } }); } });   // labels alternate height and lean away from the edges, so none overlaps or runs off the plot
  return { xaxis: { range: xr, title: { text: xt } }, yaxis: { range: r, title: { text: yt } }, annotations: ann };
}
function cleaningEffect() {   // the line twice on the same test rows: with the removed rows put back into training, and with the cleaning
  const removed = Object.keys(ST.removed).map(Number); const S = C.split(ST.x, ST.y, ST.keep);
  const back = removed.filter(r => !S.rte.includes(r)); const xtrAll = S.xtr.concat(back.map(r => ST.x[r - 1])), ytrAll = S.ytr.concat(back.map(r => ST.y[r - 1]));
  const withR = C.lineOn(xtrAll, ytrAll), without = C.lineOn(S.xtr, S.ytr);
  const res = { with: { test: C.r2(S.yte, withR.f(S.xte)), eq: C.eqText(ST.meta, withR.a, withR.b), b: withR.b }, without: { test: C.r2(S.yte, without.f(S.xte)), eq: C.eqText(ST.meta, without.a, without.b), b: without.b }, removed };
  return { S, xtrAll, ytrAll, withR, without, res, back };
}
$('effectBtn').addEventListener('click', () => {
  const removed = Object.keys(ST.removed).map(Number); if (!removed.length) { $('t1b').innerHTML = '<div class="tile ink"><div class="k">nothing removed yet</div><div class="v small">put a row back? no: remove something first, or go on</div></div>'; $('to2').disabled = false; $('ask1b').hidden = false; return; }
  const { S, xtrAll, ytrAll, withR, without, res, back } = cleaningEffect(); const [xt, yt] = ax();
  ST.effect = res; $('p1b').hidden = false;
  const grid = S.grid;
  draw('p1b_with', [dots(xtrAll, ytrAll, 'training rows', false), dots(S.xte, S.yte, 'test rows', true), curve(grid, withR.f(grid), 'linear regression', COL.ink)], layout(`removed rows put back:  test R² = ${C.score(res.with.test)}`, xt, yt, effectView({ xtrAll, ytrAll, back }, S, yt, xt)));
  draw('p1b_without', [dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'test rows', true), curve(grid, without.f(grid), 'linear regression', COL.ink)], layout(`your cleaning:  test R² = ${C.fmt(res.without.test, 3)}`, xt, yt));
  const tilt = Math.abs(withR.b - without.b) / Math.max(Math.abs(without.b), 1e-9) * 100;
  $('t1b').innerHTML = `<div class="tile red"><div class="k">test R², rows put back</div><div class="v">${C.score(res.with.test)}</div></div><div class="tile green"><div class="k">test R², your cleaning</div><div class="v">${C.fmt(res.without.test, 3)}</div></div><div class="tile ink"><div class="k">slope change</div><div class="v">${tilt.toFixed(0)} %</div></div><div class="tile ink"><div class="k">fitted line, your cleaning</div><div class="v small">${res.without.eq}</div></div>`;
  $('ask1b').hidden = false; $('to2').disabled = false; save();
});
$('to2').addEventListener('click', () => { unlock(2); show(2); });

// ---------- 2 · split and standardise
$('splitBtn').addEventListener('click', () => {
  ST.keep = keptRows(); const S = ST.S = C.split(ST.x, ST.y, ST.keep); ST.attempts = []; ST.line = null; ST.board = []; ST.nets = {}; ST.pick = null; ST.cmp = null; const [xt, yt] = ax(); const m = ST.meta;
  $('p2').hidden = false;
  draw('p2a', [dots(S.xtr, S.ytr, `${S.xtr.length} training rows`, false, S.rtr), dots(S.xte, S.yte, `${S.xte.length} test rows`, true, S.rte)], layout('every fourth kept row is test data', xt, yt));
  draw('p2b', [{ x: S.xtr.map(S.zx), y: S.xtr.map(() => 1), name: m.x + '′', mode: 'markers', type: 'scatter', marker: { size: 12, color: COL.halo, line: { color: COL.blue, width: 2 } }, hovertemplate: '%{x:.2f}<extra></extra>' }, { x: S.ytr.map(S.zy), y: S.ytr.map(() => 0), name: m.y + '′', mode: 'markers', type: 'scatter', marker: { size: 12, color: COL.added, line: { color: COL.amber, width: 2 } }, hovertemplate: '%{x:.2f}<extra></extra>' }],
    layout('both live between about −2 and +2', 'standardised value: (value − mean) / std', '', { yaxis: { tickvals: [1, 0], ticktext: [m.x + '′', m.y + '′'], range: [-0.7, 1.7], gridcolor: COL.rule }, showlegend: false }));
  const x0 = S.xtr[0], y0 = S.ytr[0];
  $('t2').innerHTML = `<div class="tile ink"><div class="k">${m.x}: mean, std</div><div class="v small">${C.g3(S.mx)} ${m.xu}, ${C.g3(S.sx)} ${m.xu}</div></div><div class="tile ink"><div class="k">${m.y}: mean, std</div><div class="v small">${C.g3(S.my)} ${m.yu}, ${C.g3(S.sy)} ${m.yu}</div></div><div class="tile blue"><div class="k">first training row, by substitution</div><div class="v small">x′ = (${C.g3(x0)} − ${C.g3(S.mx)}) / ${C.g3(S.sx)} = ${C.fmt(S.zx(x0), 2)}</div></div><div class="tile amber"><div class="k">and its output</div><div class="v small">y′ = (${C.g3(y0)} − ${C.g3(S.my)}) / ${C.g3(S.sy)} = ${C.fmt(S.zy(y0), 2)}</div></div>`;
  $('card2b').hidden = false; done(2); stamp('split');
});
$('stdBtn').addEventListener('click', () => {
  if (!ST.S) return; $('stdBtn').disabled = true; $('n2b').textContent = 'training…';
  setTimeout(() => {
    const S = ST.S, r = C.stdEffect(S); ST.std = { raw: r.raw.test, std: r.std.test, rawTrain: r.raw.train, stdTrain: r.std.train }; const [xt, yt] = ax(); const lo = Math.min(...S.ytr, ...S.yte), hi = Math.max(...S.ytr, ...S.yte), pad = 0.25 * (hi - lo);
    $('p2c').hidden = false;
    for (const [id, key, title] of [['p2c_raw', 'raw', 'raw numbers'], ['p2c_std', 'std', 'standardised']]) {
      const yy = r[key].f(S.grid).map(v => isFinite(v) ? Math.max(lo - pad, Math.min(hi + pad, v)) : null);
      draw(id, [dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'test rows', true), curve(S.grid, yy, 'neural network', COL.green)], layout(`${title}:  test R² = ${C.fmt(Math.max(r[key].test, -9), 2)}`, xt, yt, { yaxis: { range: [lo - pad, hi + pad], title: { text: yt }, gridcolor: COL.rule } }));
    }
    $('t2b').innerHTML = `<div class="tile red"><div class="k">raw numbers, test R²</div><div class="v">${C.fmt(Math.max(r.raw.test, -9), 2)}</div></div><div class="tile green"><div class="k">standardised, test R²</div><div class="v">${C.fmt(r.std.test, 2)}</div></div>`;
    $('n2b').textContent = 'Same neural network, same settings. On raw numbers the training steps are the wrong size for every parameter, and the network learns nothing. Standardise first.';
    $('ask2b').hidden = false; $('to3').disabled = false; $('stdBtn').disabled = false;
  }, 30);
});
$('to3').addEventListener('click', () => { unlock(3); show(3); setTimeout(() => showLine(+$('m').value), 100); });

// ---------- 3 · the line
function showLine(mstd) {
  const S = ST.S; if (!S) return; const [xt, yt] = ax(); const L = C.lossAt(S, mstd); ST.attempts.push({ m: mstd, L });
  const f = v => v.map(u => S.unzy(mstd * S.zx(u)));
  draw('p3a', [dots(S.xtr, S.ytr, 'training rows', false), curve(S.grid, f(S.grid), 'linear regression', COL.ink), sticks(S.xtr, S.ytr, f)], layout(`attempt ${ST.attempts.length}:  m = ${C.fmt(mstd, 2)},  loss L = ${C.fmt(L, 2)}`, xt, yt));
  const mm = Array.from({ length: 161 }, (_, i) => -2 + i / 40); const bowl = mm.map(v => C.lossAt(S, v));
  draw('p3b', [curve(mm, bowl, 'the whole bowl', COL.halo), { x: ST.attempts.map(a => a.m), y: ST.attempts.map(a => a.L), name: 'your attempts', mode: 'markers', type: 'scatter', marker: { size: 12, color: COL.added, line: { color: COL.red, width: 2 } }, hovertemplate: 'm = %{x:.2f}, L = %{y:.2f}<extra></extra>' }, { x: [mstd], y: [L], name: 'this attempt', mode: 'markers', type: 'scatter', marker: { size: 18, color: COL.red }, hoverinfo: 'skip' }], layout('loss against the slope', 'slope m (standardised)', 'loss L'));
  $('t3').innerHTML = `<div class="tile ink"><div class="k">loss L</div><div class="v">${C.fmt(L, 2)}</div></div><div class="tile blue"><div class="k">training R²</div><div class="v">${C.fmt(C.r2(S.ytr, f(S.xtr)), 3)}</div></div><div class="tile amber"><div class="k">test R²</div><div class="v">${C.fmt(C.r2(S.yte, f(S.xte)), 3)}</div></div>`;
}
$('m').addEventListener('input', () => $('mv').textContent = C.fmt(+$('m').value, 2)); $('m').addEventListener('change', () => showLine(+$('m').value));
$('fitBtn').addEventListener('click', () => {   // the group's own slope, from the slider: nothing is computed for them
  const S = ST.S; if (!S) return; const mstd = +$('m').value; const ref = C.lineOn(S.xtr, S.ytr);
  const b = mstd * S.sy / S.sx, a = S.my - b * S.mx; const f1 = v => S.unzy(mstd * S.zx(v)), f = v => Array.isArray(v) ? v.map(f1) : f1(v);
  const ln = { mstd, a, b, f, loss: C.lossAt(S, mstd), byHand: true, bestLoss: ref.loss, bestM: ref.mstd }; ln.train = C.r2(S.ytr, f(S.xtr)); ln.test = C.r2(S.yte, f(S.xte)); ln.eq = C.eqText(ST.meta, a, b); ST.line = ln; const [xt, yt] = ax();
  draw('p3a', [dots(S.xtr, S.ytr, 'training rows', false), curve(S.grid, ln.f(S.grid), 'linear regression', COL.ink), sticks(S.xtr, S.ytr, ln.f)], layout(`your slope:  m = ${C.fmt(ln.mstd, 2)},  training R² = ${C.fmt(ln.train, 3)}`, xt, yt));
  draw('p3b', [dots(S.xte, S.yte, 'test rows', true), curve(S.grid, ln.f(S.grid), 'linear regression', COL.ink), sticks(S.xte, S.yte, ln.f)], layout(`the test data:  R² = ${C.fmt(ln.test, 3)}`, xt, yt));
  $('eq3').hidden = false; $('eq3').innerHTML = `your slope m = <b>${C.fmt(ln.mstd, 2)}</b> &nbsp;·&nbsp; loss ${C.fmt(ln.loss, 2)} &nbsp;·&nbsp; in plant units: <b>${ln.eq}</b>`;
  $('t3').innerHTML = `<div class="tile ink"><div class="k">your loss</div><div class="v">${C.fmt(ln.loss, 2)}</div></div><div class="tile blue"><div class="k">training R²</div><div class="v">${C.fmt(ln.train, 3)}</div></div><div class="tile amber"><div class="k">test R²</div><div class="v">${C.fmt(ln.test, 3)}</div></div>`;
  $('to4').disabled = false; done(3); stamp('line');
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
    draw('p4', [dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'test rows', true), curve(S.grid, yy, 'neural network', COL.green)], layout(`${L} layer${L > 1 ? 's' : ''} × ${n} neurons · learning rate ${lr} · batch ${b} · epoch ${e} of ${E}`, xt, yt, { yaxis: { range: [lo - pad, hi + pad], title: { text: yt }, gridcolor: COL.rule } }));
    $('prog').style.width = (100 * e / E) + '%';
    if (e < E) setTimeout(step, 0);
    else {
      const tr = C.r2(S.ytr, f(S.xtr)), te = C.r2(S.yte, f(S.xte)); const row = { run, layers: L, neurons: n, epochs: E, lr, batch: b, weights: net.nParams, train: isFinite(tr) ? tr : -9, test: isFinite(te) ? te : -9, f, yg: yy };
      ST.board.push(row); ST.nets[run] = row; $('trv').textContent = C.fmt(row.train, 3); $('tev').textContent = C.fmt(row.test, 3); $('trv').classList.add('pulse'); $('tev').classList.add('pulse'); setTimeout(() => { $('trv').classList.remove('pulse'); $('tev').classList.remove('pulse'); }, 700);
      $('n4').textContent = `run ${run} is on the board. Training R² ${C.fmt(row.train, 3)}, test R² ${C.fmt(row.test, 3)}.`; training = false; $('trainBtn').disabled = false; board(); done(4); if (!ST.times.trained) stamp('trained');
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
  $('rows').querySelectorAll('tr').forEach(tr => { tr.style.cursor = 'pointer'; tr.addEventListener('click', () => { ST.pick = +tr.dataset.run; stamp('picked'); board(); $('to5').disabled = false; }); });
  const badges = []; if (ST.board.some(r => r.train - r.test > 0.10)) badges.push('<span class="chip green">challenge 1 done: you made it memorise</span>');
  if (b && ST.board.some(r => r !== b && r.weights < b.weights && r.test >= b.test - 0.02)) badges.push('<span class="chip green">challenge 2 done: a smaller network keeps the best score</span>');
  $('badges').innerHTML = badges.join(''); if (ST.board.length && !ST.pick) $('to5').disabled = true;
}
$('to5').addEventListener('click', () => { unlock(5); show(5); });

// ---------- 5 · the line against the network
$('cmpBtn').addEventListener('click', () => {
  const S = ST.S; if (!S || !ST.line) return; const pick = chosen(); if (!pick) return; const cmp = C.compare(ST.meta, S, ST.line, pick); const b = best();
  if (b !== pick) cmp.verdict += ` You picked run ${pick.run} (test R² ${C.fmt(pick.test, 3)}); the best test score on the board was run ${b.run} (${C.fmt(b.test, 3)}).`;
  ST.cmp = cmp; const [xt, yt] = ax(); const lo = Math.min(...S.ytr, ...S.yte), hi = Math.max(...S.ytr, ...S.yte), pad = 0.25 * (hi - lo);
  $('card5').hidden = false;
  const clip5 = v => v.map(u => isFinite(u) ? Math.max(lo - pad, Math.min(hi + pad, u)) : null), yax = { yaxis: { range: [lo - pad, hi + pad], title: { text: yt } } };   // the same y axis on both, so the two pictures compare
  draw('p5a', [dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'test rows', true), curve(S.grid, clip5(cmp.rows[0].f(S.grid)), 'linear regression', COL.ink)], layout(`linear regression:  test R² ${C.fmt(cmp.rows[0].test, 3)}`, xt, yt, yax));
  draw('p5b', [dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'test rows', true), curve(S.grid, clip5(cmp.rows[1].f(S.grid)), 'neural network', COL.green)], layout(`neural network, run ${pick.run}:  test R² ${C.fmt(cmp.rows[1].test, 3)}`, xt, yt, yax));
  $('cmpTable').innerHTML = '<thead><tr><th>model</th><th>parameters</th><th>training R²</th><th>test R²</th></tr></thead><tbody>' + cmp.rows.map(r => `<tr><td>${r.name}</td><td>${r.params}</td><td>${C.fmt(r.train, 3)}</td><td style="font-weight:700">${C.fmt(r.test, 3)}</td></tr>`).join('') + '</tbody>';
  $('verdict').textContent = cmp.verdict; $('qPlant').textContent = C.handQuestion(cmp); done(5); unlock(6); stamp('compared');
});
$('to6').addEventListener('click', () => { unlock(6); show(6); });

// ---------- 6 · the report (built in report.js, shared with the Node test)
$('reportBtn').addEventListener('click', async () => {
  const S = ST.S, m = ST.meta, g = ST.g; if (!S || !ST.line || !ST.cmp) { $('n6').textContent = 'Finish steps 2 to 5 first.'; return; }
  $('reportBtn').disabled = true; $('dl').innerHTML = ''; $('n6').textContent = 'drawing the figures…'; const g0 = ST.g, line0 = ST.line, cmp0 = ST.cmp;
  if (!line0 || !cmp0) { $('reportBtn').disabled = false; return; } const [xt, yt] = ax(); const pick = chosen(), b = best(); stamp('report'); const today = clock(ST.times.report); const members = membersList(); if (!members.length) { $('n6').textContent = 'Type at least one name and student ID first.'; $('reportBtn').disabled = false; return; }
  const lo = Math.min(...S.ytr, ...S.yte), hi = Math.max(...S.ytr, ...S.yte), pad = 0.25 * (hi - lo); const clip = v => v.map(u => isFinite(u) ? Math.max(lo - pad, Math.min(hi + pad, u)) : null);
  const keptX = [], keptY = [], keptR = []; ST.keep.forEach((k, i) => { if (k) { keptX.push(ST.x[i]); keptY.push(ST.y[i]); keptR.push(i + 1); } });
  const F = {};
  F.data = await figure([dots(keptX, keptY, 'the rows you kept', false, keptR)], layout(`group ${g}: ${m.name}, after your cleaning`, xt, yt, { showlegend: false }), 1100, 600);
  F.split = await figure([dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'test rows', true)], layout('every fourth kept row is test data', xt, yt), 1100, 600);
  F.line = await figure([dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'test rows', true), curve(S.grid, line0.f(S.grid), 'linear regression', COL.ink)], layout(`linear regression:  training R² ${C.fmt(line0.train, 3)},  test R² ${C.fmt(line0.test, 3)}`, xt, yt), 1100, 600);
  F.net = await figure([dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'test rows', true), curve(S.grid, pick.yg, `run ${pick.run}: ${pick.layers} × ${pick.neurons}, ${pick.epochs} epochs`, COL.green)], layout(`your pick:  training R² ${C.fmt(pick.train, 3)},  test R² ${C.fmt(pick.test, 3)}`, xt, yt), 1100, 600);
  if (ST.g !== g0) return; const yax = { yaxis: { range: [lo - pad, hi + pad], title: { text: yt } } };
  F.cmpLine = await figure([dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'test rows', true), curve(S.grid, clip(cmp0.rows[0].f(S.grid)), 'linear regression', COL.ink)], layout(`linear regression:  test R² ${C.fmt(cmp0.rows[0].test, 3)}`, xt, yt, yax), 900, 640);
  F.cmpNet = await figure([dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'test rows', true), curve(S.grid, clip(cmp0.rows[1].f(S.grid)), 'neural network', COL.green)], layout(`neural network, run ${pick.run}:  test R² ${C.fmt(cmp0.rows[1].test, 3)}`, xt, yt, yax), 900, 640);
  if (ST.effect && ST.effect.removed.length) { const e = cleaningEffect(); F.effect = await figure([dots(e.xtrAll, e.ytrAll, 'training rows, removed rows put back', false), dots(S.xte, S.yte, 'test rows', true), curve(S.grid, e.withR.f(S.grid), `with the removed rows put back: test R² ${C.score(e.res.with.test)}`, COL.red, 'dash'), curve(S.grid, e.without.f(S.grid), `with our cleaning: test R² ${C.fmt(e.res.without.test, 3)}`, COL.ink)], layout('what our cleaning did to the fitted line', xt, yt, effectView(e, S, yt, xt)), 1100, 600); }
  if (ST.std) { const r = C.stdEffect(S); F.std = await figure([dots(S.xtr, S.ytr, 'training rows', false), dots(S.xte, S.yte, 'test rows', true), curve(S.grid, clip(r.raw.f(S.grid)), `raw numbers: test R² ${C.fmt(Math.max(r.raw.test, -9), 2)}`, COL.red), curve(S.grid, clip(r.std.f(S.grid)), `standardised: test R² ${C.fmt(r.std.test, 2)}`, COL.green)], layout('the same neural network, trained twice', xt, yt), 1100, 600); }
  if (ST.g !== g0) return;
  $('n6').textContent = 'writing the report and the slides…';
  const R = REPORT.build({ C, docx, PptxGenJS }, ST, F, pick, b, members, today, STEPS.filter(([k]) => ST.times[k]).map(([k, lab]) => [lab, clock(ST.times[k])]));
  const blob = await docx.Packer.toBlob(R.doc); const pblob = await R.pptx.write({ outputType: 'blob' }); const jblob = new Blob([JSON.stringify(R.results, null, 1)], { type: 'application/json' });
  $('dl').innerHTML = ''; for (const [name, bl] of [[`Group ${g} report.docx`, blob], [`Group ${g} slides.pptx`, pblob], [`Group ${g} results.json`, jblob]]) { const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = name; a.textContent = '⬇ ' + name; $('dl').appendChild(a); }
  $('n6').textContent = 'Done. Download the three files. Open the report in Word and write the boxes under every step. Then upload the report and the slides to Blackboard.'; $('timeline').textContent = timelineText(); $('reportBtn').disabled = false; done(6);
});
