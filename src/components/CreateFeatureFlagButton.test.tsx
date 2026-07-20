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

const { enqueueSnackbar, post } = vi.hoisted(() => ({
  enqueueSnackbar: vi.fn(),
  post: vi.fn(),
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar }) }));
vi.mock('../k8s/resources', () => ({
  FeatureFlagClass: { apiEndpoint: { post } },
}));
vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  AuthVisible: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import CreateFeatureFlagButton from './CreateFeatureFlagButton';

beforeEach(() => {
  enqueueSnackbar.mockReset();
  post.mockReset();
});

function openAndFill(name: string, namespace = 'demo') {
  fireEvent.click(screen.getByRole('button', { name: 'New feature flag' }));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('Namespace'), { target: { value: namespace } });
}

describe('CreateFeatureFlagButton', () => {
  it('POSTs a complete single-flag CR from the boolean template', async () => {
    post.mockResolvedValue({});
    render(<CreateFeatureFlagButton />);
    openAndFill('my-flag');
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post).toHaveBeenCalledWith({
      apiVersion: 'core.openfeature.dev/v1beta1',
      kind: 'FeatureFlag',
      metadata: { name: 'my-flag', namespace: 'demo' },
      spec: {
        flagSpec: {
          flags: {
            'my-flag': {
              state: 'ENABLED',
              defaultVariant: 'true',
              variants: { true: true, false: false },
            },
          },
        },
      },
    });
    expect(enqueueSnackbar).toHaveBeenCalledWith('FeatureFlag "my-flag" created', {
      variant: 'success',
    });
  });

  it('blocks an invalid RFC1123 name before POSTing', () => {
    render(<CreateFeatureFlagButton />);
    openAndFill('Invalid Name');
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText(/Name must be a lowercase RFC 1123 label/)).toBeInTheDocument();
  });

  it('surfaces a server error and keeps the dialog open', async () => {
    post.mockRejectedValue(new Error('409 already exists'));
    render(<CreateFeatureFlagButton />);
    openAndFill('dupe');
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() =>
      expect(enqueueSnackbar).toHaveBeenCalledWith('Could not create "dupe": 409 already exists', {
        variant: 'error',
      })
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
