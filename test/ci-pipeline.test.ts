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

  it('renovate.json exists, parses as JSON, and extends :gitSignOff', () => {
    expect(exists('renovate.json'), 'missing renovate.json').toBe(true);
    const config = JSON.parse(read('renovate.json'));
    // Losing this preset would silently drop the Signed-off-by trailer from
    // every bot commit, deadlocking Renovate PRs against a required DCO check.
    expect(
      Array.isArray(config.extends) && config.extends.includes(':gitSignOff'),
      'renovate.json must extend :gitSignOff so bot commits satisfy DCO'
    ).toBe(true);
  });

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

describe('Workflow supply-chain hardening', () => {
  // Every workflow that exists on this branch — a reverted pin (e.g. back to
  // `@v2`) or a dropped permissions block in any of these must fail this suite.
  const workflowFiles = [
    '.github/workflows/pr.yml',
    '.github/workflows/codeql.yml',
    '.github/workflows/lint-pr.yml',
    '.github/workflows/nightly-e2e.yml',
    '.github/workflows/release-please.yml',
  ];

  it('has every workflow file this suite audits', () => {
    for (const file of workflowFiles) {
      expect(exists(file), `missing workflow file: ${file}`).toBe(true);
    }
  });

  it('pins every `uses:` action reference to a full 40-hex commit SHA', () => {
    // A trailing `# vX.Y.Z` comment documenting the human-readable version is
    // fine (and expected); a floating `@vN`/`@main`/`@master` ref is not.
    const shaPinned = /uses:\s+\S+@[0-9a-f]{40}(\s|$)/;
    const floatingRef = /uses:\s+\S+@(v\d[\w.-]*|main|master)\s*(#.*)?$/;

    for (const file of workflowFiles) {
      const usesLines = read(file)
        .split('\n')
        .filter(line => /\buses:/.test(line));
      expect(usesLines.length, `${file} declares no uses: lines`).toBeGreaterThan(0);

      for (const line of usesLines) {
        expect(
          shaPinned.test(line),
          `${file}: action reference not pinned to a 40-hex commit SHA: "${line.trim()}"`
        ).toBe(true);
        expect(
          floatingRef.test(line),
          `${file}: action reference floats on a tag/branch instead of a SHA: "${line.trim()}"`
        ).toBe(false);
      }
    }
  });

  it('pr.yml declares least-privilege permissions (contents: read)', () => {
    const pr = read('.github/workflows/pr.yml');
    expect(contains('.github/workflows/pr.yml', 'permissions:')).toBe(true);
    // Anchored to the key/value pair, not merely the word "permissions"
    // appearing anywhere, so dropping the block itself is caught.
    expect(
      /permissions:\s*\n\s*contents:\s*read/.test(pr),
      'pr.yml missing a top-level `permissions: contents: read` block'
    ).toBe(true);
  });
});
