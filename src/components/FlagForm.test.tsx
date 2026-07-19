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

import type { FlagDefinition } from '../types/feature-flag';
import FlagEditButton, { FlagForm } from './FlagForm';
import type { FeatureFlagResource } from './FlagStateToggle';

function fakeResource(patch = vi.fn().mockResolvedValue({})) {
  return {
    patch,
    jsonData: { metadata: { namespace: 'demo', name: 'flags' } },
  } as unknown as FeatureFlagResource;
}

const baseFlag: FlagDefinition = {
  state: 'ENABLED',
  defaultVariant: 'on',
  variants: { on: true, off: false },
  metadata: { description: 'why it exists' },
};

/** Read the flag entry from the last patch call's merge body. */
function patchedFlag(patch: ReturnType<typeof vi.fn>, name = 'checkout') {
  return patch.mock.calls[0][0].spec.flagSpec.flags[name];
}

beforeEach(() => {
  enqueueSnackbar.mockReset();
  staticPatch.mockReset();
});

describe('FlagForm', () => {
  it('prefills the description and one row per existing variant', () => {
    render(
      <FlagForm resource={fakeResource()} flagName="checkout" flag={baseFlag} open onClose={vi.fn()} />
    );
    expect(screen.getByLabelText('Description')).toHaveValue('why it exists');
    const names = screen.getAllByLabelText('Name').map(input => (input as HTMLInputElement).value);
    expect(names).toEqual(['on', 'off']);
  });

  it('patches an edited description', async () => {
    const patch = vi.fn().mockResolvedValue({});
    render(
      <FlagForm resource={fakeResource(patch)} flagName="checkout" flag={baseFlag} open onClose={vi.fn()} />
    );
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'new reason' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patchedFlag(patch).metadata).toEqual({ description: 'new reason' });
  });

  it('clears the description with null when emptied', async () => {
    const patch = vi.fn().mockResolvedValue({});
    render(
      <FlagForm resource={fakeResource(patch)} flagName="checkout" flag={baseFlag} open onClose={vi.fn()} />
    );
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patchedFlag(patch).metadata).toEqual({ description: null });
  });

  it('sends null for a removed variant', async () => {
    const patch = vi.fn().mockResolvedValue({});
    render(
      <FlagForm resource={fakeResource(patch)} flagName="checkout" flag={baseFlag} open onClose={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove variant off' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patchedFlag(patch).variants).toEqual({ on: true, off: null });
  });

  it('adds a variant with a lossless number value', async () => {
    const patch = vi.fn().mockResolvedValue({});
    render(
      <FlagForm resource={fakeResource(patch)} flagName="checkout" flag={baseFlag} open onClose={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add variant' }));
    const names = screen.getAllByLabelText('Name');
    const values = screen.getAllByLabelText('Value (JSON)');
    fireEvent.change(names[names.length - 1], { target: { value: 'size' } });
    fireEvent.change(values[values.length - 1], { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patchedFlag(patch).variants.size).toBe(5);
    expect(typeof patchedFlag(patch).variants.size).toBe('number');
  });

  it('moves the default to another variant', async () => {
    const patch = vi.fn().mockResolvedValue({});
    render(
      <FlagForm resource={fakeResource(patch)} flagName="checkout" flag={baseFlag} open onClose={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Default variant off' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patchedFlag(patch).defaultVariant).toBe('off');
  });

  it('blocks a save whose default names no current variant, without patching', () => {
    const patch = vi.fn().mockResolvedValue({});
    render(
      <FlagForm resource={fakeResource(patch)} flagName="checkout" flag={baseFlag} open onClose={vi.fn()} />
    );
    // Remove the "on" variant that is currently the default.
    fireEvent.click(screen.getByRole('button', { name: 'Remove variant on' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(patch).not.toHaveBeenCalled();
    expect(screen.getByText(/is not one of the variants/)).toBeInTheDocument();
  });

  it('shows an error snackbar and stays open on a rejected patch', async () => {
    const onClose = vi.fn();
    const patch = vi.fn().mockRejectedValue(new Error('422 invalid'));
    render(
      <FlagForm resource={fakeResource(patch)} flagName="checkout" flag={baseFlag} open onClose={onClose} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(enqueueSnackbar).toHaveBeenCalledWith('Could not update flag "checkout": 422 invalid', {
        variant: 'error',
      })
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows a read-only targeting preview and never patches targeting', async () => {
    const patch = vi.fn().mockResolvedValue({});
    const flag: FlagDefinition = { ...baseFlag, targeting: { if: [{ '==': [1, 1] }, 'on'] } };
    render(
      <FlagForm resource={fakeResource(patch)} flagName="checkout" flag={flag} open onClose={vi.fn()} />
    );
    expect(screen.getByText('Targeting (read-only)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patchedFlag(patch)).not.toHaveProperty('targeting');
  });
});

describe('FlagEditButton', () => {
  it('renders the Edit flag trigger for an editable resource', () => {
    render(<FlagEditButton resource={fakeResource()} flagName="checkout" flag={baseFlag} />);
    expect(screen.getByRole('button', { name: 'Edit flag' })).toBeInTheDocument();
  });

  it('mounts the form only while open, so it re-reads the flag on each open', () => {
    // Regression: a permanently-mounted form freezes its initial variants at first render,
    // so a removal after a prior save computes against a stale baseline and drops the null.
    render(<FlagEditButton resource={fakeResource()} flagName="checkout" flag={baseFlag} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit flag' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders nothing for an externally-managed resource', () => {
    const managed = {
      patch: vi.fn(),
      jsonData: {
        metadata: {
          namespace: 'demo',
          name: 'flags',
          annotations: { 'argocd.argoproj.io/tracking-id': 'x' },
        },
      },
    } as unknown as FeatureFlagResource;
    render(<FlagEditButton resource={managed} flagName="checkout" flag={baseFlag} />);
    expect(screen.queryByRole('button', { name: 'Edit flag' })).not.toBeInTheDocument();
  });
});
