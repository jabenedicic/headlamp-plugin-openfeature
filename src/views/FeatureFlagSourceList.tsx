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

// FeatureFlagSource list. `sources` is the only required spec field; port and evaluator
// are left unset in practice, so provider and the source URI are what identify a source.

import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { FeatureFlagSourceClass } from '../k8s/resources';

const EM_DASH = '—';

interface SourceEntry {
  source?: string;
  provider?: string;
}

/** `spec.sources` is an array on the wire; narrow it in one place. */
function getSources(item: unknown): SourceEntry[] {
  const sources = (item as { jsonData?: { spec?: { sources?: unknown } } })?.jsonData?.spec?.sources;
  return Array.isArray(sources) ? (sources as SourceEntry[]) : [];
}

/** Native list of FeatureFlagSource resources. */
export function FeatureFlagSourceList() {
  return (
    <ResourceListView
      title="Feature Flag Sources"
      resourceClass={FeatureFlagSourceClass}
      columns={[
        'name',
        'namespace',
        {
          id: 'sources',
          label: 'Sources',
          getValue: (item: unknown) => getSources(item).length,
        },
        {
          id: 'provider',
          label: 'Provider',
          getValue: (item: unknown) => {
            const providers = Array.from(
              new Set(getSources(item).map(s => s.provider).filter(Boolean))
            );
            return providers.length > 0 ? providers.join(', ') : EM_DASH;
          },
        },
        {
          id: 'source-uri',
          label: 'Source URI',
          getValue: (item: unknown) => {
            const sources = getSources(item);
            return sources.length === 1 ? (sources[0].source ?? EM_DASH) : EM_DASH;
          },
        },
        'age',
      ]}
    />
  );
}
