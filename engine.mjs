// Exact, deterministic matrix generation. Displayed arithmetic never uses floats.
export class Rational {
  constructor(n = 0n, d = 1n) {
    n = BigInt(n); d = BigInt(d);
    if (d === 0n) throw new Error('Zero denominator');
    if (d < 0n) { n = -n; d = -d; }
    const g = gcd(n, d);
    this.n = n / g; this.d = d / g;
    Object.freeze(this);
  }
  add(other) { other = Q(other); return new Rational(this.n * other.d + other.n * this.d, this.d * other.d); }
  sub(other) { other = Q(other); return new Rational(this.n * other.d - other.n * this.d, this.d * other.d); }
  mul(other) { other = Q(other); return new Rational(this.n * other.n, this.d * other.d); }
  div(other) { other = Q(other); return new Rational(this.n * other.d, this.d * other.n); }
  neg() { return new Rational(-this.n, this.d); }
  abs() { return new Rational(this.n < 0n ? -this.n : this.n, this.d); }
  eq(other) { other = Q(other); return this.n === other.n && this.d === other.d; }
  isZero() { return this.n === 0n; }
  isOne() { return this.n === this.d; }
  valueOf() { return Number(this.n) / Number(this.d); }
  text() { return this.d === 1n ? String(this.n) : `${this.n}/${this.d}`; }
  latex() {
    if (this.d === 1n) return String(this.n);
    const sign = this.n < 0n ? '-' : '';
    const numerator = this.n < 0n ? -this.n : this.n;
    return `${sign}\\frac{${numerator}}{${this.d}}`;
  }
}

export class QuadraticSurd {
  constructor(a = q(0), b = q(1), radicand = 2) {
    this.a = Q(a); this.b = Q(b);
    let d = BigInt(radicand);
    if (d <= 0n) throw new Error('A simple real radical needs a positive radicand.');
    let outside = 1n;
    for (let factor = 2n; factor * factor <= d; factor++) {
      while (d % (factor * factor) === 0n) { d /= factor * factor; outside *= factor; }
    }
    this.b = this.b.mul(new Rational(outside));
    this.d = d;
    if (this.d === 1n) { this.a = this.a.add(this.b); this.b = q(0); }
    Object.freeze(this);
  }
  add(other) {
    if (other instanceof Rational) return new QuadraticSurd(this.a.add(other), this.b, this.d);
    if (!(other instanceof QuadraticSurd) || other.d !== this.d) throw new Error('Only like simple radicals can be added exactly.');
    return new QuadraticSurd(this.a.add(other.a), this.b.add(other.b), this.d);
  }
  sub(other) { return this.add(other instanceof QuadraticSurd ? new QuadraticSurd(other.a.neg(), other.b.neg(), other.d) : Q(other).neg()); }
  mul(other) {
    if (other instanceof Rational) return new QuadraticSurd(this.a.mul(other), this.b.mul(other), this.d);
    if (!(other instanceof QuadraticSurd) || other.d !== this.d) throw new Error('Products of unlike radicals are outside the simple-radical model.');
    return new QuadraticSurd(this.a.mul(other.a).add(this.b.mul(other.b).mul(new Rational(this.d))), this.a.mul(other.b).add(this.b.mul(other.a)), this.d);
  }
  latex() {
    if (this.b.isZero()) return this.a.latex();
    const radicalCoefficient = this.b.isOne() ? '' : this.b.eq(q(-1)) ? '-' : this.b.latex();
    if (this.a.isZero()) return `${radicalCoefficient}\\sqrt{${this.d}}`;
    return `${this.a.latex()} ${this.b.n < 0n ? '-' : '+'} ${this.b.abs().isOne() ? '' : this.b.abs().latex()}\\sqrt{${this.d}}`;
  }
}

export const surd = (radicand, coefficient = q(1), rationalPart = q(0)) => new QuadraticSurd(rationalPart, coefficient, radicand);

function gcd(a, b) {
  a = a < 0n ? -a : a; b = b < 0n ? -b : b;
  while (b) { const t = b; b = a % b; a = t; }
  return a || 1n;
}

export const Q = value => value instanceof Rational ? value : new Rational(BigInt(value), 1n);
export const q = (n, d = 1) => new Rational(BigInt(n), BigInt(d));
const clone = M => M.map(row => row.slice());
const zeros = (m, n) => Array.from({ length: m }, () => Array.from({ length: n }, () => q(0)));
export const identity = n => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => q(i === j ? 1 : 0)));
export const transpose = A => A[0].map((_, j) => A.map(row => row[j]));
export const multiply = (A, B) => A.map(row => B[0].map((_, j) => row.reduce((sum, value, k) => sum.add(value.mul(B[k][j])), q(0))));
export const matrixEqual = (A, B) => A.length === B.length && A[0].length === B[0].length && A.every((row, i) => row.every((v, j) => v.eq(B[i][j])));
const diagonal = values => values.map((value, i) => values.map((_, j) => q(i === j ? value : 0)));
const column = (M, j) => M.map(row => row[j]);

