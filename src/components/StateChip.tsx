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

// The single source of truth for rendering a flag's state, shared by the list and detail
// views so both surfaces render state identically. Both states render as a Headlamp
// StatusLabel chip so they read with equal weight in the list: ENABLED → success (green);
// any other non-empty string (i.e. DISABLED) → warning (amber). Warning, not error: a flag
// that is intentionally off is not a failure, so it must not wear the red error styling —
// but it should still be a first-class chip rather than muted text that disappears next to
// ENABLED. Absent or a non-string wire value → em-dash. Only a non-empty string ever reaches
// `.toUpperCase()`, so a malformed wire value never throws.

import { StatusLabel } from '@kinvolk/headlamp-plugin/lib/CommonComponents';

/** Render a flag's State: em-dash when absent/non-string, success chip for ENABLED, warning chip otherwise. */
export function StateChip({ state }: { state?: unknown }) {
  if (typeof state !== 'string' || state.length === 0) {
    return <>—</>;
  }
  const status = state.toUpperCase() === 'ENABLED' ? 'success' : 'warning';
  return <StatusLabel status={status}>{state}</StatusLabel>;
}
