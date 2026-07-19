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

import { describe, expect, it } from 'vitest';
import type { FeatureFlag } from '../types/feature-flag';
import {
  buildFlagMergePatch,
  getFlagDescription,
  getSoleDefaultVariant,
  isFlagEnabled,
  listFlags,
  parseVariantValue,
  summariseFlagSetState,
  toggledState,
} from './flag-set';

function flagSet(flags: unknown): FeatureFlag {
  return { spec: { flagSpec: { flags } } };
}

/** A live Headlamp KubeObject keeps the raw resource under `jsonData`, not on `.spec`. */
function kubeObjectFlagSet(flags: unknown): FeatureFlag {
  return { jsonData: { spec: { flagSpec: { flags } } } };
}

describe('flag-set logic reads a live KubeObject (jsonData), not just a plain body', () => {
  // Regression: the native ResourceListView passes a KubeObject whose data lives under
  // `jsonData`. Reading `item.spec` alone made every flag set render as empty (Flags 0,
  // State em-dash) even for multi-flag resources — caught only by a live render.
  it('summarises flags carried under jsonData', () => {
    const item = kubeObjectFlagSet({
      a: { state: 'ENABLED', defaultVariant: 'on', variants: {} },
      b: { state: 'DISABLED', defaultVariant: 'off', variants: {} },
    });
    expect(summariseFlagSetState(item)).toEqual({ kind: 'multi', enabled: 1, disabled: 1 });
    expect(listFlags(item).map(f => f.name)).toEqual(['a', 'b']);
  });

  it('shows the sole default variant from a single-flag jsonData resource', () => {
    const item = kubeObjectFlagSet({
      only: { state: 'ENABLED', defaultVariant: 'blue', variants: {} },
    });
    expect(getSoleDefaultVariant(item)).toBe('blue');
  });
});

describe('summariseFlagSetState', () => {
  it.each([
    ['no flags map at all', {}, { kind: 'none' }],
    ['an empty flags map', flagSet({}), { kind: 'none' }],
    ['a non-object flags value', flagSet('nonsense'), { kind: 'none' }],
    [
      'a single enabled flag',
      flagSet({ a: { state: 'ENABLED', defaultVariant: 'off', variants: {} } }),
      { kind: 'single', state: 'ENABLED' },
    ],
    [
      'a single disabled flag',
      flagSet({ a: { state: 'DISABLED', defaultVariant: 'off', variants: {} } }),
      { kind: 'single', state: 'DISABLED' },
    ],
    [
      'a multi-flag set',
      flagSet({
        a: { state: 'ENABLED', defaultVariant: 'off', variants: {} },
        b: { state: 'ENABLED', defaultVariant: 'off', variants: {} },
        c: { state: 'DISABLED', defaultVariant: 'off', variants: {} },
      }),
      { kind: 'multi', enabled: 2, disabled: 1 },
    ],
    // `typeof null === 'object'`, so getFlags' null check exists for exactly this case:
    // without it, a null flags map would be handed downstream as if it were a map.
    ['a null flags map', flagSet(null), { kind: 'none' }],
    // Likewise `typeof [] === 'object'`, so getFlags also excludes arrays explicitly.
    ['an array flags value', flagSet([]), { kind: 'none' }],
    [
      'a single flag missing state entirely',
      flagSet({ a: { defaultVariant: 'off', variants: {} } }),
      { kind: 'single', state: '' },
    ],
    [
      'a null value behind an otherwise-valid key, alongside one valid flag',
      flagSet({
        a: null,
        b: { state: 'ENABLED', defaultVariant: 'on', variants: {} },
      }),
      { kind: 'single', state: 'ENABLED' },
    ],
    [
      'a lowercase enabled state counted correctly in a multi-flag summary',
      flagSet({
        a: { state: 'enabled', defaultVariant: 'off', variants: {} },
        b: { state: 'DISABLED', defaultVariant: 'off', variants: {} },
      }),
      { kind: 'multi', enabled: 1, disabled: 1 },
    ],
  ])('summarises %s', (_label, item, expected) => {
    expect(summariseFlagSetState(item as FeatureFlag)).toEqual(expected);
  });
});