function hashSeed(seed) {
  let h = 2166136261 >>> 0;
  for (const char of seed) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h || 0x9e3779b9;
}

function createRng(seed) {
  let state = hashSeed(seed);
  const next = () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  return {
    next,
    int(min, max) { return min + Math.floor(next() * (max - min + 1)); },
    pick(values) { return values[Math.floor(next() * values.length)]; },
    sign() { return next() < .5 ? -1 : 1; }
  };
}

const DIFFICULTY = {
  beginner: { label: 'Beginner', coeff: 1, scramble: 2 },
  standard: { label: 'Standard', coeff: 2, scramble: 4 },
  challenge: { label: 'Challenge', coeff: 2, scramble: 7 }
};

function rowSwap(M, i, j) { [M[i], M[j]] = [M[j], M[i]]; }
function rowScale(M, i, factor) { M[i] = M[i].map(v => v.mul(factor)); }
function rowAdd(M, target, source, factor) { M[target] = M[target].map((v, j) => v.add(M[source][j].mul(factor))); }
function columnAdd(M, target, source, factor) { M.forEach(row => { row[target] = row[target].add(row[source].mul(factor)); }); }

export function gaussJordan(input, pivotLimit = input[0].length) {
  const M = clone(input);
  const steps = [];
  const pivots = [];
  let pivotRow = 0;
  for (let col = 0; col < pivotLimit && pivotRow < M.length; col++) {
    const found = M.findIndex((row, index) => index >= pivotRow && !row[col].isZero());
    if (found < 0) continue;
    if (found !== pivotRow) {
      rowSwap(M, found, pivotRow);
      steps.push({ operation: `R_{${pivotRow + 1}} \\leftrightarrow R_{${found + 1}}`, matrix: clone(M) });
    }
    const pivot = M[pivotRow][col];
    if (!pivot.isOne()) {
      const factor = q(1).div(pivot);
      rowScale(M, pivotRow, factor);
      const factorLatex = factor.eq(q(-1)) ? '-' : factor.latex();
      steps.push({ operation: `R_{${pivotRow + 1}} \\leftarrow ${factorLatex}R_{${pivotRow + 1}}`, matrix: clone(M) });
    }
    for (let row = 0; row < M.length; row++) {
      if (row === pivotRow || M[row][col].isZero()) continue;
      const coefficient = M[row][col].neg();
      rowAdd(M, row, pivotRow, coefficient);
      const sign = coefficient.n < 0n ? '-' : '+';
      const magnitude = coefficient.abs();
      const factorText = magnitude.isOne() ? '' : `${magnitude.latex()}`;
      steps.push({ operation: `R_{${row + 1}} \\leftarrow R_{${row + 1}} ${sign} ${factorText}R_{${pivotRow + 1}}`, matrix: clone(M) });
    }
    pivots.push(col);
    pivotRow++;
  }
  return { matrix: M, steps, pivots, rank: pivots.length };
}

export function inverseExact(A) {
  const n = A.length;
  const augmented = A.map((row, i) => [...row, ...identity(n)[i]]);
  const reduced = gaussJordan(augmented, n);
  if (reduced.pivots.length !== n) return null;
  return { matrix: reduced.matrix.map(row => row.slice(n)), steps: reduced.steps, augmented };
}

function simpleSimilarity(n, rng, difficulty) {
  if (n === 2) {
    const sign = rng.sign();
    const P = [[q(1), q(sign)], [q(1), q(2 * sign)]];
    return { P, Pinv: inverseExact(P).matrix };
  }
  // P = I + uvᵀ with vᵀu = 0. This is dense and unimodular, while
  // P⁻¹ = I − uvᵀ remains just as hand-friendly.
  const patterns = {
    3: [1, 1, -2],
    4: [1, 1, -1, -1],
    5: [1, 1, 1, -1, -2]
  };
  const base = patterns[n];
  const shift = rng.int(0, n - 1);
  const sign = rng.sign();
  const v = base.map((_, i) => base[(i + shift) % n] * sign);
  const u = Array.from({ length: n }, () => rng.sign() < 0 ? -1 : 1);
  // Keep vᵀu = 0 by using a common sign for u.
  u.fill(u[0]);
  const P = identity(n).map((row, i) => row.map((value, j) => value.add(q(u[i] * v[j]))));
  const Pinv = identity(n).map((row, i) => row.map((value, j) => value.sub(q(u[i] * v[j]))));
  return { P, Pinv };
}

