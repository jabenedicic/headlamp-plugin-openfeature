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

// FeatureFlag detail. DetailsGrid supplies the native metadata grid, Events, loading and
// not-found; this adds one section per flag.
//
// EVERY flag in the set renders, not just the first: spec.flagSpec.flags is a map and
// multi-flag sets are common. Variant values are rendered via JSON.stringify so booleans,
// numbers, strings and objects all round-trip losslessly and a variant NAME that looks
// like a boolean (variants {"true": true}) is never coerced.

import {
  DetailsGrid,
  NameValueTable,
  SectionBox,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { useParams } from 'react-router-dom';
import { StateChip } from '../components/StateChip';
import { FeatureFlagClass } from '../k8s/resources';
import { getFlagDescription, listFlags } from '../lib/flag-set';
import type { FlagDefinition } from '../types/feature-flag';

/** Render one flag's variants as a name/value table; values are shown as JSON. */
function VariantRows({ flag }: { flag: FlagDefinition }) {
  const variants = flag.variants;
  if (!variants || typeof variants !== 'object') {
    return <NameValueTable rows={[{ name: 'Variants', value: 'No variants.' }]} />;
  }
  const entries = Object.entries(variants as Record<string, unknown>);
  if (entries.length === 0) {
    return <NameValueTable rows={[{ name: 'Variants', value: 'No variants.' }]} />;
  }
  return (
    <NameValueTable
      rows={entries.map(([name, value]) => ({ name, value: JSON.stringify(value) }))}
    />
  );
}

/** Does this flag have targeting rules? An empty object counts as none. */
function hasTargeting(flag: FlagDefinition): boolean {
  const targeting = flag.targeting;
  return (
    !!targeting && typeof targeting === 'object' && Object.keys(targeting as object).length > 0
  );
}

/** One section per flag in the set. */
function FlagSections({ item }: { item: unknown }) {
  const flags = listFlags(item as never);
  if (flags.length === 0) {
    return (
      <SectionBox title="Flags">
        <NameValueTable rows={[{ name: 'Flags', value: 'This resource defines no flags.' }]} />
      </SectionBox>
    );
  }
  return (
    <>
      {flags.map(({ name, flag }) => {
        const description = getFlagDescription(flag);
        return (
          <SectionBox title={name} key={name}>
            <NameValueTable
              rows={[
                { name: 'State', value: <StateChip state={flag.state} /> },
                ...(description ? [{ name: 'Description', value: description }] : []),
                { name: 'Default variant', value: flag.defaultVariant ?? '—' },
              ]}
            />
            <VariantRows flag={flag} />
            <NameValueTable
              rows={[
                {
                  name: 'Targeting',
                  value: hasTargeting(flag)
                    ? JSON.stringify(flag.targeting, null, 2)
                    : 'No targeting rules.',
                },
              ]}
            />
          </SectionBox>
        );
      })}
    </>
  );
}

/** Native detail view for one FeatureFlag resource. */
export function FeatureFlagDetail() {
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  return (
    <DetailsGrid
      resourceType={FeatureFlagClass}
      name={name}
      namespace={namespace}
      withEvents
      extraSections={(item: unknown) => [<FlagSections item={item} key="flags" />]}
    />
  );
}
