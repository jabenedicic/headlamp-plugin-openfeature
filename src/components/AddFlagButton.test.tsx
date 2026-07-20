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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { enqueueSnackbar, staticPatch } = vi.hoisted(() => ({
  enqueueSnackbar: vi.fn(),
  staticPatch: vi.fn(),
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar }) }));
vi.mock('../k8s/resources', () => ({
  FeatureFlagClass: { apiEndpoint: { patch: staticPatch } },
}));
vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  AuthVisible: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import AddFlagButton from './AddFlagButton';
import type { FeatureFlagResource } from './FlagStateToggle';

function fakeResource(
  patch = vi.fn().mockResolvedValue({}),
  flags: Record<string, unknown> = {}
) {
  return {
    patch,
    jsonData: { metadata: { namespace: 'demo', name: 'flags' }, spec: { flagSpec: { flags } } },
  } as unknown as FeatureFlagResource;
}

beforeEach(() => {
  enqueueSnackbar.mockReset();
  staticPatch.mockReset();
});

describe('AddFlagButton', () => {
  it('adds a boolean-template flag as an additive patch', async () => {
    const patch = vi.fn().mockResolvedValue({});
    render(<AddFlagButton resource={fakeResource(patch)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add flag' }));
    fireEvent.change(screen.getByLabelText('Flag name'), { target: { value: 'new_flow' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch).toHaveBeenCalledWith({
      spec: {
        flagSpec: {
          flags: {
            new_flow: {
              state: 'ENABLED',
              defaultVariant: 'true',
              variants: { true: true, false: false },
            },
          },
        },
      },
    });
    expect(enqueueSnackbar).toHaveBeenCalledWith('Flag "new_flow" added', { variant: 'success' });
  });

  it('rejects a duplicate flag key before saving', () => {
    const patch = vi.fn();
    render(<AddFlagButton resource={fakeResource(patch, { existing: { state: 'ENABLED' } })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add flag' }));
    fireEvent.change(screen.getByLabelText('Flag name'), { target: { value: 'existing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(patch).not.toHaveBeenCalled();
    expect(screen.getByText(/already exists in this resource/)).toBeInTheDocument();
  });

  it('uses a dotted key literally in the additive patch', async () => {
    const patch = vi.fn().mockResolvedValue({});
    render(<AddFlagButton resource={fakeResource(patch)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add flag' }));
    fireEvent.change(screen.getByLabelText('Flag name'), { target: { value: 'team.area.flag' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(Object.keys(patch.mock.calls[0][0].spec.flagSpec.flags)).toEqual(['team.area.flag']);
  });

  it('renders nothing for an externally-managed resource', () => {
    const managed = {
      patch: vi.fn(),
      jsonData: {
        metadata: {
          namespace: 'demo',
          name: 'flags',
          annotations: { 'kustomize.toolkit.fluxcd.io/name': 'apps' },
        },
        spec: { flagSpec: { flags: {} } },
      },
    } as unknown as FeatureFlagResource;
    render(<AddFlagButton resource={managed} />);
    expect(screen.queryByRole('button', { name: 'Add flag' })).not.toBeInTheDocument();
  });
});
