// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');
const exists = (rel: string): boolean => existsSync(path.join(repoRoot, rel));

// Case-insensitive substring check so docs stay editable (matches the intent
// of "content markers are substrings, not full-doc assertions").
const contains = (rel: string, needle: string): boolean =>
  read(rel).toLowerCase().includes(needle.toLowerCase());

describe('CNCF governance bundle', () => {
  const requiredFiles = [
    'LICENSE',
    'README.md',
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
    'SECURITY.md',
    'MAINTAINERS.md',
    'CHANGELOG.md',
    '.github/ISSUE_TEMPLATE/bug_report.md',
    '.github/ISSUE_TEMPLATE/feature_request.md',
    '.github/ISSUE_TEMPLATE/config.yml',
    '.github/pull_request_template.md',
    '.github/CODEOWNERS',
  ];

  it('has every required governance file at its path', () => {
    for (const file of requiredFiles) {
      expect(exists(file), `missing required governance file: ${file}`).toBe(true);
    }
  });

  it('LICENSE contains the verbatim Apache-2.0 text', () => {
    expect(contains('LICENSE', 'Apache License')).toBe(true);
    expect(contains('LICENSE', 'Version 2.0')).toBe(true);
    expect(contains('LICENSE', 'END OF TERMS AND CONDITIONS')).toBe(true);
  });

  it('README.md carries the licence badge, compatibility matrix, quickstart, demo placeholder, and governance links', () => {
    expect(contains('README.md', 'License: Apache-2.0')).toBe(true);
    expect(contains('README.md', 'Compatibility matrix')).toBe(true);
    expect(contains('README.md', 'placeholder')).toBe(true);
    expect(contains('README.md', 'Quickstart')).toBe(true);
    expect(contains('README.md', '90-second demo GIF placeholder')).toBe(true);
    expect(contains('README.md', 'CONTRIBUTING.md')).toBe(true);
    expect(contains('README.md', 'SECURITY.md')).toBe(true);
    expect(contains('README.md', 'CODE_OF_CONDUCT.md')).toBe(true);
  });

  it('CONTRIBUTING.md records the pinned cadences, DCO, and conventional commits', () => {
    expect(contains('CONTRIBUTING.md', 'weekly triage')).toBe(true);
    // Anchored so "114 days" / "13 merged" cannot silently satisfy these.
    expect(contains('CONTRIBUTING.md', 'within 14 days')).toBe(true);
    expect(contains('CONTRIBUTING.md', '3 merged non-trivial')).toBe(true);
    expect(contains('CONTRIBUTING.md', 'Signed-off-by')).toBe(true);
    expect(contains('CONTRIBUTING.md', 'Conventional Commits')).toBe(true);
  });

  it('SECURITY.md names the disclosure channel, scope, upstream redirect, and 7-day cadence', () => {
    expect(contains('SECURITY.md', 'private vulnerability reporting')).toBe(true);
    expect(contains('SECURITY.md', 'upstream')).toBe(true);
    // Anchored so a reworded cadence (e.g. "17 days") cannot silently satisfy it.
    expect(contains('SECURITY.md', 'within 7 days')).toBe(true);
    // Plugin scoped in, operator/flagd/Kubernetes redirected upstream.
    expect(contains('SECURITY.md', 'OpenFeature Operator')).toBe(true);
    expect(contains('SECURITY.md', 'flagd')).toBe(true);
    expect(contains('SECURITY.md', 'Kubernetes')).toBe(true);
  });

  it('CODE_OF_CONDUCT.md references the CNCF Code of Conduct', () => {
    expect(contains('CODE_OF_CONDUCT.md', 'CNCF')).toBe(true);
  });

  it('CHANGELOG.md is release-please-owned, not a hand-maintained Keep a Changelog', () => {
    // release-please splices generated release notes in after the title/preamble
    // and has no concept of a Keep-a-Changelog [Unreleased] section — it will
    // neither consume nor clear one, so this file must ship as a bare header.
    expect(contains('CHANGELOG.md', 'release-please')).toBe(true);
    expect(contains('CHANGELOG.md', 'Semantic Versioning')).toBe(true);
    // A stray [Unreleased] section would signal someone reintroduced hand-written
    // entries that release-please will strand below every generated version.
    expect(contains('CHANGELOG.md', '[Unreleased]')).toBe(false);
  });

  it('MAINTAINERS.md lists the factual maintainer identity', () => {
    expect(contains('MAINTAINERS.md', 'Jason Benedicic')).toBe(true);
    expect(contains('MAINTAINERS.md', '@jabenedicic')).toBe(true);
  });

  it('CODEOWNERS assigns the whole repo to the maintainer', () => {
    expect(contains('.github/CODEOWNERS', '* @jabenedicic')).toBe(true);
  });

  it('the .github issue and PR templates carry their load-bearing content', () => {
    // Presence alone is a weak guard — assert each template still holds its
    // defining content so an emptied/gutted file fails instead of passing green.
    expect(contains('.github/ISSUE_TEMPLATE/bug_report.md', 'To reproduce')).toBe(true);
    expect(contains('.github/ISSUE_TEMPLATE/feature_request.md', 'Proposed solution')).toBe(true);
    expect(contains('.github/ISSUE_TEMPLATE/config.yml', 'blank_issues_enabled')).toBe(true);
    expect(contains('.github/ISSUE_TEMPLATE/config.yml', 'security/advisories/new')).toBe(true);
    expect(contains('.github/pull_request_template.md', 'Signed-off-by')).toBe(true);
    expect(contains('.github/pull_request_template.md', 'Conventional Commits')).toBe(true);
  });
});
