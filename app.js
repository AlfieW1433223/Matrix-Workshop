import { generateExercise, exerciseLatex, validateRequest } from './engine.mjs';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let currentResult;

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2400);
}

function valueHtml(value) {
  if (value.d === 1n) return escapeHtml(String(value.n).replace('-', '−'));
  const negative = value.n < 0n;
  const numerator = negative ? -value.n : value.n;
  return `<span class="signed-fraction">${negative ? '<span class="fraction-sign">−</span>' : ''}<span class="fraction"><span>${numerator}</span><span>${value.d}</span></span></span>`;
}

function matrixHtml(matrix, augmentedAt = null, label = '') {
  const cells = (start, end) => matrix.flatMap(row => row.slice(start, end).map(value => `<span class="matrix-cell">${valueHtml(value)}</span>`)).join('');
  const grid = augmentedAt == null
    ? `<div class="matrix" style="--matrix-cols:${matrix[0].length}">${cells(0, matrix[0].length)}</div>`
    : `<div class="matrix augmented"><div class="matrix-block" style="--matrix-cols:${augmentedAt}">${cells(0, augmentedAt)}</div><span class="augment-divider" aria-hidden="true"></span><div class="matrix-block" style="--matrix-cols:${matrix[0].length - augmentedAt}">${cells(augmentedAt, matrix[0].length)}</div></div>`;
  return `<div class="matrix-wrap dynamic">${label ? `<span class="matrix-label">${label}</span>` : ''}${grid}</div>`;
}

function vectorHtml(vector) { return matrixHtml(vector.map(value => [value])); }

function mathHtml(latex) {
  let text = escapeHtml(latex);
  text = text.replace(/\\frac\{(-?\d+)\}\{(\d+)\}/g, (_, n, d) => `<span class="signed-fraction">${n.startsWith('-') ? '<span class="fraction-sign">−</span>' : ''}<span class="fraction"><span>${n.replace('-', '')}</span><span>${d}</span></span></span>`);
  text = text.replace(/R_\{(\d+)\}/g, 'R<sub>$1</sub>');
  text = text.replace(/x_\{(\d+)\}/g, 'x<sub>$1</sub>');
  text = text.replace(/\\lambda/g, 'λ').replace(/\\Sigma/g, 'Σ');
  text = text.replace(/\\leftarrow/g, '←').replace(/\\leftrightarrow/g, '↔').replace(/\\qquad/g, '&emsp;');
  text = text.replace(/\^\{(\d+)\}/g, '<sup>$1</sup>');
  return text;
}

function operationStepsHtml(section) {
  const initial = `<div class="calc-step initial-step"><div class="step-marker">Start</div><div>${matrixHtml(section.initial, section.augmentedAt)}</div></div>`;
  const steps = section.steps.map((step, index) => `
    <div class="calc-step">
      <div class="step-marker">${String(index + 1).padStart(2, '0')}</div>
      <div class="step-work">
        <div class="operation-line">${mathHtml(step.operation)}</div>
        ${matrixHtml(step.matrix, section.augmentedAt)}
      </div>
    </div>`).join('');
  return `<div class="calculation-trace">${initial}${steps}</div>`;
}

