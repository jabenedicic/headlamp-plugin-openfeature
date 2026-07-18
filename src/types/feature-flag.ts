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

// Curated types for the `core.openfeature.dev/v1beta1` FeatureFlag custom resource,
// plus the pure `getFlags` accessor over `spec.flagSpec.flags`. The `flags` map is
// untyped on the wire, so it is narrowed in exactly one place (getFlags) and no other
// module reaches into that path directly. React-free and side-effect-free.

/**
 * A single flagd-v0 flag definition inside `spec.flagSpec.flags`. Variant values are
 * polymorphic (booleans, strings, numbers, objects), so `variants` stays a
 * `Record<string, unknown>`; `targeting` is opaque JSONLogic and is left `unknown`.
 */
export interface FlagDefinition {
  state?: string;
  defaultVariant?: string;
  variants?: Record<string, unknown>;
  targeting?: unknown;
  // Per-flag metadata block (flagd schema `baseFlag.metadata`): string-keyed with
  // string/number/boolean values. A flag's description lives here (`metadata.description`),
  // not as a top-level field — the flagd `baseFlag` deliberately keeps title/description
  // off the flag object.
  metadata?: Record<string, string | number | boolean>;
  [key: string]: unknown;
}

/** The raw resource body: `spec.flagSpec.flags` plus the usual metadata. */
interface FeatureFlagBody {
  apiVersion?: string;
  kind?: string;
  metadata?: {
    name?: string;
    namespace?: string;
    [key: string]: unknown;
  };
  spec?: {
    flagSpec?: {
      flags?: unknown;
    };
    [key: string]: unknown;
  };
}

/**
 * Minimal curated shape of a FeatureFlag (`core.openfeature.dev/v1beta1`).
 *
 * Accepts both forms the plugin actually sees: a live Headlamp `KubeObject` — which holds
 * the raw resource under `jsonData` and exposes `spec` only through getters that the plain
 * object literal below does not — and a plain resource body (used by unit tests and any
 * caller that already unwrapped `jsonData`). `getFlags` reads from whichever is present.
 */
export interface FeatureFlag extends FeatureFlagBody {
  /** Present on a live KubeObject; the canonical raw resource. */
  jsonData?: FeatureFlagBody;
}

/**
 * Pure accessor over `spec.flagSpec.flags`. The wire payload is untyped, so the map is
 * narrowed here (and only here) into `Record<string, FlagDefinition>`. Returns `{}` for
 * a missing/empty resource or a non-object `flags` value; never throws.
 *
 * A live Headlamp `KubeObject` keeps the raw resource under `jsonData`, so read that when
 * present and fall back to the item itself for an already-unwrapped body. Reading `item.spec`
 * alone returns nothing for a real KubeObject, which silently renders every flag set as empty.
 */
export function getFlags(item: FeatureFlag | null | undefined): Record<string, FlagDefinition> {
  const body = item?.jsonData ?? item;
  const flags = body?.spec?.flagSpec?.flags;
  if (flags === null || typeof flags !== 'object' || Array.isArray(flags)) {
    return {};
  }
  return flags as Record<string, FlagDefinition>;
}
