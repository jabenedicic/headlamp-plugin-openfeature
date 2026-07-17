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

// The four production resource classes for the OpenFeature Operator's CRDs. Each is
// the plugin's only LIST+WATCH data source for its kind: the static `.useList()` and
// `.useGet()` drive the native ResourceListView and DetailsGrid through the SDK, so
// there is no hand-rolled fetch or polling anywhere.
//
// makeCustomResourceClass returns a KubeObjectClass, which is what the native
// components accept directly — no KubeObject subclass is needed.
//
// NOTE: a class's `detailsRoute` is its `kind`, and the native 'name' column links via
// createRouteURL(kind). The detail route registered for each of these MUST be named
// after the kind or every row links nowhere. See crds/registerCrd.tsx.

import { K8s } from '@kinvolk/headlamp-plugin/lib';
import {
  FEATURE_FLAG_RESOURCE,
  FEATURE_FLAG_SOURCE_RESOURCE,
  FLAGD_RESOURCE,
  IN_PROCESS_CONFIGURATION_RESOURCE,
  OPENFEATURE_GROUP,
  OPENFEATURE_VERSION,
} from '../constants/rbac';

function makeOpenFeatureClass(kind: string, pluralName: string, singularName: string) {
  return K8s.crd.makeCustomResourceClass({
    apiInfo: [{ group: OPENFEATURE_GROUP, version: OPENFEATURE_VERSION }],
    kind,
    pluralName,
    singularName,
    isNamespaced: true,
  });
}

/**
 * The shared type of every resource class below. Derived from our own factory rather than
 * imported: the SDK's KubeObjectClass is not re-exported from
 * `@kinvolk/headlamp-plugin/lib`, and reaching into SDK internals to get at it is exactly
 * the mistake that crashed the previous list view on every Headlamp version.
 */
export type OpenFeatureResourceClass = ReturnType<typeof makeOpenFeatureClass>;

/** `FeatureFlag` — a *set* of flags; `spec.flagSpec.flags` is a map, not a single flag. */
export const FeatureFlagClass = makeOpenFeatureClass('FeatureFlag', FEATURE_FLAG_RESOURCE, 'featureflag');

/** `FeatureFlagSource` — where flagd reads flags from (file, s3, kubernetes, grpc, ...). */
export const FeatureFlagSourceClass = makeOpenFeatureClass(
  'FeatureFlagSource',
  FEATURE_FLAG_SOURCE_RESOURCE,
  'featureflagsource'
);

/** `Flagd` — a standalone flagd deployment fed by a FeatureFlagSource. */
export const FlagdClass = makeOpenFeatureClass('Flagd', FLAGD_RESOURCE, 'flagd');

/** `InProcessConfiguration` — in-process evaluation config injected into workloads. */
export const InProcessConfigurationClass = makeOpenFeatureClass(
  'InProcessConfiguration',
  IN_PROCESS_CONFIGURATION_RESOURCE,
  'inprocessconfiguration'
);