function solutionSectionHtml(section, index) {
  if (section.type === 'rref') return `
    <section class="solution-section">
      <div class="section-index">${String(index + 1).padStart(2, '0')}</div>
      <div class="section-body">
        <h4>${section.title}</h4>
        <p>Each elementary operation is followed by the entire new matrix.</p>
        ${operationStepsHtml(section)}
        <div class="conclusion"><b>Conclusion.</b> ${mathHtml(section.conclusion)}</div>
      </div>
    </section>`;

  if (section.type === 'inverse') return `
    <section class="solution-section">
      <div class="section-index">${String(index + 1).padStart(2, '0')}</div>
      <div class="section-body">
        <h4>${section.title}</h4>
        <p>Begin with <span class="math-name">[A | I]</span>. The right block becomes the inverse exactly when the left block becomes <span class="math-name">I</span>.</p>
        ${operationStepsHtml(section)}
        <div class="result-grid"><div><span class="mini-label">Inverse</span>${matrixHtml(section.inverse, null, 'A⁻¹ =')}</div><div><span class="mini-label">Exact check</span>${matrixHtml(section.verification, null, 'AA⁻¹ =')}</div></div>
      </div>
    </section>`;

  if (section.type === 'diagonalization') {
    const eigenpairs = section.vectors.map(({ value, vector, system, residual }) => `<div class="eigen-card"><span>λ = ${value}</span>${matrixHtml(system, null, `A − ${value}I =`)}<span class="mini-label">Solve (A − ${value}I)v = 0</span>${vectorHtml(vector)}<span class="mini-label residual-label">Exact check</span>${matrixHtml(residual.map(entry => [entry]), null, '(A − λI)v =')}</div>`).join('');
    return `
      <section class="solution-section">
        <div class="section-index">${String(index + 1).padStart(2, '0')}</div>
        <div class="section-body">
          <h4>${section.title}</h4>
          <p>Using the requested convention <span class="math-name">p(λ) = det(A − λI)</span>:</p>
          <div class="equation-line">p(λ) = ${mathHtml(section.characteristic)} = ${mathHtml(section.factors)}</div>
          <p>The roots and corresponding basis vectors are:</p>
          <div class="eigen-grid">${eigenpairs}</div>
          <p>Place those eigenvectors in the same order as their eigenvalues.</p>
          <div class="result-grid triple"><div><span class="mini-label">Eigenvector matrix</span>${matrixHtml(section.P, null, 'P =')}</div><div><span class="mini-label">Diagonal matrix</span>${matrixHtml(section.D, null, 'D =')}</div><div><span class="mini-label">Basis inverse</span>${matrixHtml(section.Pinv, null, 'P⁻¹ =')}</div></div>
          <div class="conclusion"><b>Verification.</b> Multiplying <span class="math-name">PDP⁻¹</span> gives ${matrixHtml(section.verification, null, 'A =')}</div>
        </div>
      </section>`;
  }

  if (section.type === 'jcf') return `
    <section class="solution-section">
      <div class="section-index">${String(index + 1).padStart(2, '0')}</div>
      <div class="section-body">
        <h4>${section.title}</h4>
        <p>Using <span class="math-name">p(λ) = det(A − λI)</span>:</p>
        <div class="equation-line">p(λ) = ${mathHtml(section.characteristic)} = ${mathHtml(section.factors)}</div>
        <p>For λ = ${section.lambda}, inspect the null spaces directly:</p>
        <div class="result-grid"><div><span class="mini-label">A − ${section.lambda}I</span>${matrixHtml(section.shifted)}</div><div><span class="mini-label">(A − ${section.lambda}I)²</span>${matrixHtml(section.shiftedSquared)}</div></div>
        <div class="equation-line">dim ker(A − ${section.lambda}I) = ${section.kernelDimension} &emsp; and &emsp; dim ker(A − ${section.lambda}I)² = ${section.squaredKernelDimension}</div>
        <p>The algebraic multiplicity is 2 but the first kernel has dimension ${section.kernelDimension}, so a size-2 Jordan block is required.</p>
        <div class="chain-grid"><div><span class="mini-label">Eigenvector v₁</span>${vectorHtml(section.chain[0])}</div><div><span class="mini-label">Generalized vector v₂</span>${vectorHtml(section.chain[1])}</div></div>
        <div class="equation-line">(A − ${section.lambda}I)v₁ = 0 &emsp; and &emsp; (A − ${section.lambda}I)v₂ = v₁</div>
        <div class="result-grid triple"><div><span class="mini-label">Chain basis</span>${matrixHtml(section.P, null, 'P =')}</div><div><span class="mini-label">Jordan form</span>${matrixHtml(section.J, null, 'J =')}</div><div><span class="mini-label">Basis inverse</span>${matrixHtml(section.Pinv, null, 'P⁻¹ =')}</div></div>
        <div class="verification-pair"><div><span class="mini-label">AP</span>${matrixHtml(section.verificationLeft)}</div><span class="equals">=</span><div><span class="mini-label">PJ</span>${matrixHtml(section.verificationRight)}</div></div>
      </div>
    </section>`;

  if (section.type === 'svd') return `
    <section class="solution-section">
      <div class="section-index">${String(index + 1).padStart(2, '0')}</div>
      <div class="section-body">
        <h4>${section.title}</h4>
        <p>Start with the symmetric matrix <span class="math-name">AᵀA</span>.</p>
        ${matrixHtml(section.AtA, null, 'AᵀA =')}
        <div class="equation-line">Eigenvalues of AᵀA: ${section.eigenvalues.join(', ')} &emsp;⇒&emsp; singular values: ${section.singularValues.join(', ')}</div>
        <p>The normalized eigenvectors form <span class="math-name">V</span>. Then each nonzero left singular vector is <span class="math-name">uᵢ = Avᵢ/σᵢ</span>; the remaining columns complete an orthonormal basis.</p>
        <div class="result-grid triple"><div><span class="mini-label">Left vectors</span>${matrixHtml(section.U, null, 'U =')}</div><div><span class="mini-label">Full rectangular diagonal</span>${matrixHtml(section.Sigma, null, 'Σ =')}</div><div><span class="mini-label">Right vectors</span>${matrixHtml(section.V, null, 'V =')}</div></div>
        <div class="orthogonal-checks"><span>UᵀU = I</span><span>VᵀV = I</span><span>A = UΣVᵀ</span></div>
        <div class="conclusion"><b>Exact reconstruction.</b>${matrixHtml(section.verification, null, 'UΣVᵀ =')}</div>
      </div>
    </section>`;
  return '';
}

