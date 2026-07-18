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

// Top-level React class error boundary (NFR9). Catches render/lifecycle exceptions in
// its children, logs them to console.error, and renders a contained MUI fallback with a
// reload affordance — it never rethrows, so a crash in a plugin view stays contained to
// that view and leaves the Headlamp host and sibling trees unaffected. Theme tokens
// only (no raw hex/px); named MUI imports only; no dangerouslySetInnerHTML.

import { Box, Button, Typography } from '@mui/material';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Contain the failure: log for diagnostics, never rethrow.
    console.error('OpenFeature plugin view crashed and was contained:', error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Recover automatically when the children change after an error (e.g. a route/param
    // change reuses this boundary instance rather than remounting it) so the fallback is
    // not stuck until a full reload. If the new children throw too, getDerivedStateFromError
    // re-trips immediately — no retry loop, since the children reference is then unchanged.
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Box
          role="alert"
          sx={{ p: 3, m: 2, border: 1, borderColor: 'error.main', borderRadius: 1 }}
        >
          <Typography variant="h6" component="h2" sx={{ color: 'error.main', mb: 1 }}>
            Something went wrong
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            The OpenFeature view encountered an unexpected error and was stopped to protect the rest
            of Headlamp. Reloading may resolve the issue.
          </Typography>
          <Button variant="contained" color="primary" onClick={this.handleReload}>
            Reload
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
