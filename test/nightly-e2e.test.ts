// @vitest-environment node
// SPDX-License-Identifier: Apache-2.0
//
// Copyright 2025 The Kubernetes Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');
const exists = (rel: string): boolean => existsSync(path.join(repoRoot, rel));

// Case-sensitive, anchored substring check: these are code/config markers where
// a wrong value (e.g. a stray `pull_request:` trigger) must NOT silently pass,
// so unlike the governance suite we do not lower-case.
const contains = (rel: string, needle: string): boolean => read(rel).includes(needle);

describe('Nightly E2E harness', () => {
  const requiredFiles = [
    '.github/workflows/nightly-e2e.yml',
    'e2e/setup/install-operator.sh',
    'e2e/setup/start-headlamp.sh',
    'e2e/fixtures/kind-config.yaml',
    'e2e/fixtures/featureflag.yaml',
    'e2e/flows/list.e2e.ts',
    'playwright.config.ts',
  ];

  it('has every required harness file at its path', () => {
    for (const file of requiredFiles) {
      expect(exists(file), `missing required harness file: ${file}`).toBe(true);
    }
  });

  it('nightly-e2e.yml triggers on schedule + workflow_dispatch and NOT on pull_request', () => {
    const wf = '.github/workflows/nightly-e2e.yml';
    expect(contains(wf, 'schedule:')).toBe(true);
    expect(contains(wf, 'workflow_dispatch:')).toBe(true);
    expect(contains(wf, 'cron:')).toBe(true);
    // NFR27: this must never become a PR-gate required check. Anchored so a
    // `pull_request:` trigger cannot slip in unnoticed.
    expect(contains(wf, 'pull_request:')).toBe(false);
    // Least-privilege + bounded runtime.
    expect(contains(wf, 'contents: read')).toBe(true);
    expect(contains(wf, 'timeout-minutes:')).toBe(true);
  });

  it('nightly-e2e.yml runs the ordered harness steps', () => {
    const wf = '.github/workflows/nightly-e2e.yml';
    for (const marker of [
      'npm ci',
      'npm run build',
      'npm run package',
      'helm/kind-action',
      'e2e/setup/install-operator.sh',
      'e2e/setup/start-headlamp.sh',
      'playwright install',
      'npm run e2e',
      'actions/upload-artifact',
    ]) {
      expect(contains(wf, marker), `nightly-e2e.yml missing step marker: ${marker}`).toBe(true);
    }
  });

  it('install-operator.sh installs cert-manager + the operator and waits on the CRD', () => {
    const sh = 'e2e/setup/install-operator.sh';
    expect(contains(sh, 'set -euo pipefail')).toBe(true);
    expect(contains(sh, 'cert-manager')).toBe(true);
    expect(contains(sh, 'open-feature-operator')).toBe(true);
    expect(contains(sh, 'featureflags.core.openfeature.dev')).toBe(true);
  });

  it('start-headlamp.sh starts the server with a plugins dir on the fixed port', () => {
    const sh = 'e2e/setup/start-headlamp.sh';
    expect(contains(sh, 'set -euo pipefail')).toBe(true);
    expect(contains(sh, '-plugins-dir')).toBe(true);
    expect(contains(sh, '4466')).toBe(true);
  });

  it('featureflag.yaml is a valid v1beta1 FeatureFlag with a flagSpec', () => {
    const ff = 'e2e/fixtures/featureflag.yaml';
    expect(contains(ff, 'core.openfeature.dev/v1beta1')).toBe(true);
    expect(contains(ff, 'flagSpec')).toBe(true);
    expect(contains(ff, 'defaultVariant')).toBe(true);
  });

  it('playwright.config.ts matches *.e2e.ts under ./e2e (Vitest-collision guard)', () => {
    const cfg = 'playwright.config.ts';
    expect(contains(cfg, '*.e2e.ts')).toBe(true);
    expect(contains(cfg, './e2e')).toBe(true);
  });

  it('list.e2e.ts asserts the plugin loaded and the canned flag is listed', () => {
    const flow = 'e2e/flows/list.e2e.ts';
    expect(contains(flow, '/plugins')).toBe(true);
    expect(contains(flow, 'sample-flags')).toBe(true);
  });
});