function orthogonalRotation(n, i, j, sign = 1) {
  const M = identity(n);
  M[i][i] = q(3, 5); M[i][j] = q(-4 * sign, 5);
  M[j][i] = q(4 * sign, 5); M[j][j] = q(3, 5);
  return M;
}

function denseOrthogonal(n, rng) {
  let M;
  if (n === 2) M = orthogonalRotation(2, 0, 1, rng.sign());
  else if (n === 3) {
    M = [
      [q(1, 3), q(2, 3), q(2, 3)],
      [q(2, 3), q(1, 3), q(-2, 3)],
      [q(-2, 3), q(2, 3), q(-1, 3)]
    ];
  } else {
    M = [
      [q(1, 2), q(1, 2), q(1, 2), q(1, 2)],
      [q(1, 2), q(-1, 2), q(1, 2), q(-1, 2)],
      [q(1, 2), q(1, 2), q(-1, 2), q(-1, 2)],
      [q(1, 2), q(-1, 2), q(-1, 2), q(1, 2)]
    ];
  }
  if (rng.sign() < 0) M.forEach(row => { row[0] = row[0].neg(); });
  return M;
}

function eigenList(n, rng, nonzero = false) {
  const bank = nonzero ? [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5] : [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  const start = rng.int(0, bank.length - n);
  const values = bank.slice(start, start + n);
  if (new Set(values).size !== n) return Array.from({ length: n }, (_, i) => i + 1);
  return values;
}

function generateDiagonalizable(n, rng, difficulty) {
  const baseValues = [-2, -1, 1, 2, 3].slice(0, n);
  let best = null;
  for (let attempt = 0; attempt < 18; attempt++) {
    const eigenvalues = baseValues.slice();
    for (let i = eigenvalues.length - 1; i > 0; i--) {
      const j = rng.int(0, i); [eigenvalues[i], eigenvalues[j]] = [eigenvalues[j], eigenvalues[i]];
    }
    const { P, Pinv } = simpleSimilarity(n, rng, difficulty);
    const D = diagonal(eigenvalues);
    const A = multiply(multiply(P, D), Pinv);
    const offDiagonalZeros = A.reduce((sum, row, i) => sum + row.filter((value, j) => i !== j && value.isZero()).length, 0);
    const max = Math.max(...A.flat().map(value => Math.abs(Number(value.n))));
    const score = offDiagonalZeros * 100 + max;
    if (!best || score < best.score) best = { A, kind: 'diagonalizable', P, Pinv, D, eigenvalues, score };
  }
  delete best.score;
  return best;
}

function generateSymmetricSvd(n, rng) {
  const values = Array.from({ length: n }, (_, i) => n + 1 - i);
  values[n - 1] = -2;
  values[n - 2] = 3;
  const Qm = denseOrthogonal(n, rng);
  const D = diagonal(values);
  const A = multiply(multiply(Qm, D), transpose(Qm));
  const signs = diagonal(values.map(v => v < 0 ? -1 : 1));
  const U = multiply(Qm, signs);
  const Sigma = diagonal(values.map(Math.abs));
  return { A, kind: 'symmetric-svd', P: Qm, Pinv: transpose(Qm), D, eigenvalues: values, U, Sigma, V: Qm, singularValues: values.map(Math.abs) };
}

function generateSvd(m, n, rng) {
  const rank = Math.min(m, n);
  const singularValues = Array.from({ length: rank }, (_, i) => rank + 1 - i);
  const U = identity(m);
  const V = denseOrthogonal(n, rng);
  const Sigma = zeros(m, n);
  singularValues.forEach((value, i) => Sigma[i][i] = q(value));
  const A = multiply(multiply(U, Sigma), transpose(V));
  return { A, kind: 'svd', U, Sigma, V, singularValues };
}

function generateJordan(n, rng, difficulty, invertible) {
  const lambda = invertible ? rng.pick([-2, -1, 1, 2]) : rng.pick([-1, 0, 1]);
  const eigenvalues = [lambda, lambda];
  const used = new Set(eigenvalues);
  for (let value = 2; eigenvalues.length < n; value++) {
    const candidate = rng.sign() * value;
    if ((invertible && candidate === 0) || used.has(candidate)) continue;
    used.add(candidate); eigenvalues.push(candidate);
  }
  const J = diagonal(eigenvalues);
  J[0][1] = q(1);
  const { P, Pinv } = simpleSimilarity(n, rng, difficulty);
  return { A: multiply(multiply(P, J), Pinv), kind: 'jordan', J, P, Pinv, eigenvalues, lambda };
}

function generateInvertible(n, rng, difficulty) {
  const { P } = simpleSimilarity(n, rng, difficulty);
  return { A: P, kind: 'invertible' };
}

function scrambleRows(M, rng, difficulty) {
  const A = clone(M);
  const count = A.length + DIFFICULTY[difficulty].scramble;
  for (let t = 0; t < count; t++) {
    if (A.length > 1 && t % 4 === 3) rowSwap(A, t % A.length, (t + 1) % A.length);
    else {
      const source = t % A.length;
      const target = (t + 1) % A.length;
      rowAdd(A, target, source, q(rng.sign() * rng.int(1, DIFFICULTY[difficulty].coeff)));
    }
  }
  return A;
}

function generateRrefBase(m, n, rng, difficulty, systemMode) {
  const viable = [];
  if (m >= n) viable.push('unique');
  if (n > 1) viable.push('infinite');
  if (m > 1) viable.push('inconsistent');
  const classification = systemMode ? rng.pick(viable) : 'matrix';
  let rank = Math.min(m, n);
  if (classification === 'infinite' || classification === 'inconsistent') rank = Math.max(1, Math.min(m, n) - 1);
  const width = n + (systemMode ? 1 : 0);
  const target = zeros(m, width);
  for (let i = 0; i < rank; i++) {
    target[i][i] = q(1);
    for (let j = rank; j < n; j++) target[i][j] = q(rng.sign() * rng.int(0, 2));
  }
  if (systemMode) {
    if (classification === 'inconsistent') target[Math.min(rank, m - 1)][n] = q(1);
    else for (let i = 0; i < rank; i++) target[i][n] = q(rng.sign() * rng.int(1, 3));
  }
  const scrambled = scrambleRows(target, rng, difficulty);
  return {
    A: scrambled.map(row => row.slice(0, n)),
    b: systemMode ? scrambled.map(row => row[n]) : null,
    kind: 'rref',
    classification
  };
}

function makeSystem(A, rng) {
  const n = A[0].length;
  const x = Array.from({ length: n }, () => [q(rng.sign() * rng.int(1, 2))]);
  return { b: multiply(A, x).map(row => row[0]), classification: 'derived' };
}

function characteristicData(eigenvalues) {
  let coefficients = [q(1)];
  for (const eigenvalue of eigenvalues) {
    const next = Array.from({ length: coefficients.length + 1 }, () => q(0));
    coefficients.forEach((coefficient, degree) => {
      next[degree] = next[degree].add(coefficient.mul(q(eigenvalue)));
      next[degree + 1] = next[degree + 1].sub(coefficient);
    });
    coefficients = next;
  }
  return coefficients;
}

function polynomialLatex(coefficients) {
  const parts = [];
  for (let degree = coefficients.length - 1; degree >= 0; degree--) {
    const coefficient = coefficients[degree];
    if (coefficient.isZero()) continue;
    const negative = coefficient.n < 0n;
    const abs = coefficient.abs();
    const variable = degree === 0 ? '' : degree === 1 ? '\\lambda' : `\\lambda^{${degree}}`;
    const coeffText = degree > 0 && abs.isOne() ? '' : abs.latex();
    const term = `${coeffText}${variable}`;
    if (!parts.length) parts.push(negative ? `-${term}` : term);
    else parts.push(`${negative ? '-' : '+'} ${term}`);
  }
  return parts.join(' ') || '0';
}

function factorsLatex(eigenvalues) {
  const counts = new Map();
  eigenvalues.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].map(([value, count]) => {
    const factor = `(${value} - \\lambda)`;
    return count > 1 ? `${factor}^{${count}}` : factor;
  }).join('');
}

