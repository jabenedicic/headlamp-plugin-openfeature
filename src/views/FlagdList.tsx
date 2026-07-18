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

// Flagd list. spec.featureFlagSource is required and names a FeatureFlagSource in the
// same namespace; the detail view turns it into a link (Task 10).

import {
  CreateResourceButton,
  ResourceListView,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { FlagdClass } from '../k8s/resources';

const EM_DASH = '—';

function getSpec(item: unknown): Record<string, unknown> {
  const spec = (item as { jsonData?: { spec?: unknown } })?.jsonData?.spec;
  return spec && typeof spec === 'object' ? (spec as Record<string, unknown>) : {};
}

/** Native list of Flagd resources. */
export function FlagdList() {
  return (
    <ResourceListView
      title="flagd Instances"
      resourceClass={FlagdClass}
      headerProps={{
        titleSideActions: [<CreateResourceButton resourceClass={FlagdClass} key="create-flagd" />],
      }}
      columns={[
        'name',
        'namespace',
        {
          id: 'source',
          label: 'Source',
          getValue: (item: unknown) => (getSpec(item).featureFlagSource as string) ?? EM_DASH,
        },
        {
          id: 'replicas',
          label: 'Replicas',
          getValue: (item: unknown) => (getSpec(item).replicas as number) ?? EM_DASH,
        },
        {
          id: 'service-type',
          label: 'Service Type',
          getValue: (item: unknown) => (getSpec(item).serviceType as string) ?? EM_DASH,
        },
        'age',
      ]}
    />
  );
}
