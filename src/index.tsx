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

// Plugin entrypoint. Registers the "OpenFeature Operator" parent sidebar entry and one
// sub-entry plus list/detail routes per operator CRD. The plugin owns no router, history,
// cluster selector, namespace selector, or theme toggle — all inherited from the host.

import { registerSidebarEntry } from '@kinvolk/headlamp-plugin/lib';
import {
  FEATURE_FLAG_RESOURCE,
  FEATURE_FLAG_SOURCE_RESOURCE,
  FLAGD_RESOURCE,
  IN_PROCESS_CONFIGURATION_RESOURCE,
} from './constants/rbac';
import {
  OPENFEATURE_ROUTE_BASE,
  OPENFEATURE_SIDEBAR_ICON,
  OPENFEATURE_SIDEBAR_LABEL,
  OPENFEATURE_SIDEBAR_PARENT,
} from './constants/routes';
import { registerCrd } from './crds/registerCrd';
import {
  FeatureFlagClass,
  FeatureFlagSourceClass,
  FlagdClass,
  InProcessConfigurationClass,
} from './k8s/resources';
import { FeatureFlagDetail } from './views/FeatureFlagDetail';
import { FeatureFlagList } from './views/FeatureFlagList';
import { FeatureFlagSourceDetail } from './views/FeatureFlagSourceDetail';
import { FeatureFlagSourceList } from './views/FeatureFlagSourceList';
import { FlagdDetail } from './views/FlagdDetail';
import { FlagdList } from './views/FlagdList';
import { InProcessConfigurationDetail } from './views/InProcessConfigurationDetail';
import { InProcessConfigurationList } from './views/InProcessConfigurationList';

registerSidebarEntry({
  parent: null,
  name: OPENFEATURE_SIDEBAR_PARENT,
  label: OPENFEATURE_SIDEBAR_LABEL,
  url: `${OPENFEATURE_ROUTE_BASE}/${FEATURE_FLAG_RESOURCE}`,
  icon: OPENFEATURE_SIDEBAR_ICON,
});

registerCrd({
  resourceClass: FeatureFlagClass,
  plural: FEATURE_FLAG_RESOURCE,
  label: 'Feature Flags',
  List: FeatureFlagList,
  Detail: FeatureFlagDetail,
});

registerCrd({
  resourceClass: FeatureFlagSourceClass,
  plural: FEATURE_FLAG_SOURCE_RESOURCE,
  label: 'Feature Flag Sources',
  List: FeatureFlagSourceList,
  Detail: FeatureFlagSourceDetail,
});

registerCrd({
  resourceClass: FlagdClass,
  plural: FLAGD_RESOURCE,
  label: 'flagd Instances',
  List: FlagdList,
  Detail: FlagdDetail,
});

registerCrd({
  resourceClass: InProcessConfigurationClass,
  plural: IN_PROCESS_CONFIGURATION_RESOURCE,
  label: 'In-Process Configurations',
  List: InProcessConfigurationList,
  Detail: InProcessConfigurationDetail,
});