function requestFromControls() {
  return {
    rows: Number($('#rows').value), cols: Number($('#cols').value),
    topics: $$('input[name="topic"]:checked').map(input => input.value),
    rrefMode: $('input[name="rrefMode"]:checked').value,
    difficulty: $('input[name="difficulty"]:checked').value,
    seed: $('#seed').value
  };
}

function updateUrl(request) {
  const params = new URLSearchParams({ r: request.rows, c: request.cols, t: request.topics.join(','), d: request.difficulty, mode: request.rrefMode, seed: request.seed });
  history.replaceState(null, '', `${location.pathname}?${params}`);
}

function render(result) {
  currentResult = result;
  const { request } = result;
  $('#exercise-title').textContent = `${request.rows} × ${request.cols} · ${request.topics.map(topic => ({ rref: 'row reduction', inverse: 'inverse', diagonalization: 'diagonalization', jcf: 'Jordan form', svd: 'full SVD' }[topic])).join(' + ')}`;
  $('.score-number').textContent = result.niceness.score;
  $('.niceness-score b').textContent = `${result.niceness.label} fit`;
  $('.niceness-score small').textContent = result.niceness.note;

  const matrixPrompt = request.rrefMode === 'system' && request.topics.includes('rref')
    ? `<div class="system-display">${matrixHtml(result.A, null, 'A =')} ${matrixHtml(result.b.map(value => [value]), null, 'b =')}</div>`
    : matrixHtml(result.A, null, 'A =');
  $('#exercise-document').innerHTML = `
    <div class="paper-meta"><span>LINEAR ALGEBRA</span><span id="paper-seed">SEED ${escapeHtml(request.seed.toUpperCase())}</span></div>
    <section class="problem-block">
      <p class="problem-number">01</p>
      <div>
        <h3>${request.rrefMode === 'system' && request.topics.includes('rref') ? 'Solve the system and analyze its matrix' : 'Work with the matrix'}</h3>
        ${matrixPrompt}
        <ol id="task-list">${result.tasks.map(task => `<li>${escapeHtml(task)}</li>`).join('')}</ol>
      </div>
    </section>
    <section class="solution-only solution-intro"><span class="eyebrow">Complete solution</span><h3>Every operation, every resulting matrix.</h3><p>The answer key uses exact fractions throughout—no decimal approximations.</p></section>
    <div id="solution-sections" class="solution-only">${result.solutionData.map(solutionSectionHtml).join('')}</div>`;
  updateUrl(request);
}

function generateAndRender(announce = true) {
  try {
    const result = generateExercise(requestFromControls());
    render(result);
    if (announce) toast(`Generated from seed ${result.request.seed}`);
    return result;
  } catch (error) {
    toast(error.message);
    throw error;
  }
}

function syncCompatibility(changedTopic = null) {
  const rows = Number($('#rows').value), cols = Number($('#cols').value);
  const square = rows === cols, tooLarge = rows > 4 || cols > 4;
  const topic = value => $(`input[name="topic"][value="${value}"]`);
  if (changedTopic === 'jcf' && topic('jcf').checked) { topic('diagonalization').checked = false; topic('svd').checked = false; }
  if (['diagonalization', 'svd'].includes(changedTopic) && topic(changedTopic).checked) topic('jcf').checked = false;
  ['inverse', 'diagonalization', 'jcf'].forEach(value => {
    topic(value).disabled = !square || (value === 'jcf' && tooLarge);
    if (topic(value).disabled) topic(value).checked = false;
  });
  topic('svd').disabled = tooLarge || topic('jcf').checked;
  if (topic('svd').disabled) topic('svd').checked = false;
  topic('diagonalization').disabled = !square || topic('jcf').checked;
  if (topic('diagonalization').disabled) topic('diagonalization').checked = false;
  $('#rref-options').hidden = !topic('rref').checked;
  const reasons = [];
  if (!square) reasons.push('square-only topics are unavailable');
  if (tooLarge) reasons.push('Jordan form and SVD stop at dimension 4');
  if (topic('jcf').checked) reasons.push('nontrivial Jordan form excludes diagonalization and SVD');
  $('#compatibility-note').textContent = reasons.length ? reasons.join(' · ') : 'This selection has a hand-friendly shared construction.';
}

