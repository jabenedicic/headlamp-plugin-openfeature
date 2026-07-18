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
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Bomb(): never {
  throw new Error('kaboom');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('contains a throwing child, renders the fallback, and leaves siblings unaffected', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <div>
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>
        <p>host sibling content</p>
      </div>
    );

    // Fallback UI is shown with a reload affordance.
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();

    // The sibling outside the boundary is untouched (containment).
    expect(screen.getByText('host sibling content')).toBeInTheDocument();

    // The exception was logged, not rethrown.
    expect(errorSpy).toHaveBeenCalled();
  });

  it('recovers from the fallback when the children change after an error', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const healthy: ReactElement = <p>recovered content</p>;

    const { rerender } = render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // A route/param change reuses the same boundary instance with fresh children.
    rerender(<ErrorBoundary>{healthy}</ErrorBoundary>);

    expect(screen.getByText('recovered content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    errorSpy.mockRestore();
  });

  it('renders its children unchanged when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>healthy child</p>
      </ErrorBoundary>
    );

    expect(screen.getByText('healthy child')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reloads the window when the reload affordance is clicked', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const reloadMock = vi.fn();
    const originalLocation = window.location;
    // jsdom's location.reload is not implemented; substitute a spy.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadMock },
    });

    try {
      render(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>
      );
      screen.getByRole('button', { name: 'Reload' }).click();
      expect(reloadMock).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
      errorSpy.mockRestore();
    }
  });
});
