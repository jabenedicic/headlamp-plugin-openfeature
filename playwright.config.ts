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

import { defineConfig, devices } from '@playwright/test';

// testMatch MUST be `*.e2e.ts` (never `*.spec.ts`/`*.test.ts`). `npm run test`
// runs Vitest with the SDK config, which sets no include/exclude and so falls
// back to the default `**/*.{test,spec}.ts` — a Playwright file with either of
// those suffixes would be swept up by Vitest and crash. Naming Playwright files
// `*.e2e.ts` keeps the two runners cleanly separated.
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  // The nightly harness can race the operator/webhook coming up; retry on CI.
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.HEADLAMP_TEST_URL || 'http://localhost:4466',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
