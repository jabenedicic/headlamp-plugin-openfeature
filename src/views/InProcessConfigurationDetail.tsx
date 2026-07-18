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

// InProcessConfiguration detail: connection, cache, and the injected env vars. Selector
// lives here rather than in a list column because it is left unset in practice.

import {
  DetailsGrid,
  NameValueTable,
  SectionBox,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { useParams } from 'react-router-dom';
import { InProcessConfigurationClass } from '../k8s/resources';

function getSpec(item: unknown): Record<string, unknown> {
  const spec = (item as { jsonData?: { spec?: unknown } })?.jsonData?.spec;
  return spec && typeof spec === 'object' ? (spec as Record<string, unknown>) : {};
}

/** Connection, cache, and env var sections. */
function InProcessSections({ item }: { item: unknown }) {
  const spec = getSpec(item);
  const envVars = Array.isArray(spec.envVars)
    ? (spec.envVars as Array<Record<string, unknown>>)
    : [];
  return (
    <>
      <SectionBox title="Connection">
        <NameValueTable
          rows={[
            { name: 'Host', value: (spec.host as string) ?? '—' },
            { name: 'Port', value: String(spec.port ?? '—') },
            { name: 'TLS', value: String(spec.tls ?? '—') },
            { name: 'Socket path', value: (spec.socketPath as string) ?? '—' },
            { name: 'Selector', value: (spec.selector as string) ?? '—' },
            {
              name: 'Offline flag source path',
              value: (spec.offlineFlagSourcePath as string) ?? '—',
            },
          ]}
        />
      </SectionBox>
      <SectionBox title="Cache">
        <NameValueTable
          rows={[
            { name: 'Cache', value: (spec.cache as string) ?? '—' },
            { name: 'Max size', value: String(spec.cacheMaxSize ?? '—') },
            { name: 'Env var prefix', value: (spec.envVarPrefix as string) ?? '—' },
          ]}
        />
      </SectionBox>
      {envVars.length > 0 && (
        <SectionBox title="Environment variables">
          <NameValueTable
            rows={envVars.map(e => ({
              name: (e.name as string) ?? '—',
              value: (e.value as string) ?? '',
            }))}
          />
        </SectionBox>
      )}
    </>
  );
}

/** Native detail view for one InProcessConfiguration resource. */
export function InProcessConfigurationDetail() {
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  return (
    <DetailsGrid
      resourceType={InProcessConfigurationClass}
      name={name}
      namespace={namespace}
      withEvents
      extraSections={(item: unknown) => [<InProcessSections item={item} key="in-process" />]}
    />
  );
}
