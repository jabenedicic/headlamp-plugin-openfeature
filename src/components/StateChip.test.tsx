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
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// Stand in for the SDK StatusLabel so the chip renders without theme/redux context, while
// still exposing the `status` so the ENABLED-vs-muted distinction is observable.
vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  StatusLabel: ({ status, children }: { status: string; children: ReactNode }) => (
    <span data-testid="status-label" data-status={status}>
      {children}
    </span>
  ),
}));

import { StateChip } from './StateChip';

describe('StateChip', () => {
  it('renders an em-dash when state is absent', () => {
    render(<StateChip />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByTestId('status-label')).not.toBeInTheDocument();
  });

  it('renders ENABLED as a success StatusLabel', () => {
    render(<StateChip state="ENABLED" />);
    const label = screen.getByTestId('status-label');
    expect(label).toHaveAttribute('data-status', 'success');
    expect(label).toHaveTextContent('ENABLED');
  });

  it('renders DISABLED as a warning StatusLabel', () => {
    render(<StateChip state="DISABLED" />);
    const label = screen.getByTestId('status-label');
    expect(label).toHaveAttribute('data-status', 'warning');
    expect(label).toHaveTextContent('DISABLED');
  });

  it('renders an em-dash for a non-string state without crashing', () => {
    render(<StateChip state={{ nope: true } as unknown as string} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByTestId('status-label')).not.toBeInTheDocument();
  });
});
