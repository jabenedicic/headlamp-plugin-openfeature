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

// GitOps read-only guard for the detail view. A single global header-actions processor
// strips the native Edit and Delete actions from any externally-managed OpenFeature
// resource and adds a "GitOps managed" chip in their place (the Flux presentation pattern).
//
// The processor is global to Headlamp, so it first narrows to our API group and leaves
// every other resource's actions untouched. Per-flag body controls (the state toggle, the
// edit form) cannot be reached by this processor — those consult the detector directly.

import {
  DetailsViewDefaultHeaderActions,
  registerDetailsViewHeaderActionsProcessor,
} from '@kinvolk/headlamp-plugin/lib';
import { ManagedChip } from '../components/ManagedChip';
import { OPENFEATURE_GROUP } from '../constants/rbac';
import { isExternallyManaged } from '../lib/gitops-detector';

/** True when the resource belongs to one of the operator's CRDs (`core.openfeature.dev`). */
function isOpenFeatureResource(resource: unknown): boolean {
  const apiVersion = (resource as { jsonData?: { apiVersion?: unknown } } | null | undefined)
    ?.jsonData?.apiVersion;
  return typeof apiVersion === 'string' && apiVersion.startsWith(`${OPENFEATURE_GROUP}/`);
}

/**
 * Register the guard. Idempotent-by-intent: call once at plugin load. For a managed
 * OpenFeature resource it removes Edit/Delete and prepends the managed chip; everything else
 * (other resources, or our own unmanaged ones) passes through unchanged.
 */
export function registerManagedResourceGuard(): void {
  registerDetailsViewHeaderActionsProcessor((resource, actions) => {
    if (!isOpenFeatureResource(resource) || !isExternallyManaged(resource)) {
      return actions;
    }
    const withoutWriteActions = actions.filter(
      action =>
        action.id !== DetailsViewDefaultHeaderActions.EDIT &&
        action.id !== DetailsViewDefaultHeaderActions.DELETE
    );
    return [
      { id: 'openfeature-gitops-managed', action: <ManagedChip resource={resource} /> },
      ...withoutWriteActions,
    ];
  });
}