function rankOf(A) { return gaussJordan(A).rank; }
function shiftByEigenvalue(A, eigenvalue) { return A.map((row, i) => row.map((value, j) => i === j ? value.sub(q(eigenvalue)) : value)); }

function analyzeSystem(A, b) {
  const augmented = A.map((row, i) => [...row, b[i]]);
  const reduced = gaussJordan(augmented, A[0].length);
  const n = A[0].length;
  const inconsistent = reduced.matrix.some(row => row.slice(0, n).every(v => v.isZero()) && !row[n].isZero());
  if (inconsistent) return { ...reduced, classification: 'inconsistent', description: 'The reduced matrix contains a row of the form 0 = 1, so the system is inconsistent.' };
  if (reduced.rank === n) {
    const values = Array.from({ length: n }, (_, col) => {
      const row = reduced.pivots.indexOf(col);
      return row >= 0 ? reduced.matrix[row][n] : q(0);
    });
    return { ...reduced, classification: 'unique', values, description: `There is a pivot in every variable column, so the solution is ${vectorLatex(values, 'x')}.` };
  }
  const free = Array.from({ length: n }, (_, i) => i).filter(i => !reduced.pivots.includes(i));
  const equations = reduced.pivots.map((pivotCol, row) => {
    const terms = free.filter(col => !reduced.matrix[row][col].isZero()).map(col => {
      const coeff = reduced.matrix[row][col].neg();
      return `${coeff.latex()}x_{${col + 1}}`;
    });
    const rhs = reduced.matrix[row][n].latex();
    return `x_{${pivotCol + 1}} = ${rhs}${terms.length ? ' + ' + terms.join(' + ') : ''}`;
  });
  return { ...reduced, classification: 'infinite', free, equations, description: `There are ${free.length} free variables. A complete parametric description is ${equations.join(', ')}, with ${free.map(i => `x_{${i + 1}}`).join(', ')} free.` };
}