function loadUrlState() {
  const params = new URLSearchParams(location.search);
  if (params.has('r')) $('#rows').value = params.get('r');
  if (params.has('c')) $('#cols').value = params.get('c');
  if (params.has('seed')) $('#seed').value = params.get('seed').slice(0, 32);
  if (params.has('d') && $(`input[name="difficulty"][value="${params.get('d')}"]`)) $(`input[name="difficulty"][value="${params.get('d')}"]`).checked = true;
  if (params.has('mode') && $(`input[name="rrefMode"][value="${params.get('mode')}"]`)) $(`input[name="rrefMode"][value="${params.get('mode')}"]`).checked = true;
  if (params.has('t')) {
    const topics = params.get('t').split(',');
    $$('input[name="topic"]').forEach(input => input.checked = topics.includes(input.value));
  }
}

$$('.view-tabs button').forEach(button => button.addEventListener('click', () => {
  $$('.view-tabs button').forEach(item => item.setAttribute('aria-selected', String(item === button)));
  $('#exercise-document').classList.toggle('student-view', button.dataset.view === 'student');
  $('#exercise-document').classList.toggle('answer-view', button.dataset.view === 'answer');
}));

$('#print-page').addEventListener('click', () => window.print());
$('#copy-latex').addEventListener('click', async () => {
  if (!currentResult) return;
  const latex = exerciseLatex(currentResult);
  try { await navigator.clipboard.writeText(latex); toast('Compile-ready .tex copied.'); }
  catch { const area = Object.assign(document.createElement('textarea'), { value: latex }); document.body.append(area); area.select(); document.execCommand('copy'); area.remove(); toast('Compile-ready .tex copied.'); }
});
$('#shuffle-seed').addEventListener('click', () => {
  $('#seed').value = `M-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  generateAndRender();
});
$('#generator-form').addEventListener('submit', event => { event.preventDefault(); generateAndRender(); });
['#rows', '#cols'].forEach(selector => $(selector).addEventListener('change', () => syncCompatibility()));
$$('input[name="topic"]').forEach(input => input.addEventListener('change', () => syncCompatibility(input.value)));

function applyWebRequest(input) {
  const valid = validateRequest(input);
  $('#rows').value = String(valid.rows); $('#cols').value = String(valid.cols); $('#seed').value = valid.seed;
  $$('input[name="topic"]').forEach(box => box.checked = valid.topics.includes(box.value));
  $(`input[name="difficulty"][value="${valid.difficulty}"]`).checked = true;
  $(`input[name="rrefMode"][value="${valid.rrefMode}"]`).checked = true;
  syncCompatibility();
  const result = generateAndRender(false);
  return { seed: result.request.seed, dimensions: `${result.request.rows}x${result.request.cols}`, topics: result.request.topics, nicenessScore: result.niceness.score, url: location.href };
}

function registerWebMcp() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  try {
    void Promise.resolve(context.registerTool({
      name: 'generate_matrix_exercise', title: 'Generate matrix exercise',
      description: 'Configure the visible Matrix Workshop and generate one exact, hand-friendly exercise with a worked answer key.',
      inputSchema: {
        type: 'object',
        properties: {
          rows: { type: 'integer', minimum: 2, maximum: 5 }, cols: { type: 'integer', minimum: 2, maximum: 5 },
          topics: { type: 'array', minItems: 1, uniqueItems: true, items: { enum: ['rref', 'inverse', 'diagonalization', 'jcf', 'svd'] } },
          difficulty: { enum: ['beginner', 'standard', 'challenge'] }, rrefMode: { enum: ['matrix', 'system'] }, seed: { type: 'string', minLength: 1, maxLength: 32 }
        }, required: ['rows', 'cols', 'topics', 'difficulty', 'rrefMode', 'seed'], additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: applyWebRequest
    }));
  } catch { /* The visual interface remains fully available. */ }
}

loadUrlState();
syncCompatibility();
generateAndRender(false);
registerWebMcp();
