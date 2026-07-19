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

// A per-flag one-click Enable/Disable control for a single flag inside a multi-flag
// FeatureFlag set, rendered beside that flag's StateChip on the detail view. Clicking it
// issues a scoped JSON merge patch (RFC 7386) that touches exactly one leaf —
// `spec.flagSpec.flags.<name>.state` — so every sibling flag and every other field of the
// target flag (variants, defaultVariant, targeting, metadata) is preserved. This is the
// simple, YAML-free path the PRD promised the application/QA personas; the native YAML
// editor stays the untouched escape hatch for everything else.
//
// One-click by design: no confirmation dialog (a flag flip is reversible and RBAC-gated,
// unlike Flux's heavyweight Suspend). The control is wrapped in AuthVisible on the `patch`
// verb so it resolves before first paint and renders nothing for a user who cannot patch.
//
// UX: a small labeled button (not an icon-only switch) sits beside the StateChip. The chip
// carries the status; the button carries the action and reads the OPPOSITE of the current
// state ("Disable" when enabled, "Enable" when disabled), so status and action never send
// mixed signals. Alignment/spacing against the chip is handled by the detail view's row.

import { AuthVisible } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Button } from '@mui/material';
import { useSnackbar } from 'notistack';
import { FeatureFlagClass } from '../k8s/resources';
import { isFlagEnabled, toggledState } from '../lib/flag-set';
import { isExternallyManaged } from '../lib/gitops-detector';
import type { FlagDefinition } from '../types/feature-flag';

/**
 * A live FeatureFlag KubeObject instance. Derived from our own `makeCustomResourceClass`
 * factory rather than the SDK's internal `KubeObject` type, which is not re-exported from
 * `@kinvolk/headlamp-plugin/lib` — reaching into SDK internals for it is exactly the
 * boundary violation the plugin forbids. As a `KubeObject` subclass it carries the raw
 * resource under `jsonData` and the instance `patch` method used below.
 */
export type FeatureFlagResource = InstanceType<typeof FeatureFlagClass>;

/** The scoped merge-patch body: exactly one flag's `state` leaf, nothing else. */
type FlagStatePatch = {
  spec: { flagSpec: { flags: Record<string, { state: 'ENABLED' | 'DISABLED' }> } };
};

interface FlagStateToggleProps {
  /** The live FeatureFlag KubeObject this flag belongs to; the patch target. */
  resource: FeatureFlagResource;
  /** The flag's key in `spec.flagSpec.flags` (may be a dotted name). */
  flagName: string;
  /** The flag definition, read only for its current `state`. */
  flag: FlagDefinition;
}

/**
 * Build the scoped merge patch for one flag's state. RFC 7386 matches object keys
 * literally, so a dotted flag name (`a.b.c`) is a safe key with no escaping and only that
 * flag's `state` changes — siblings and the flag's other fields are untouched.
 */
function stateMergePatch(flagName: string, nextState: 'ENABLED' | 'DISABLED'): FlagStatePatch {
  return { spec: { flagSpec: { flags: { [flagName]: { state: nextState } } } } };
}

/**
 * Issue the scoped patch through the SDK — never a hand-rolled request. Prefer the instance
 * method `resource.patch(body)` (it carries its own namespace/name); fall back to the proven
 * Flux static form `apiEndpoint.patch(body, namespace, name)` if a custom-resource instance
 * ever lacks the prototype method. Either way Headlamp sends `application/merge-patch+json`.
 */
function patchFlagState(
  resource: FeatureFlagResource,
  flagName: string,
  nextState: 'ENABLED' | 'DISABLED'
): Promise<unknown> {
  const body = stateMergePatch(flagName, nextState);
  if (typeof resource.patch === 'function') {
    return resource.patch(body as never);
  }
  // Static fallback (Flux idiom). The SDK types `apiEndpoint.patch` for JSON Patch
  // (`OpPatch[]`), but at runtime it sends `application/merge-patch+json` — the same merge
  // semantics as the instance method — so cast to the merge-patch shape we actually rely on.
  const mergePatch = FeatureFlagClass.apiEndpoint.patch as unknown as (
    body: FlagStatePatch,
    namespace: string | undefined,
    name: string | undefined
  ) => Promise<unknown>;
  return mergePatch(body, resource.jsonData?.metadata?.namespace, resource.jsonData?.metadata?.name);
}

/**
 * The presentational + behavioural core, split out from the auth wrapper so it is unit
 * testable without the async RBAC check. Renders the ActionButton, owns the click →
 * patch → snackbar flow, and holds no auth logic of its own.
 */
export function FlagStateToggleButton({ resource, flagName, flag }: FlagStateToggleProps) {
  const { enqueueSnackbar } = useSnackbar();
  const enabled = isFlagEnabled(flag.state);
  const nextState = toggledState(flag.state);

  function handleClick() {
    patchFlagState(resource, flagName, nextState)
      .then(() => {
        enqueueSnackbar(`Flag "${flagName}" ${nextState === 'ENABLED' ? 'enabled' : 'disabled'}`, {
          variant: 'success',
        });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        enqueueSnackbar(`Could not update flag "${flagName}": ${message}`, { variant: 'error' });
      });
  }

  return (
    <Button
      variant="outlined"
      size="small"
      color={enabled ? 'warning' : 'success'}
      onClick={handleClick}
      title={enabled ? `Disable flag "${flagName}"` : `Enable flag "${flagName}"`}
    >
      {enabled ? 'Disable' : 'Enable'}
    </Button>
  );
}

/**
 * The exported control: the toggle button gated by `AuthVisible` on the `patch` verb, so it
 * resolves before first interaction (no flash-enabled-then-hidden) and renders nothing when
 * the user cannot patch featureflags in this namespace.
 */
export default function FlagStateToggle({ resource, flagName, flag }: FlagStateToggleProps) {
  // GitOps read-only guard. A per-flag body control cannot be stripped by the details-view
  // header-actions processor (which only rewrites resource-level header actions), so an
  // externally-managed resource is enforced here: render nothing. The header processor
  // handles Edit/Delete; this handles the per-flag toggle. RBAC gating (below) is orthogonal.
  if (isExternallyManaged(resource)) {
    return null;
  }

  const namespace = resource.jsonData?.metadata?.namespace;
  return (
    <AuthVisible item={resource} authVerb="patch" namespace={namespace}>
      <FlagStateToggleButton resource={resource} flagName={flagName} flag={flag} />
    </AuthVisible>
  );
}