function vectorLatex(values, name = '') { return `${name ? `${name}=` : ''}\\begin{bmatrix}${values.map(v => v.latex()).join('\\\\')}\\end{bmatrix}`; }

function collectNumbers(value, out = []) {
  if (value instanceof Rational) out.push(value);
  else if (Array.isArray(value)) value.forEach(item => collectNumbers(item, out));
  else if (value && typeof value === 'object') Object.values(value).forEach(item => collectNumbers(item, out));
  return out;
}

function niceness(result, difficulty) {
  const values = collectNumbers({ A: result.A, sections: result.solutionData });
  const maxInteger = Math.max(0, ...values.map(v => Math.abs(Number(v.n))));
  const maxDenominator = Math.max(1, ...values.map(v => Number(v.d)));
  const stepCount = result.solutionData.reduce((sum, section) => sum + (section.steps?.length || 0), 0);
  const penalty = Math.min(3.5, Math.max(0, maxInteger - 9) / 25 + Math.max(0, maxDenominator - 4) / 7 + Math.max(0, stepCount - 8) / 24);
  return {
    score: Math.max(6.1, 9.8 - penalty).toFixed(1),
    maxInteger,
    maxDenominator,
    stepCount,
    label: DIFFICULTY[difficulty].label,
    note: `${stepCount} explicit steps · largest denominator ${maxDenominator}`
  };
}

function taskText(topics, systemMode) {
  const tasks = [];
  if (topics.includes('rref')) tasks.push(systemMode ? 'Row-reduce the augmented matrix and solve the system.' : 'Find the reduced row-echelon form of A.');
  if (topics.includes('inverse')) tasks.push('Find A⁻¹ using the augmented-matrix method.');
  if (topics.includes('diagonalization')) tasks.push('Find the characteristic polynomial, eigenvalues, eigenvectors, and a diagonalization A = PDP⁻¹.');
  if (topics.includes('jcf')) tasks.push('Find the Jordan canonical form J and a change-of-basis matrix P.');
  if (topics.includes('svd')) tasks.push('Find a full singular value decomposition A = UΣVᵀ.');
  return tasks;
}

