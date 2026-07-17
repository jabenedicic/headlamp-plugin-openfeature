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

import { expect, test } from '@playwright/test';

// The single NFR27 integration smoke flow: reach a real Headlamp server with
// the freshly-packaged plugin loaded, select the kind cluster, confirm the
// plugin registered, open its sidebar entry, and assert the canned FeatureFlag
// (e2e/fixtures/featureflag.yaml) is listed.
//
// NOTE: the real "OpenFeature Operator" sidebar is now registered (see
// src/index.tsx and src/crds/registerCrd.tsx), with a "Feature Flags"
// sub-entry replacing the retired Story 1.2 spike label
// ("Feature Flags (spike)"). Keep the selector below in sync with
// OPENFEATURE_SIDEBAR_LABEL / the FeatureFlag CRD's registered label if either
// changes.

// kind names the context `kind-<clusterName>`; keep this in sync with the
// cluster name in e2e/fixtures/kind-config.yaml and nightly-e2e.yml.
const KIND_CONTEXT = 'kind-headlamp-openfeature-e2e';

test('plugin sidebar entry appears and the canned flag is listed', async ({ page }) => {
  // Reach the server, landing directly on the kind cluster context.
  await page.goto(`/c/${KIND_CONTEXT}`);

  // Handle the auth-token prompt ONLY if Headlamp shows it. A kind client-cert
  // kubeconfig usually needs no token, so this step is defensive/conditional.
  const authHeading = page.locator('h1:has-text("Authentication")');
  if (await authHeading.isVisible().catch(() => false)) {
    const token = process.env.HEADLAMP_TEST_TOKEN;
    if (!token) {
      // Fail loudly rather than silently proceeding to an opaque later timeout.
      throw new Error(
        'Headlamp requested authentication but HEADLAMP_TEST_TOKEN is unset. ' +
          'A kind client-cert kubeconfig should not prompt — set the token env if it does.'
      );
    }
    await page.locator('#token').fill(token);
    await page.getByRole('button', { name: /authenticate/i }).click();
  }

  // Confirm the plugin actually loaded by asking the server directly. Headlamp
  // serves the loaded-plugin list at `/plugins` (a JSON array of loaded plugins,
  // each `{path,type,name}`; our plugin appears as `plugins/headlamp-openfeature`).
  // (`/plugins/list` is NOT an endpoint — it 404s; keep this in sync with
  // e2e/setup/start-headlamp.sh, which polls the same `/plugins` endpoint.)
  // Check shape-agnostically so it holds whether the entries are strings or objects.
  const res = await page.request.get('/plugins');
  expect(res.ok()).toBeTruthy();
  const plugins = await res.json();
  expect(JSON.stringify(plugins).toLowerCase()).toContain('openfeature');

  // Open the plugin's sidebar entry (real label — see NOTE above).
  await page.getByText('Feature Flags', { exact: false }).first().click();

  // Assert the canned flag is listed. Match the cell text directly (robust to
  // whatever table markup SimpleTable emits) with a generous timeout for a cold
  // kind cluster's first CRD list to arrive.
  await expect(page.getByText('sample-flags').first()).toBeVisible({ timeout: 30000 });
});
