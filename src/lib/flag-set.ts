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

// Pure logic over a FeatureFlag's flag SET. The CRD is named FeatureFlag but
// `spec.flagSpec.flags` is a MAP of flags, so a resource is a flag set and may hold
// zero, one, or many flags. Every summary here stays meaningful at any count — the
// original spec's "show an em-dash unless there is exactly one flag" rule blanked the
// richest rows, including the maintainer's real six-flag set.
//
// React-free, side-effect-free. All access to the untyped flags map goes through
// getFlags; nothing here reaches into spec.flagSpec.flags directly.

import { type FeatureFlag, type FlagDefinition, getFlags } from '../types/feature-flag';

/** How a flag set's State column should render. */
export type FlagSetState =
  /** No flags to summarise — render an em-dash. */
  | { kind: 'none' }
  /** Exactly one flag — render its state as a chip. */
  | { kind: 'single'; state: string }
  /** Many flags — render a count breakdown; no single chip can be honest. */
  | { kind: 'multi'; enabled: number; disabled: number };

/** A flag counts as enabled only when its state is exactly ENABLED, case-insensitively. */
function isEnabled(flag: FlagDefinition): boolean {
  return typeof flag.state === 'string' && flag.state.toUpperCase() === 'ENABLED';
}

/** Every flag in the set with its map key, sorted by name so renders are stable. */
export function listFlags(
  item: FeatureFlag | null | undefined
): Array<{ name: string; flag: FlagDefinition }> {
  return (
    Object.entries(getFlags(item))
      // A malformed watch-cache read can put a null (or otherwise non-object) value
      // behind an otherwise-valid key, e.g. `{flags: {a: null}}`. Drop those entries
      // rather than let a bogus flag reach downstream `flag.state` access and throw.
      .filter(([, value]) => typeof value === 'object' && value !== null && !Array.isArray(value))
      .map(([name, flag]) => ({ name, flag }))
      .sort((a, b) => a.name.localeCompare(b.name))
  );
}

/** Summarise the set's State so it reads correctly at zero, one, or many flags. */
export function summariseFlagSetState(item: FeatureFlag | null | undefined): FlagSetState {
  const flags = listFlags(item);
  if (flags.length === 0) {
    return { kind: 'none' };
  }
  if (flags.length === 1) {
    const state = flags[0].flag.state;
    return { kind: 'single', state: typeof state === 'string' ? state : '' };
  }
  const enabled = flags.filter(f => isEnabled(f.flag)).length;
  return { kind: 'multi', enabled, disabled: flags.length - enabled };
}

/**
 * The default variant, but only when the set holds exactly one flag. With many flags
 * there is no single default to show, and inventing one would be a lie.
 */
export function getSoleDefaultVariant(item: FeatureFlag | null | undefined): string | undefined {
  const flags = listFlags(item);
  if (flags.length !== 1) {
    return undefined;
  }
  const value = flags[0].flag.defaultVariant;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * A flag's description. It lives at `metadata.description` and nowhere else: the CRD's
 * per-flag schema defines no top-level `description` and sets no
 * x-kubernetes-preserve-unknown-fields, so the API server rejects a top-level one with
 * `strict decoding error: unknown field "spec.flagSpec.flags.<flag>.description"`.
 * Empty strings are treated as absent so the detail view omits the row rather than
 * rendering a blank.
 */
export function getFlagDescription(flag: FlagDefinition): string | undefined {
  const value = flag.metadata?.description;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