function buildSolutionData(result, request) {
  const sections = [];
  const A = result.A;
  if (request.topics.includes('rref')) {
    if (request.rrefMode === 'system') {
      const system = analyzeSystem(A, result.b);
      sections.push({ type: 'rref', title: 'Row reduction and system solution', initial: A.map((row, i) => [...row, result.b[i]]), augmentedAt: A[0].length, steps: system.steps, final: system.matrix, conclusion: system.description, classification: system.classification, values: system.values, free: system.free, equations: system.equations });
    } else {
      const reduction = gaussJordan(A);
      sections.push({ type: 'rref', title: 'Reduced row-echelon form', initial: A, steps: reduction.steps, final: reduction.matrix, conclusion: `The matrix has rank ${reduction.rank}.` });
    }
  }
  if (request.topics.includes('inverse')) {
    const inv = inverseExact(A);
    sections.push({ type: 'inverse', title: 'Inverse by augmentation', initial: inv.augmented, augmentedAt: A.length, steps: inv.steps, final: inv.steps.length ? inv.steps.at(-1).matrix : inv.augmented, inverse: inv.matrix, verification: multiply(A, inv.matrix) });
    result.inverse = inv.matrix;
  }
  if (request.topics.includes('diagonalization')) {
    const coefficients = characteristicData(result.eigenvalues);
    sections.push({ type: 'diagonalization', title: 'Eigenstructure and diagonalization', characteristic: polynomialLatex(coefficients), factors: factorsLatex(result.eigenvalues), eigenvalues: result.eigenvalues, P: result.P, D: result.D, Pinv: result.Pinv, vectors: result.eigenvalues.map((value, i) => {
      const system = shiftByEigenvalue(A, value);
      const vector = column(result.P, i);
      return { value, vector, system, residual: multiply(system, vector.map(entry => [entry])).map(row => row[0]) };
    }), verification: multiply(multiply(result.P, result.D), result.Pinv) });
  }
  if (request.topics.includes('jcf')) {
    const coefficients = characteristicData(result.eigenvalues);
    const shifted = shiftByEigenvalue(A, result.lambda);
    sections.push({ type: 'jcf', title: 'Jordan form and generalized eigenvectors', characteristic: polynomialLatex(coefficients), factors: factorsLatex(result.eigenvalues), lambda: result.lambda, eigenvalues: result.eigenvalues, shifted, shiftedSquared: multiply(shifted, shifted), kernelDimension: A.length - rankOf(shifted), squaredKernelDimension: A.length - rankOf(multiply(shifted, shifted)), P: result.P, J: result.J, Pinv: result.Pinv, chain: [column(result.P, 0), column(result.P, 1)], verificationLeft: multiply(A, result.P), verificationRight: multiply(result.P, result.J) });
  }
  if (request.topics.includes('svd')) {
    const AtA = multiply(transpose(A), A);
    sections.push({ type: 'svd', title: 'Full singular value decomposition', AtA, eigenvalues: result.singularValues.map(value => value * value).concat(Array.from({ length: Math.max(0, A[0].length - result.singularValues.length) }, () => 0)), singularValues: result.singularValues, U: result.U, Sigma: result.Sigma, V: result.V, utu: multiply(transpose(result.U), result.U), vtv: multiply(transpose(result.V), result.V), verification: multiply(multiply(result.U, result.Sigma), transpose(result.V)) });
  }
  return sections;
}

export function validateRequest(input) {
  const rows = Number(input.rows), cols = Number(input.cols);
  const topics = [...new Set(input.topics || [])];
  if (!Number.isInteger(rows) || rows < 2 || rows > 5 || !Number.isInteger(cols) || cols < 2 || cols > 5) throw new Error('Rows and columns must be integers from 2 through 5.');
  if (!topics.length) throw new Error('Select at least one topic.');
  const allowed = ['rref', 'inverse', 'diagonalization', 'jcf', 'svd'];
  if (topics.some(topic => !allowed.includes(topic))) throw new Error('Unknown topic selection.');
  if (rows !== cols && topics.some(topic => ['inverse', 'diagonalization', 'jcf'].includes(topic))) throw new Error('Inverse, diagonalization, and Jordan form require a square matrix.');
  if ((rows > 4 || cols > 4) && topics.some(topic => ['jcf', 'svd'].includes(topic))) throw new Error('Jordan form and SVD are limited to dimensions of 4 or less.');
  if (topics.includes('jcf') && topics.some(topic => ['diagonalization', 'svd'].includes(topic))) throw new Error('Nontrivial Jordan form cannot be combined with diagonalization or the hand-friendly SVD templates.');
  const difficulty = DIFFICULTY[input.difficulty] ? input.difficulty : 'standard';
  return { rows, cols, topics, difficulty, rrefMode: input.rrefMode === 'system' ? 'system' : 'matrix', seed: String(input.seed || 'MATH-314').trim().slice(0, 32) || 'MATH-314' };
}

export function generateExercise(input) {
  const request = validateRequest(input);
  const rng = createRng(`${request.seed}|${request.rows}x${request.cols}|${request.topics.join(',')}|${request.difficulty}|${request.rrefMode}`);
  const { rows: m, cols: n, topics } = request;
  let result;
  if (topics.includes('jcf')) result = generateJordan(n, rng, request.difficulty, topics.includes('inverse'));
  else if (topics.includes('svd') && topics.includes('diagonalization')) result = generateSymmetricSvd(n, rng);
  else if (topics.includes('svd')) result = generateSvd(m, n, rng);
  else if (topics.includes('diagonalization')) result = generateDiagonalizable(n, rng, request.difficulty);
  else if (topics.includes('inverse')) result = generateInvertible(n, rng, request.difficulty);
  else result = generateRrefBase(m, n, rng, request.difficulty, request.rrefMode === 'system');

  if (request.rrefMode === 'system' && topics.includes('rref')) {
    if (!result.b) Object.assign(result, makeSystem(result.A, rng));
  }
  result.request = request;
  result.tasks = taskText(topics, request.rrefMode === 'system');
  result.solutionData = buildSolutionData(result, request);
  result.niceness = niceness(result, request.difficulty);
  return result;
}

