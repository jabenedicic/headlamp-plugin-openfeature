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

// A small "GitOps managed" chip shown on externally-managed resources — in the detail
// header (beside the stripped Edit/Delete actions) and in the list "Managed by" column.
// The tooltip names the controller and explains why write controls are absent, so the
// read-only state never looks like a bug. Renders nothing for an unmanaged resource.

import { Chip, Tooltip } from '@mui/material';
import { externalManagement } from '../lib/gitops-detector';

/** The chip, or null when the resource is not externally managed. */
export function ManagedChip({ resource }: { resource: unknown }) {
  const { managed, controller } = externalManagement(resource);
  if (!managed) {
    return null;
  }
  const who = controller ?? 'a GitOps controller';
  return (
    <Tooltip
      title={`Managed by ${who}. Edit through Git; changes made here would be reverted on the next reconcile.`}
    >
      <Chip label="GitOps managed" size="small" color="info" variant="outlined" />
    </Tooltip>
  );
}
