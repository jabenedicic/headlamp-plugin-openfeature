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

// FeatureFlag list. The native ResourceListView supplies the namespace filter, search,
// sort, pagination, column chooser, and the loading/empty/error states — the plugin adds
// none of that.
//
// Columns summarise a flag SET, because spec.flagSpec.flags is a map. State stays honest
// at any flag count: one flag renders a chip, many render a breakdown. Default is shown
// only for a single-flag set, since many flags have no single default.

import {
  CreateResourceButton,
  ResourceListView,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import CreateFeatureFlagButton from '../components/CreateFeatureFlagButton';
import { ManagedChip } from '../components/ManagedChip';
import { StateChip } from '../components/StateChip';
import { FeatureFlagClass } from '../k8s/resources';
import { getSoleDefaultVariant, listFlags, summariseFlagSetState } from '../lib/flag-set';
import { externalManagement } from '../lib/gitops-detector';

const EM_DASH = '—';

/** Render a flag set's State column so it reads correctly at zero, one, or many flags. */
function StateCell({ item }: { item: unknown }) {
  const summary = summariseFlagSetState(item as never);
  if (summary.kind === 'none') {
    return <>{EM_DASH}</>;
  }
  if (summary.kind === 'single') {
    return <StateChip state={summary.state} />;
  }
  return (
    <>
      {summary.enabled} enabled · {summary.disabled} disabled
    </>
  );
}

/** Native list of FeatureFlag resources. */
export function FeatureFlagList() {
  return (
    <ResourceListView
      title="Feature Flags"
      resourceClass={FeatureFlagClass}
      headerProps={{
        titleSideActions: [
          <CreateFeatureFlagButton key="guided-create-feature-flag" />,
          <CreateResourceButton resourceClass={FeatureFlagClass} key="create-feature-flag" />,
        ],
      }}
      columns={[
        'name',
        'namespace',
        {
          id: 'flags',
          label: 'Flags',
          getValue: (item: unknown) => listFlags(item as never).length,
        },
        {
          id: 'state',
          label: 'State',
          getValue: (item: unknown) => {
            const summary = summariseFlagSetState(item as never);
            return summary.kind === 'single' ? summary.state : summary.kind;
          },
          render: (item: unknown) => <StateCell item={item} />,
        },
        {
          id: 'default',
          label: 'Default',
          getValue: (item: unknown) => getSoleDefaultVariant(item as never) ?? EM_DASH,
        },
        {
          id: 'managed',
          label: 'Managed by',
          getValue: (item: unknown) => externalManagement(item).controller ?? EM_DASH,
          render: (item: unknown) =>
            externalManagement(item).managed ? <ManagedChip resource={item} /> : <>{EM_DASH}</>,
        },
        'age',
      ]}
    />
  );
}