export function matrixLatex(M, augmentedAt = null) {
  const columns = M[0].length;
  const spec = augmentedAt == null
    ? 'c'.repeat(columns)
    : `${'c'.repeat(augmentedAt)}|${'c'.repeat(columns - augmentedAt)}`;
  const rowSeparator = ` ${'\\'.repeat(2)}\n`;
  const rows = M.map(row => row.map(value => value.latex()).join(' & ')).join(rowSeparator);
  return `\\left[\\begin{array}{${spec}}\n${rows}\n\\end{array}\\right]`;
}

export function exerciseLatex(result) {
  const { request } = result;
  const lines = [
    '\\documentclass[11pt]{article}',
    '\\usepackage{amsmath,amssymb,geometry}',
    '\\geometry{margin=1in}',
    '\\setlength{\\arraycolsep}{7pt}',
    '\\renewcommand{\\arraystretch}{1.2}',
    '\\allowdisplaybreaks',
    '\\begin{document}',
    `\\section*{Matrix Workshop --- ${escapeLatexText(request.seed)}}`,
    displayLatex(`A=${matrixLatex(result.A)}`),
    '\\begin{enumerate}',
    ...taskLatex(result),
    '\\end{enumerate}',
    '\\newpage\\section*{Answer Key}'
  ];
  for (const section of result.solutionData) {
    lines.push(`\\subsection*{${escapeLatexText(section.title)}}`);
    if (section.type === 'rref') appendRrefLatex(lines, section, result);
    if (section.type === 'inverse') appendInverseLatex(lines, section, result);
    if (section.type === 'diagonalization') appendDiagonalizationLatex(lines, section);
    if (section.type === 'jcf') appendJordanLatex(lines, section);
    if (section.type === 'svd') appendSvdLatex(lines, section);
  }
  lines.push('\\end{document}');
  return lines.join('\n');
}

function displayLatex(body) { return `\\[\n${body}\n\\]`; }

function stepLatex(step, augmentedAt) {
  const breakLine = `${'\\'.repeat(2)}[6pt]`;
  return displayLatex(`\\begin{gathered}\n${step.operation} ${breakLine}\n${matrixLatex(step.matrix, augmentedAt)}\n\\end{gathered}`);
}

function taskLatex(result) {
  const { topics, rrefMode } = result.request;
  const tasks = [];
  if (topics.includes('rref')) tasks.push(rrefMode === 'system'
    ? '\\item Row-reduce the augmented matrix and solve the system.'
    : '\\item Find the reduced row-echelon form of $A$.');
  if (topics.includes('inverse')) tasks.push('\\item Find $A^{-1}$ using the augmented-matrix method.');
  if (topics.includes('diagonalization')) tasks.push('\\item Find $\\det(A-\\lambda I)$, the eigenvalues and eigenvectors, and a diagonalization $A=PDP^{-1}$.');
  if (topics.includes('jcf')) tasks.push('\\item Find the Jordan canonical form $J$ and a change-of-basis matrix $P$.');
  if (topics.includes('svd')) tasks.push('\\item Find a full singular value decomposition $A=U\\Sigma V^T$.');
  return tasks;
}

function appendOperationTrace(lines, section) {
  lines.push('\\paragraph{Starting matrix.}', displayLatex(matrixLatex(section.initial, section.augmentedAt)));
  section.steps.forEach((step, index) => {
    lines.push(`\\paragraph{Step ${index + 1}.}`, stepLatex(step, section.augmentedAt));
  });
}

function appendRrefLatex(lines, section, result) {
  appendOperationTrace(lines, section);
  lines.push(displayLatex(`\\operatorname{rref}=${matrixLatex(section.final, section.augmentedAt)}`));
  if (section.classification === 'unique') {
    lines.push('There is a pivot in every variable column, so the system has the unique solution', displayLatex(`x=${matrixLatex(section.values.map(value => [value]))}.`));
  } else if (section.classification === 'infinite') {
    const equationBreak = ` ${'\\'.repeat(2)} `;
    lines.push(`There are ${section.free.length} free variables. A complete parametric description is`, displayLatex(`\\begin{aligned}${section.equations.join(equationBreak)}\\end{aligned}`), `where $${section.free.map(index => `x_{${index + 1}}`).join(', ')}$ ${section.free.length === 1 ? 'is' : 'are'} free.`);
  } else if (section.classification === 'inconsistent') {
    lines.push('The reduced augmented matrix contains a row $[0\\;\\cdots\\;0\\mid 1]$, so the system is inconsistent.');
  } else {
    const rank = result.solutionData.find(item => item === section)?.final.filter(row => row.some(value => !value.isZero())).length;
    lines.push(`The matrix has rank ${rank}.`);
  }
}