describe('getSoleDefaultVariant', () => {
  it('returns the default variant of a single-flag set', () => {
    const item = flagSet({ a: { state: 'ENABLED', defaultVariant: 'off', variants: {} } });
    expect(getSoleDefaultVariant(item)).toBe('off');
  });

  it('returns undefined for a multi-flag set, because there is no single default to show', () => {
    const item = flagSet({
      a: { state: 'ENABLED', defaultVariant: 'off', variants: {} },
      b: { state: 'ENABLED', defaultVariant: 'on', variants: {} },
    });
    expect(getSoleDefaultVariant(item)).toBeUndefined();
  });

  it('returns undefined for an empty set', () => {
    expect(getSoleDefaultVariant(flagSet({}))).toBeUndefined();
  });

  it('preserves a variant name that looks like a boolean', () => {
    // Real-world: variants {"true": true, "false": false} with defaultVariant "true".
    // The variant NAME is the string "true" and must not be coerced.
    const item = flagSet({
      a: { state: 'ENABLED', defaultVariant: 'true', variants: { true: true, false: false } },
    });
    expect(getSoleDefaultVariant(item)).toBe('true');
  });

  it('treats an empty-string defaultVariant as absent', () => {
    const item = flagSet({ a: { state: 'ENABLED', defaultVariant: '', variants: {} } });
    expect(getSoleDefaultVariant(item)).toBeUndefined();
  });

  it('returns undefined when defaultVariant is absent entirely', () => {
    const item = flagSet({ a: { state: 'ENABLED', variants: {} } });
    expect(getSoleDefaultVariant(item)).toBeUndefined();
  });
});

describe('listFlags', () => {
  it('returns every flag with its name, sorted by name for a stable render', () => {
    const item = flagSet({
      zulu: { state: 'ENABLED', defaultVariant: 'off', variants: {} },
      alpha: { state: 'DISABLED', defaultVariant: 'on', variants: {} },
    });
    expect(listFlags(item).map(f => f.name)).toEqual(['alpha', 'zulu']);
  });

  it('returns an empty array when there are no flags', () => {
    expect(listFlags(flagSet({}))).toEqual([]);
  });

  it('returns an empty array when the flags map itself is null', () => {
    expect(listFlags(flagSet(null))).toEqual([]);
  });

  it('returns an empty array when the flags value is an array', () => {
    expect(listFlags(flagSet([]))).toEqual([]);
  });

  it('drops a null value behind an otherwise-valid key instead of throwing', () => {
    const item = flagSet({
      a: null,
      b: { state: 'ENABLED', defaultVariant: 'on', variants: {} },
    });
    const flags = listFlags(item);
    expect(flags.map(f => f.name)).toEqual(['b']);
    expect(flags[0].flag.state).toBe('ENABLED');
  });
});

describe('isFlagEnabled', () => {
  it.each([
    ['the canonical ENABLED', 'ENABLED', true],
    ['a lowercase enabled', 'enabled', true],
    ['a mixed-case Enabled', 'Enabled', true],
    ['DISABLED', 'DISABLED', false],
    ['an unrelated string', 'PENDING', false],
    ['an empty string', '', false],
    ['an absent state', undefined, false],
    ['a null state', null, false],
    ['a non-string state', 42, false],
    ['an object state', { state: 'ENABLED' }, false],
  ])('treats %s as %s', (_label, state, expected) => {
    expect(isFlagEnabled(state)).toBe(expected);
  });
});

