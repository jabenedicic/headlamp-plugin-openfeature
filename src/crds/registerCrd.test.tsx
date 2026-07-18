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

// Regression coverage for ListOrOperatorMissing's proactive-probe state machine (see the
// comment above it in registerCrd.tsx): Loader while probing, OperatorMissing on a 404,
// List on 200 or any non-404 error (e.g. an RBAC 403). Only ApiProxy.request is mocked;
// OperatorMissing renders for real. CommonComponents is mocked minimally because SectionBox
// throws outside of Headlamp's theme provider (it reads theme internals jsdom doesn't have).

import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListOrOperatorMissing } from './registerCrd';

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));

vi.mock('@kinvolk/headlamp-plugin/lib', () => ({
  ApiProxy: { request: requestMock },
  registerRoute: vi.fn(),
  registerSidebarEntry: vi.fn(),
}));

vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  Loader: ({ title }: { title?: string }) => <div>LOADER: {title}</div>,
  SectionBox: ({ title, children }: { title?: string; children?: ReactNode }) => (
    <div>
      <div>{title}</div>
      {children}
    </div>
  ),
}));

function List() {
  return <div>LIST_RENDERED</div>;
}

const resourceClass = { kind: 'FeatureFlag' } as never;
const OPERATOR_MISSING_HEADING = 'OpenFeature Operator not detected';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ListOrOperatorMissing', () => {
  it('renders the list once the probe confirms the operator is present (200)', async () => {
    requestMock.mockResolvedValue({});

    render(<ListOrOperatorMissing resourceClass={resourceClass} plural="featureflags" List={List} />);

    await waitFor(() => expect(screen.getByText('LIST_RENDERED')).toBeInTheDocument());
    expect(screen.queryByText(OPERATOR_MISSING_HEADING)).not.toBeInTheDocument();
  });

  it('renders the OperatorMissing panel when the probe 404s', async () => {
    requestMock.mockRejectedValue({ status: 404 });

    render(<ListOrOperatorMissing resourceClass={resourceClass} plural="featureflags" List={List} />);

    await waitFor(() => expect(screen.getByText(OPERATOR_MISSING_HEADING)).toBeInTheDocument());
    expect(screen.queryByText('LIST_RENDERED')).not.toBeInTheDocument();
  });

  it('renders the list (not OperatorMissing) on a non-404 error such as an RBAC 403', async () => {
    requestMock.mockRejectedValue({ status: 403 });

    render(<ListOrOperatorMissing resourceClass={resourceClass} plural="featureflags" List={List} />);

    await waitFor(() => expect(screen.getByText('LIST_RENDERED')).toBeInTheDocument());
    expect(screen.queryByText(OPERATOR_MISSING_HEADING)).not.toBeInTheDocument();
  });
});
