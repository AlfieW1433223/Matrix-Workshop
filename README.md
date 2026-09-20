# Matrix Workshop

Matrix Workshop is a browser-based generator for hand-friendly linear algebra exercises. It builds exact matrices for classroom use and produces both a student copy and a complete worked answer key.

**Live site:** [matrix-workshop.super-newt-9453.chatgpt.site](https://matrix-workshop.super-newt-9453.chatgpt.site)

## Features

- Row reduction and augmented linear systems
- Inverses by row reduction of `[A | I]`
- Diagonalization with characteristic polynomials and eigenspaces
- Nontrivial Jordan canonical form exercises
- Full exact SVD exercises
- Reproducible variants through shareable seeds
- Exact integer, rational, and simple-radical arithmetic
- Student-copy and answer-key views
- Print/PDF and compile-ready LaTeX export
- Explicit intermediate matrices after every row operation

The generator uses construction-first templates rather than accepting arbitrary random matrices. This keeps the matrices nontrivial while controlling the size of all displayed calculations.

## Run locally

No installation or build step is required. Serve the `dist` directory with any static web server. For example, with Python:

```sh
python3 -m http.server 4173 --directory dist
```

Then open <http://localhost:4173>.

Opening `dist/index.html` directly is not recommended because browsers may restrict JavaScript module imports from local files.

## Test

Node.js is the only test requirement.

```sh
npm test
```

The property-style test suite checks deterministic generation across hundreds of seeded configurations, exact matrix identities, nontriangular exercise matrices, all three linear-system classifications, and LaTeX structure.

## Repository structure

```text
dist/
  index.html       Instructor interface
  styles.css       Responsive and print styling
  app.js           UI state and rendering
  engine.mjs       Exact arithmetic and exercise generation
tests/
  engine.test.mjs  Exactness and generation tests
```

The site is intentionally static: exercise generation happens locally in the visitor's browser, and no account or database is required.

## Publish with GitHub Pages

This repository includes a GitHub Actions workflow that publishes the contents of `dist/`.

1. Create an empty GitHub repository.
2. Push this repository's `main` branch to it.
3. In the GitHub repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **GitHub Actions** as the source.
5. Run the **Deploy Matrix Workshop to GitHub Pages** workflow, or push another commit to `main`.

GitHub will show the Pages URL when deployment finishes.

## Configuration links

The current generator settings are stored in the page URL, so instructors can bookmark or share a specific configuration and seed. For example:

```text
?r=3&c=3&t=rref,inverse,diagonalization&d=standard&mode=matrix&seed=MATH-314
```

## License

No open-source license has been selected yet. The source is visible on GitHub, but reuse and redistribution rights are not granted unless a license is added. Choose a license before inviting outside contributions or reuse.
