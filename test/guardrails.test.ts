// @vitest-environment node
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { ESLint } from 'eslint';

const repoRoot = process.cwd();

interface Lint {
  ids: Set<string>;
  messages: { ruleId: string | null; message: string }[];
}

async function lintFixture(fixture: string): Promise<Lint> {
  const eslint = new ESLint({ cwd: repoRoot, useEslintrc: true });
  const results = await eslint.lintFiles([path.join('test', 'fixtures', fixture)]);
  const ids = new Set<string>();
  const messages: { ruleId: string | null; message: string }[] = [];
  for (const result of results) {
    for (const message of result.messages) {
      if (message.ruleId) {
        ids.add(message.ruleId);
      }
      messages.push({ ruleId: message.ruleId, message: message.message });
    }
  }
  return { ids, messages };
}

const has = (l: Lint, ruleId: string): boolean => l.ids.has(ruleId);
const hasMsg = (l: Lint, ruleId: string, needle: string): boolean =>
  l.messages.some(m => m.ruleId === ruleId && m.message.includes(needle));

describe('repository guardrails', () => {
  const guardrailRuleIds = [
    'no-restricted-imports',
    'no-restricted-globals',
    'no-restricted-syntax',
    'react/no-danger',
    'jsx-a11y/alt-text',
  ];

  it('flags every guardrail category on the violating fixture', async () => {
    const l = await lintFixture('eslint-violations.tsx');

    // SDK-internal import ban.
    expect(hasMsg(l, 'no-restricted-imports', 'SDK internals')).toBe(true);
    // MUI named-imports-only: single-segment AND multi-segment deep imports.
    expect(hasMsg(l, 'no-restricted-imports', 'named imports from @mui/material')).toBe(true);
    // MUI namespace import ban.
    expect(hasMsg(l, 'no-restricted-syntax', 'namespace import of @mui/material')).toBe(true);
    // Direct-fetch global ban carries an FR34 message.
    expect(hasMsg(l, 'no-restricted-globals', 'Direct fetch is forbidden (FR34)')).toBe(true);
    // FR34 storage global bans (localStorage / sessionStorage) carry FR34 messages.
    expect(hasMsg(l, 'no-restricted-globals', 'localStorage is forbidden (FR34)')).toBe(true);
    expect(hasMsg(l, 'no-restricted-globals', 'sessionStorage is forbidden (FR34)')).toBe(true);
    // FR34 socket global bans (WebSocket / EventSource) carry FR34 messages.
    expect(hasMsg(l, 'no-restricted-globals', 'WebSocket is forbidden (FR34)')).toBe(true);
    expect(hasMsg(l, 'no-restricted-globals', 'EventSource is forbidden (FR34)')).toBe(true);
    // FR34 HTTP-client import ban (axios) fires with an FR34 message.
    expect(hasMsg(l, 'no-restricted-imports', 'HTTP-client libraries are forbidden (FR34)')).toBe(
      true,
    );
    // window.fetch member ban.
    expect(hasMsg(l, 'no-restricted-syntax', 'window.fetch is forbidden')).toBe(true);
    // FR34 window.* member bans (storage/socket accessed off window bypass no-restricted-globals).
    expect(hasMsg(l, 'no-restricted-syntax', 'window.localStorage is forbidden (FR34)')).toBe(true);
    expect(hasMsg(l, 'no-restricted-syntax', 'window.sessionStorage is forbidden (FR34)')).toBe(
      true,
    );
    expect(hasMsg(l, 'no-restricted-syntax', 'window.WebSocket is forbidden (FR34)')).toBe(true);
    expect(hasMsg(l, 'no-restricted-syntax', 'window.EventSource is forbidden (FR34)')).toBe(true);
    // XMLHttpRequest construction ban.
    expect(hasMsg(l, 'no-restricted-syntax', 'XMLHttpRequest is forbidden')).toBe(true);
    // Hex-colour literal ban (dedicated assertion).
    expect(hasMsg(l, 'no-restricted-syntax', 'hex colours')).toBe(true);
    // px literal ban (dedicated assertion).
    expect(hasMsg(l, 'no-restricted-syntax', 'px literals')).toBe(true);
    // Raw HTML injection ban.
    expect(has(l, 'react/no-danger')).toBe(true);
    // Accessibility: <img> without alt.
    expect(has(l, 'jsx-a11y/alt-text')).toBe(true);
  });

  it('reports no guardrail rule on the clean fixture (incl. allowed near-misses)', async () => {
    const l = await lintFixture('clean.tsx');
    for (const ruleId of guardrailRuleIds) {
      expect(l.ids.has(ruleId)).toBe(false);
    }
    // The permitted @mui/material/styles deep import must not be flagged, and
    // unitless spacing (m: 2, p: 8) must not be mistaken for a px literal.
    expect(hasMsg(l, 'no-restricted-imports', 'named imports from @mui/material')).toBe(false);
    expect(hasMsg(l, 'no-restricted-syntax', 'px literals')).toBe(false);
    // None of the new FR34 storage/socket/HTTP-client bans fire on the clean fixture.
    expect(hasMsg(l, 'no-restricted-globals', 'localStorage is forbidden (FR34)')).toBe(false);
    expect(hasMsg(l, 'no-restricted-globals', 'sessionStorage is forbidden (FR34)')).toBe(false);
    expect(hasMsg(l, 'no-restricted-globals', 'WebSocket is forbidden (FR34)')).toBe(false);
    expect(hasMsg(l, 'no-restricted-globals', 'EventSource is forbidden (FR34)')).toBe(false);
    expect(hasMsg(l, 'no-restricted-imports', 'HTTP-client libraries are forbidden (FR34)')).toBe(
      false,
    );
    // Nor do the window.* member bans fire on the clean fixture.
    expect(hasMsg(l, 'no-restricted-syntax', 'window.localStorage is forbidden (FR34)')).toBe(false);
    expect(hasMsg(l, 'no-restricted-syntax', 'window.sessionStorage is forbidden (FR34)')).toBe(
      false,
    );
    expect(hasMsg(l, 'no-restricted-syntax', 'window.WebSocket is forbidden (FR34)')).toBe(false);
    expect(hasMsg(l, 'no-restricted-syntax', 'window.EventSource is forbidden (FR34)')).toBe(false);
  });

  it('SPDX check fails on a header-less file', () => {
    let exitCode = 0;
    try {
      execFileSync(process.execPath, ['scripts/check-spdx.mjs', 'test/fixtures/missing-spdx.ts'], {
        cwd: repoRoot,
      });
    } catch (err: any) {
      exitCode = err.status ?? 1;
    }
    expect(exitCode).not.toBe(0);
  });

  it('SPDX check passes on a file with the header', () => {
    let exitCode = 0;
    try {
      execFileSync(process.execPath, ['scripts/check-spdx.mjs', 'test/fixtures/clean.tsx'], {
        cwd: repoRoot,
      });
    } catch (err: any) {
      exitCode = err.status ?? 1;
    }
    expect(exitCode).toBe(0);
  });
});