function appendInverseLatex(lines, section, result) {
  lines.push('Apply elementary row operations to $[A\\mid I]$.');
  appendOperationTrace(lines, section);
  lines.push('Reading the right block gives', displayLatex(`A^{-1}=${matrixLatex(section.inverse)}`));
  lines.push('Finally, verify the result exactly:', displayLatex(`AA^{-1}=${matrixLatex(section.verification)}=I_{${result.A.length}}.`));
}

function appendDiagonalizationLatex(lines, section) {
  lines.push('Using the convention $p(\\lambda)=\\det(A-\\lambda I)$,', displayLatex(`p(\\lambda)=${section.characteristic}=${section.factors}.`));
  section.vectors.forEach(({ value, vector, system, residual }) => {
    const breakLine = `${'\\'.repeat(2)}[6pt]`;
    lines.push(`\\paragraph{Eigenvalue $\\lambda=${value}$.} Solve $(A-${parenthesize(value)}I)v=0$:`, displayLatex(`\\begin{gathered}\nA-${parenthesize(value)}I=${matrixLatex(system)} ${breakLine}\nv=${matrixLatex(vector.map(entry => [entry]))},\\qquad (A-${parenthesize(value)}I)v=${matrixLatex(residual.map(entry => [entry]))}\n\\end{gathered}`));
  });
  lines.push('Using these eigenvectors as the columns of $P$ gives', displayLatex(`P=${matrixLatex(section.P)},`), displayLatex(`D=${matrixLatex(section.D)},`), displayLatex(`P^{-1}=${matrixLatex(section.Pinv)}.`));
  lines.push('Therefore', displayLatex(`PDP^{-1}=${matrixLatex(section.verification)}=A.`));
}

function appendJordanLatex(lines, section) {
  lines.push('Using the convention $p(\\lambda)=\\det(A-\\lambda I)$,', displayLatex(`p(\\lambda)=${section.characteristic}=${section.factors}.`));
  lines.push(`For the repeated eigenvalue $\\lambda=${section.lambda}$,`, displayLatex(`A-${parenthesize(section.lambda)}I=${matrixLatex(section.shifted)},`), displayLatex(`(A-${parenthesize(section.lambda)}I)^2=${matrixLatex(section.shiftedSquared)}.`));
  lines.push(displayLatex(`\\dim\\ker(A-${parenthesize(section.lambda)}I)=${section.kernelDimension},\\qquad \\dim\\ker(A-${parenthesize(section.lambda)}I)^2=${section.squaredKernelDimension}.`));
  lines.push('Choose an eigenvector $v_1$ and generalized eigenvector $v_2$ satisfying', displayLatex(`v_1=${matrixLatex(section.chain[0].map(entry => [entry]))},\\qquad v_2=${matrixLatex(section.chain[1].map(entry => [entry]))},`), displayLatex(`(A-${parenthesize(section.lambda)}I)v_1=0,\\qquad (A-${parenthesize(section.lambda)}I)v_2=v_1.`));
  lines.push('The Jordan basis gives', displayLatex(`P=${matrixLatex(section.P)},`), displayLatex(`J=${matrixLatex(section.J)},`), displayLatex(`P^{-1}=${matrixLatex(section.Pinv)}.`), 'The defining identity checks exactly:', displayLatex(`AP=${matrixLatex(section.verificationLeft)}=PJ.`));
}

function appendSvdLatex(lines, section) {
  lines.push('First diagonalize $A^TA$:', displayLatex(`A^TA=${matrixLatex(section.AtA)}.`));
  lines.push(`Its eigenvalues are $${section.eigenvalues.join(', ')}$, so the singular values are $${section.singularValues.join(', ')}$.`);
  lines.push('The normalized eigenvectors form $V$, and $u_i=Av_i/\\sigma_i$ for every nonzero singular value. Completing the orthonormal bases gives', displayLatex(`U=${matrixLatex(section.U)},`), displayLatex(`\\Sigma=${matrixLatex(section.Sigma)},`), displayLatex(`V=${matrixLatex(section.V)}.`));
  lines.push('Check orthogonality and reconstruction:', displayLatex(`U^TU=${matrixLatex(section.utu)},\\qquad V^TV=${matrixLatex(section.vtv)},`), displayLatex(`U\\Sigma V^T=${matrixLatex(section.verification)}=A.`));
}

function parenthesize(value) { return value < 0 ? `(${value})` : String(value); }

function escapeLatexText(text) {
  const replacements = { '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '%': '\\%', '$': '\\$', '#': '\\#', '_': '\\_', '&': '\\&', '^': '\\textasciicircum{}', '~': '\\textasciitilde{}' };
  return String(text).replace(/[\\{}%$#_&^~]/g, character => replacements[character]).replaceAll('—', '---');
}
