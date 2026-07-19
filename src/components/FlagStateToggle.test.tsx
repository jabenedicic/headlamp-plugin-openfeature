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

// vi.mock factories are hoisted above the module body, so the spies they reference must be
// created via vi.hoisted (also hoisted) rather than as plain top-level consts.
const { enqueueSnackbar, staticPatch } = vi.hoisted(() => ({
  enqueueSnackbar: vi.fn(),
  staticPatch: vi.fn(),
}));

// The control renders a real MUI Button (which works in jsdom), so only AuthVisible needs
// a stand-in: render children unconditionally here; RBAC gating is verified live.
vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  AuthVisible: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// notistack's provider is mounted by the Headlamp host; expose the enqueue spy.
vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar }) }));

// The component references FeatureFlagClass only for the static fallback path; the tests
// drive the instance `patch`, so a light stub keeps the SDK out of jsdom.
vi.mock('../k8s/resources', () => ({
  FeatureFlagClass: { apiEndpoint: { patch: staticPatch } },
}));

import type { FlagDefinition } from '../types/feature-flag';
import FlagStateToggle, { type FeatureFlagResource, FlagStateToggleButton } from './FlagStateToggle';

/** Build a fake live KubeObject whose instance `patch` is a controllable spy. */
function fakeResource(patch: ReturnType<typeof vi.fn>, namespace = 'demo', name = 'flags') {
  return {
    patch,
    jsonData: { metadata: { namespace, name } },
  } as unknown as FeatureFlagResource;
}

beforeEach(() => {
  enqueueSnackbar.mockReset();
  staticPatch.mockReset();
});

describe('FlagStateToggleButton', () => {
  it('labels an ENABLED flag with the opposite action, "Disable"', () => {
    const flag: FlagDefinition = { state: 'ENABLED' };
    render(<FlagStateToggleButton resource={fakeResource(vi.fn())} flagName="a" flag={flag} />);
    expect(screen.getByRole('button', { name: 'Disable' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enable' })).not.toBeInTheDocument();
  });

  it('labels a DISABLED flag with the opposite action, "Enable"', () => {
    const flag: FlagDefinition = { state: 'DISABLED' };
    render(<FlagStateToggleButton resource={fakeResource(vi.fn())} flagName="a" flag={flag} />);
    expect(screen.getByRole('button', { name: 'Enable' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disable' })).not.toBeInTheDocument();
  });

  it('labels an absent state "Enable", making the state explicit on click', () => {
    render(<FlagStateToggleButton resource={fakeResource(vi.fn())} flagName="a" flag={{}} />);
    expect(screen.getByRole('button', { name: 'Enable' })).toBeInTheDocument();
  });

  it('patches only the target flag\'s state leaf when disabling an enabled flag', async () => {
    const patch = vi.fn().mockResolvedValue({});
    render(
      <FlagStateToggleButton resource={fakeResource(patch)} flagName="a" flag={{ state: 'ENABLED' }} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Disable' }));
    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith({
      spec: { flagSpec: { flags: { a: { state: 'DISABLED' } } } },
    });
  });

  it('uses a dotted flag name literally as the merge-patch key', async () => {
    const patch = vi.fn().mockResolvedValue({});
    render(
      <FlagStateToggleButton
        resource={fakeResource(patch)}
        flagName="payments.checkout.new_flow"
        flag={{ state: 'DISABLED' }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));
    expect(patch).toHaveBeenCalledWith({
      spec: { flagSpec: { flags: { 'payments.checkout.new_flow': { state: 'ENABLED' } } } },
    });
  });

  it('writes the canonical uppercase enum from a lowercase incoming state', () => {
    const patch = vi.fn().mockResolvedValue({});
    render(
      <FlagStateToggleButton resource={fakeResource(patch)} flagName="a" flag={{ state: 'enabled' }} />
    );
    // lowercase "enabled" is recognised as enabled → button reads Disable → writes DISABLED
    fireEvent.click(screen.getByRole('button', { name: 'Disable' }));
    expect(patch).toHaveBeenCalledWith({
      spec: { flagSpec: { flags: { a: { state: 'DISABLED' } } } },
    });
  });

  it('shows a success snackbar naming the flag and new state', async () => {
    const patch = vi.fn().mockResolvedValue({});
    render(
      <FlagStateToggleButton resource={fakeResource(patch)} flagName="a" flag={{ state: 'ENABLED' }} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Disable' }));
    await waitFor(() =>
      expect(enqueueSnackbar).toHaveBeenCalledWith('Flag "a" disabled', { variant: 'success' })
    );
  });

  it('shows an error snackbar with the server message on a rejected patch', async () => {
    const patch = vi.fn().mockRejectedValue(new Error('409 conflict'));
    render(
      <FlagStateToggleButton resource={fakeResource(patch)} flagName="a" flag={{ state: 'DISABLED' }} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));
    await waitFor(() =>
      expect(enqueueSnackbar).toHaveBeenCalledWith('Could not update flag "a": 409 conflict', {
        variant: 'error',
      })
    );
  });

  it('falls back to the static apiEndpoint.patch when the instance lacks patch', async () => {
    staticPatch.mockResolvedValue({});
    const resource = {
      jsonData: { metadata: { namespace: 'demo', name: 'flags' } },
    } as unknown as FeatureFlagResource;
    render(<FlagStateToggleButton resource={resource} flagName="a" flag={{ state: 'ENABLED' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Disable' }));
    expect(staticPatch).toHaveBeenCalledWith(
      { spec: { flagSpec: { flags: { a: { state: 'DISABLED' } } } } },
      'demo',
      'flags'
    );
  });
});

describe('FlagStateToggle (default export)', () => {
  it('renders the toggle button through the AuthVisible wrapper', () => {
    render(
      <FlagStateToggle resource={fakeResource(vi.fn())} flagName="a" flag={{ state: 'ENABLED' }} />
    );
    expect(screen.getByRole('button', { name: 'Disable' })).toBeInTheDocument();
  });

  it('renders nothing for an externally-managed (GitOps) resource', () => {
    const managed = {
      patch: vi.fn(),
      jsonData: {
        metadata: {
          namespace: 'demo',
          name: 'flags',
          annotations: { 'kustomize.toolkit.fluxcd.io/name': 'apps' },
        },
      },
    } as unknown as FeatureFlagResource;
    render(<FlagStateToggle resource={managed} flagName="a" flag={{ state: 'ENABLED' }} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
