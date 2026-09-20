import assert from 'node:assert/strict';
import {
  q, surd, generateExercise, exerciseLatex, validateRequest, matrixEqual, multiply, identity
} from '../dist/engine.mjs';

const serial = matrix => matrix.map(row => row.map(value => value.text()).join(',')).join(';');
const isTriangular = matrix => {
  const upper = matrix.every((row, i) => row.every((value, j) => i <= j || value.isZero()));
  const lower = matrix.every((row, i) => row.every((value, j) => i >= j || value.isZero()));
  return upper || lower;
};

assert.equal(q(2, 4).text(), '1/2');
assert.equal(q(-6, -8).text(), '3/4');
assert.equal(surd(8).latex(), '2\\sqrt{2}');
assert.equal(surd(2).mul(surd(2)).latex(), '2');

const requests = [];
for (let rows = 2; rows <= 5; rows++) for (let cols = 2; cols <= 5; cols++) {
  requests.push({ rows, cols, topics: ['rref'], difficulty: 'standard', rrefMode: 'matrix' });
  requests.push({ rows, cols, topics: ['rref'], difficulty: 'standard', rrefMode: 'system' });
  if (rows <= 4 && cols <= 4) requests.push({ rows, cols, topics: ['svd'], difficulty: 'standard', rrefMode: 'matrix' });
}
for (let n = 2; n <= 5; n++) {
  requests.push({ rows: n, cols: n, topics: ['inverse'], difficulty: 'standard', rrefMode: 'matrix' });
  requests.push({ rows: n, cols: n, topics: ['rref', 'inverse', 'diagonalization'], difficulty: 'standard', rrefMode: 'matrix' });
  if (n <= 4) {
    requests.push({ rows: n, cols: n, topics: ['jcf', 'inverse'], difficulty: 'standard', rrefMode: 'matrix' });
    requests.push({ rows: n, cols: n, topics: ['inverse', 'diagonalization', 'svd'], difficulty: 'standard', rrefMode: 'matrix' });
  }
}

let exercised = 0;
for (const base of requests) for (let iteration = 0; iteration < 6; iteration++) {
  const request = { ...base, seed: `PROPERTY-${iteration}` };
  const result = generateExercise(request);
  const again = generateExercise(request);
  assert.equal(serial(result.A), serial(again.A), 'same request and seed must reproduce the matrix');
  assert.equal(result.A.length, request.rows);
  assert.equal(result.A[0].length, request.cols);
  assert.ok(!serial(result.A).includes('.'), 'display values must stay exact');

  for (const section of result.solutionData) {
    if (section.steps) for (const step of section.steps) {
      assert.equal(step.matrix.length, section.initial.length);
      assert.equal(step.matrix[0].length, section.initial[0].length);
    }
    if (section.type === 'inverse') assert.ok(matrixEqual(multiply(result.A, section.inverse), identity(result.A.length)));
    if (section.type === 'diagonalization') assert.ok(matrixEqual(section.verification, result.A));
    if (section.type === 'jcf') {
      assert.ok(matrixEqual(section.verificationLeft, section.verificationRight));
      assert.equal(section.kernelDimension, 1);
      assert.ok(section.squaredKernelDimension >= 2);
    }
    if (section.type === 'svd') {
      assert.ok(matrixEqual(section.utu, identity(section.U.length)));
      assert.ok(matrixEqual(section.vtv, identity(section.V.length)));
      assert.ok(matrixEqual(section.verification, result.A));
    }
  }

  if (request.rows === request.cols && request.topics.some(topic => ['inverse', 'diagonalization', 'jcf', 'svd'].includes(topic))) {
    assert.equal(isTriangular(result.A), false, 'constructed square exercises should not be triangular');
  }
  exercised++;
}

const classifications = new Set();
for (let i = 0; i < 80; i++) {
  const result = generateExercise({ rows: 3, cols: 3, topics: ['rref'], difficulty: 'standard', rrefMode: 'system', seed: `CLASS-${i}` });
  classifications.add(result.solutionData[0].classification);
}
assert.deepEqual([...classifications].sort(), ['inconsistent', 'infinite', 'unique']);

assert.throws(() => validateRequest({ rows: 3, cols: 4, topics: ['inverse'], difficulty: 'standard', rrefMode: 'matrix', seed: 'BAD' }));
assert.throws(() => validateRequest({ rows: 3, cols: 3, topics: ['jcf', 'diagonalization'], difficulty: 'standard', rrefMode: 'matrix', seed: 'BAD' }));

const latexCases = [
  { rows: 3, cols: 3, topics: ['rref', 'inverse', 'diagonalization'], difficulty: 'standard', rrefMode: 'matrix', seed: 'LATEX-DIAG' },
  { rows: 4, cols: 4, topics: ['jcf', 'inverse'], difficulty: 'standard', rrefMode: 'matrix', seed: 'LATEX-JCF' },
  { rows: 3, cols: 4, topics: ['rref', 'svd'], difficulty: 'standard', rrefMode: 'system', seed: 'LATEX-SVD' }
];

for (const request of latexCases) {
  const latex = exerciseLatex(generateExercise(request));
  assert.ok(latex.startsWith('\\documentclass[11pt]{article}'));
  assert.ok(latex.endsWith('\\end{document}'));
  assert.ok(!latex.split('\n').some(line => line.startsWith('\\\\[')), 'display math must start with one LaTeX backslash');
  assert.ok(!/[^\\]qquad/.test(latex), 'qquad must retain its command backslash');
  assert.ok(!/\\begin\{array\}(?!\{[c|]+\})/.test(latex), 'every array needs a column specification');
  assert.equal((latex.match(/\\begin\{array\}/g) || []).length, (latex.match(/\\end\{array\}/g) || []).length);
  assert.equal((latex.match(/\\begin\{gathered\}/g) || []).length, (latex.match(/\\end\{gathered\}/g) || []).length);
  const latexLines = latex.split('\n').map(line => line.trim());
  assert.equal(latexLines.filter(line => line === '\\[').length, latexLines.filter(line => line === '\\]').length);
}

console.log(`Passed ${exercised} seeded exact-generation scenarios.`);