describe('toggledState', () => {
  it.each([
    ['ENABLED flips to DISABLED', 'ENABLED', 'DISABLED'],
    ['a lowercase enabled flips to DISABLED', 'enabled', 'DISABLED'],
    ['DISABLED flips to ENABLED', 'DISABLED', 'ENABLED'],
    ['an unrelated string flips to ENABLED', 'PENDING', 'ENABLED'],
    ['an empty string flips to ENABLED', '', 'ENABLED'],
    ['an absent state flips to ENABLED, making it explicit', undefined, 'ENABLED'],
    ['a non-string state flips to ENABLED', 42, 'ENABLED'],
  ])('%s', (_label, state, expected) => {
    expect(toggledState(state)).toBe(expected);
  });

  it('always writes the canonical uppercase enum', () => {
    expect(toggledState('enabled')).toBe('DISABLED');
    expect(toggledState('disabled')).toBe('ENABLED');
  });
});

describe('parseVariantValue', () => {
  it.each([
    ['a boolean true', 'true', true],
    ['a boolean false', 'false', false],
    ['a number', '5', 5],
    ['a quoted string', '"on"', 'on'],
    ['an object', '{"a":1}', { a: 1 }],
    ['an array', '[1,2]', [1, 2]],
    ['a bare (invalid-JSON) string, kept verbatim', 'high-contrast', 'high-contrast'],
    ['an empty string, kept verbatim', '', ''],
  ])('parses %s', (_label, raw, expected) => {
    expect(parseVariantValue(raw)).toEqual(expected);
  });
});

describe('buildFlagMergePatch', () => {
  it('assembles a scoped body with metadata, default, and variants', () => {
    expect(
      buildFlagMergePatch('a', {
        description: 'why',
        defaultVariant: 'on',
        variants: { on: true, off: false },
        removedVariantNames: [],
      })
    ).toEqual({
      spec: {
        flagSpec: {
          flags: {
            a: {
              metadata: { description: 'why' },
              defaultVariant: 'on',
              variants: { on: true, off: false },
            },
          },
        },
      },
    });
  });

  it('emits null for a removed variant so the server deletes it', () => {
    const patch = buildFlagMergePatch('a', {
      description: null,
      defaultVariant: 'on',
      variants: { on: true },
      removedVariantNames: ['off'],
    });
    expect(patch.spec.flagSpec.flags.a.variants).toEqual({ on: true, off: null });
  });

  it('sends null description to clear it', () => {
    const patch = buildFlagMergePatch('a', {
      description: null,
      defaultVariant: 'on',
      variants: { on: true },
      removedVariantNames: [],
    });
    expect(patch.spec.flagSpec.flags.a.metadata).toEqual({ description: null });
  });

  it('never includes targeting in the patch body', () => {
    const patch = buildFlagMergePatch('a', {
      description: 'x',
      defaultVariant: 'on',
      variants: { on: true },
      removedVariantNames: [],
    });
    expect(patch.spec.flagSpec.flags.a).not.toHaveProperty('targeting');
  });

  it('uses a dotted flag name literally as the merge-patch key', () => {
    const patch = buildFlagMergePatch('payments.checkout.new_flow', {
      description: 'x',
      defaultVariant: 'on',
      variants: { on: true },
      removedVariantNames: [],
    });
    expect(Object.keys(patch.spec.flagSpec.flags)).toEqual(['payments.checkout.new_flow']);
  });
});

describe('getFlagDescription', () => {
  it('reads the description from metadata, which is where the CRD schema allows it', () => {
    expect(getFlagDescription({ metadata: { description: 'why it exists' } })).toBe(
      'why it exists'
    );
  });

  it('returns undefined when metadata is absent', () => {
    expect(getFlagDescription({})).toBeUndefined();
  });

  it('treats an empty description as absent, so the detail view omits the row', () => {
    expect(getFlagDescription({ metadata: { description: '' } })).toBeUndefined();
  });

  it('ignores a non-string description', () => {
    expect(getFlagDescription({ metadata: { description: 42 } })).toBeUndefined();
  });
});
