/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import '@testing-library/jest-dom/vitest';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// Stand in for the SDK StatusLabel exactly as StateChip.test.tsx does, so the chip renders
// without redux/theme context wiring from the SDK — while still exposing `status`.
vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  StatusLabel: ({ status, children }: { status: string; children: ReactNode }) => (
    <span data-testid="status-label" data-status={status}>
      {children}
    </span>
  ),
}));

import { StateChip } from './StateChip';

// Mount the chip under a real host ThemeProvider in the given palette mode — the plugin carries no
// theme of its own and simply consumes whatever theme the host injects.
const renderUnder = (mode: 'light' | 'dark', state: string) =>
  render(
    <ThemeProvider theme={createTheme({ palette: { mode } })}>
      <StateChip state={state} />
    </ThemeProvider>
  );

describe('StateChip host-theme rendering (FR33)', () => {
  // DISABLED delegates to the SDK's host-theme-aware StatusLabel (status="warning"), so the state
  // carries no plugin-owned colour at all: there is no inline `style` colour to leak, and the amber
  // is resolved from the host palette by the SDK component. This is what keeps FR33 satisfied — the
  // plugin never hardcodes a state colour — while giving DISABLED equal chip weight to ENABLED.
  it.each(['light', 'dark'] as const)(
    'renders the DISABLED state via the host-theme-aware StatusLabel (no plugin-owned colour) under a %s host theme',
    mode => {
      renderUnder(mode, 'DISABLED');
      const label = screen.getByTestId('status-label');
      expect(label).toHaveAttribute('data-status', 'warning');
      expect(label.getAttribute('style') ?? '').not.toMatch(/color/);
    }
  );

  // The ENABLED branch delegates to the SDK's host-theme-aware StatusLabel; render it under both
  // modes so that branch (and the SDK component boundary) is exercised, not just the warning path.
  it.each(['light', 'dark'] as const)(
    'renders the ENABLED state via the host-theme-aware StatusLabel under a %s host theme',
    mode => {
      renderUnder(mode, 'ENABLED');
      expect(screen.getByTestId('status-label')).toHaveAttribute('data-status', 'success');
    }
  );

  it('produces mode-invariant structural output — identical text and tag under both host theme modes', () => {
    const light = renderUnder('light', 'DISABLED');
    const lightText = screen.getByText('DISABLED');
    const lightSnapshot = { text: lightText.textContent, tag: lightText.tagName };
    light.unmount();

    renderUnder('dark', 'DISABLED');
    const darkText = screen.getByText('DISABLED');
    expect({ text: darkText.textContent, tag: darkText.tagName }).toEqual(lightSnapshot);
  });
});
