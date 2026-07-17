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

// FeatureFlagSource detail: the sources table plus the sidecar/flagd settings that are
// actually configured in practice.

import { DetailsGrid, NameValueTable, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { useParams } from 'react-router-dom';
import { FeatureFlagSourceClass } from '../k8s/resources';

function getSpec(item: unknown): Record<string, unknown> {
  const spec = (item as { jsonData?: { spec?: unknown } })?.jsonData?.spec;
  return spec && typeof spec === 'object' ? (spec as Record<string, unknown>) : {};
}

/** Sources table plus env vars. */
function SourceSections({ item }: { item: unknown }) {
  const spec = getSpec(item);
  const sources = Array.isArray(spec.sources) ? (spec.sources as Array<Record<string, unknown>>) : [];
  const envVars = Array.isArray(spec.envVars) ? (spec.envVars as Array<Record<string, unknown>>) : [];
  return (
    <>
      <SectionBox title="Sources">
        {sources.length === 0 ? (
          <NameValueTable rows={[{ name: 'Sources', value: 'No sources defined.' }]} />
        ) : (
          <NameValueTable
            rows={sources.map((s, i) => ({
              name: (s.provider as string) ?? `Source ${i + 1}`,
              value: (s.source as string) ?? JSON.stringify(s),
            }))}
          />
        )}
      </SectionBox>
      <SectionBox title="Configuration">
        <NameValueTable
          rows={[
            { name: 'Env var prefix', value: (spec.envVarPrefix as string) ?? '—' },
            { name: 'Log format', value: (spec.logFormat as string) ?? '—' },
            { name: 'Probes enabled', value: String(spec.probesEnabled ?? '—') },
            { name: 'OTel collector URI', value: (spec.otelCollectorUri as string) ?? '—' },
            { name: 'Default sync provider', value: (spec.defaultSyncProvider as string) ?? '—' },
            { name: 'Evaluator', value: (spec.evaluator as string) ?? '—' },
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

/** Native detail view for one FeatureFlagSource resource. */
export function FeatureFlagSourceDetail() {
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  return (
    <DetailsGrid
      resourceType={FeatureFlagSourceClass}
      name={name}
      namespace={namespace}
      withEvents
      extraSections={(item: unknown) => [<SourceSections item={item} key="sources" />]}
    />
  );
}
