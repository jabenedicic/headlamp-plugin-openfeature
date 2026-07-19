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

/**
 * A flag's state counts as enabled only when it is exactly ENABLED, case-insensitively.
 * The single definition of "on", shared by the list summary, the chip, and the toggle so
 * every surface agrees. Accepts `unknown` because the wire value is untyped: anything that
 * is not an ENABLED string (absent, empty, DISABLED, a non-string) is not enabled.
 */
export function isFlagEnabled(state: unknown): boolean {
  return typeof state === 'string' && state.toUpperCase() === 'ENABLED';
}

/**
 * The canonical state to write when toggling a flag: an enabled flag becomes DISABLED, and
 * anything else (DISABLED, absent, or a malformed value) becomes ENABLED — making the state
 * explicit. Always returns the uppercase enum regardless of the incoming casing.
 */
export function toggledState(state: unknown): 'ENABLED' | 'DISABLED' {
  return isFlagEnabled(state) ? 'DISABLED' : 'ENABLED';
}

/** A flag counts as enabled only when its state is exactly ENABLED, case-insensitively. */
function isEnabled(flag: FlagDefinition): boolean {
  return isFlagEnabled(flag.state);
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
 * Parse a variant value typed into the form. Variant values are polymorphic
 * (boolean/number/string/object), so JSON-parse the raw field and fall back to the raw
 * string when it is not valid JSON — the write-side mirror of the detail view's lossless
 * display. A variant NAME of "true"/"false"/"5" is never parsed (only values pass through
 * here), so a name that looks like a boolean or number is never coerced.
 */
export function parseVariantValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** The set of per-flag fields the form manages. Targeting is deliberately excluded. */
export interface FlagEdits {
  /** New description; `null` clears it (RFC 7386 delete of `metadata.description`). */
  description: string | null;
  /** The variant name to serve by default. */
  defaultVariant: string;
  /** The final kept/edited/added variants (name → typed value). */
  variants: Record<string, unknown>;
  /** Variant keys present before but removed in the form; sent as `null` to delete. */
  removedVariantNames: string[];
}

/** The scoped merge-patch body for one flag's form-managed fields (never `targeting`). */
export interface FlagMergePatch {
  spec: {
    flagSpec: {
      flags: Record<
        string,
        {
          metadata: { description: string | null };
          defaultVariant: string;
          variants: Record<string, unknown>;
        }
      >;
    };
  };
}

/**
 * Assemble the scoped merge patch for one flag from the form's edits. RFC 7386 matches keys
 * literally (dotted flag names are safe) and merges recursively, so this touches only the
 * named flag: description goes to `metadata.description` (preserving other metadata keys),
 * removed variants are emitted as `null` to delete them, and `targeting` is never included
 * so opaque JSONLogic rules survive untouched.
 */
export function buildFlagMergePatch(flagName: string, edits: FlagEdits): FlagMergePatch {
  const variants: Record<string, unknown> = { ...edits.variants };
  for (const name of edits.removedVariantNames) {
    variants[name] = null;
  }
  return {
    spec: {
      flagSpec: {
        flags: {
          [flagName]: {
            metadata: { description: edits.description },
            defaultVariant: edits.defaultVariant,
            variants,
          },
        },
      },
    },
  };
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
