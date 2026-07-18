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

// Flagd detail. spec.featureFlagSource is a required same-namespace name reference, so it
// renders as a link to that FeatureFlagSource — the one piece of domain value the native
// components cannot supply for free.
//
// The link resolves because the FeatureFlagSource detail route is registered under the
// kind 'FeatureFlagSource' (see crds/registerCrd.tsx).

import {
  DetailsGrid,
  Link,
  NameValueTable,
  SectionBox,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { useParams } from 'react-router-dom';
import { FlagdClass } from '../k8s/resources';

function getSpec(item: unknown): Record<string, unknown> {
  const spec = (item as { jsonData?: { spec?: unknown } })?.jsonData?.spec;
  return spec && typeof spec === 'object' ? (spec as Record<string, unknown>) : {};
}

/** flagd deployment settings, with the source rendered as a link. */
function FlagdSections({ item, namespace }: { item: unknown; namespace: string }) {
  const spec = getSpec(item);
  const source = spec.featureFlagSource as string | undefined;
  const ingress = spec.ingress as Record<string, unknown> | undefined;
  return (
    <>
      <SectionBox title="Configuration">
        <NameValueTable
          rows={[
            {
              name: 'Feature flag source',
              value: source ? (
                <Link routeName="FeatureFlagSource" params={{ namespace, name: source }}>
                  {source}
                </Link>
              ) : (
                '—'
              ),
            },
            { name: 'Replicas', value: String(spec.replicas ?? '—') },
            { name: 'Service type', value: (spec.serviceType as string) ?? '—' },
            { name: 'Service account', value: (spec.serviceAccountName as string) ?? '—' },
          ]}
        />
      </SectionBox>
      {ingress && (
        <SectionBox title="Ingress">
          <NameValueTable
            rows={[
              { name: 'Enabled', value: String(ingress.enabled ?? '—') },
              { name: 'Class name', value: (ingress.ingressClassName as string) ?? '—' },
              {
                name: 'Hosts',
                value: Array.isArray(ingress.hosts) ? (ingress.hosts as string[]).join(', ') : '—',
              },
            ]}
          />
        </SectionBox>
      )}
    </>
  );
}

/** Native detail view for one Flagd resource. */
export function FlagdDetail() {
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  return (
    <DetailsGrid
      resourceType={FlagdClass}
      name={name}
      namespace={namespace}
      withEvents
      extraSections={(item: unknown) => [
        <FlagdSections item={item} namespace={namespace} key="flagd" />,
      ]}
    />
  );
}
