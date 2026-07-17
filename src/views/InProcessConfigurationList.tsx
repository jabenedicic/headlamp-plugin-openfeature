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

// InProcessConfiguration list. Host, port and env vars are what get set in practice;
// selector is left unset, so it lives on the detail view rather than in a column.

import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { InProcessConfigurationClass } from '../k8s/resources';

const EM_DASH = '—';

function getSpec(item: unknown): Record<string, unknown> {
  const spec = (item as { jsonData?: { spec?: unknown } })?.jsonData?.spec;
  return spec && typeof spec === 'object' ? (spec as Record<string, unknown>) : {};
}

/** Native list of InProcessConfiguration resources. */
export function InProcessConfigurationList() {
  return (
    <ResourceListView
      title="In-Process Configurations"
      resourceClass={InProcessConfigurationClass}
      columns={[
        'name',
        'namespace',
        {
          id: 'host',
          label: 'Host',
          getValue: (item: unknown) => (getSpec(item).host as string) ?? EM_DASH,
        },
        {
          id: 'port',
          label: 'Port',
          getValue: (item: unknown) => (getSpec(item).port as number) ?? EM_DASH,
        },
        {
          id: 'env-vars',
          label: 'Env Vars',
          getValue: (item: unknown) => {
            const envVars = getSpec(item).envVars;
            return Array.isArray(envVars) ? envVars.length : 0;
          },
        },
        'age',
      ]}
    />
  );
}
