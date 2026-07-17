// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');
const exists = (rel: string): boolean => existsSync(path.join(repoRoot, rel));

// Case-sensitive, anchored substring check: these are code/config markers where
// a wrong value (e.g. "400 KB", 'interval: "daily"') must NOT silently pass, so
// unlike the governance suite we do not lower-case.
const contains = (rel: string, needle: string): boolean => read(rel).includes(needle);

describe('CI pipeline config', () => {
  const requiredFiles = [
    '.github/workflows/pr.yml',
    '.github/workflows/codeql.yml',
    '.size-limit.cjs',
    '.npmignore',
    '.gitignore',
  ];

  it('has every required CI/config file at its path', () => {
    for (const file of requiredFiles) {
      expect(exists(file), `missing required CI config file: ${file}`).toBe(true);
    }
  });

  it('pr.yml runs the full ordered check chain via npm ci on pull_request', () => {
    const pr = '.github/workflows/pr.yml';
    // Reproducible install against the committed lockfile.
    expect(contains(pr, 'npm ci')).toBe(true);
    // Triggered on PRs (required-check enforcement).
    expect(contains(pr, 'pull_request')).toBe(true);
    // ...and on pushes to main.
    expect(contains(pr, 'branches: [main]')).toBe(true);
    // Each of the eight chain steps must be present as its own command so it
    // fails the job independently.
    for (const step of [
      'npm run lint',
      'npm run format-check',
      'npm run tsc',
      'npm run licenses',
      'npm run spdx',
      'npm run test',
      'npm run build',
      'npm run size',
    ]) {
      expect(contains(pr, step), `pr.yml missing chain step: ${step}`).toBe(true);
    }
  });

  it('pr.yml orders the chain lint -> format -> tsc -> licenses -> spdx -> test -> build -> size', () => {
    const body = read('.github/workflows/pr.yml');
    const order = [
      'npm run lint',
      'npm run format-check',
      'npm run tsc',
      'npm run licenses',
      'npm run spdx',
      'npm run test',
      'npm run build',
      'npm run size',
    ];
    const positions = order.map(step => body.indexOf(step));
    for (let i = 1; i < positions.length; i++) {
      expect(
        positions[i] > positions[i - 1],
        `pr.yml step "${order[i]}" must come after "${order[i - 1]}"`
      ).toBe(true);
    }
  });

  it('codeql.yml scans javascript-typescript on PRs and a schedule', () => {
    const cq = '.github/workflows/codeql.yml';
    expect(contains(cq, 'javascript-typescript')).toBe(true);
    // Must scan at PR time, not only on the weekly sweep.
    expect(contains(cq, 'pull_request')).toBe(true);
    expect(contains(cq, 'schedule:')).toBe(true);
    expect(contains(cq, 'cron:')).toBe(true);
  });

  // Dependency auto-updates are Renovate's, not Dependabot's — see renovate.json and
  // the checks in this file's Renovate block. The OpenFeature technical guidelines
  // recommend Renovate over Dependabot, and Renovate's :gitSignOff preset makes bot
  // commits DCO-compliant, which Dependabot cannot do.

  it('.size-limit.cjs gates dist/main.js at the 500 KB budget', () => {
    const sl = '.size-limit.cjs';
    expect(contains(sl, 'dist/main.js')).toBe(true);
    // Anchored so a loosened budget (e.g. "900 KB") cannot silently satisfy it.
    expect(contains(sl, '500 KB')).toBe(true);
  });

  it('.npmignore excludes TypeScript sources from the tarball', () => {
    // Only the built dist/ ships; the whole src/ tree (formerly including the
    // now-deleted spike) is a build input, not a runtime artifact. Match an actual
    // ignore line, not a substring — a `src/` mention inside a prose comment must
    // NOT be enough to pass, or a deleted rule would go undetected.
    const npmignoreLines = read('.npmignore')
      .split('\n')
      .map(line => line.trim());
    expect(npmignoreLines).toContain('src/');
  });

  it('.gitignore ignores stray compiled src JS', () => {
    expect(contains('.gitignore', 'src/**/*.js')).toBe(true);
  });
});
