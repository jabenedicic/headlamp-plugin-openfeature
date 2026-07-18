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

// Single source of truth for the plugin's sidebar and route registration. Centralised
// so registration and navigation can never desync on a typo.
//
// The parent entry is named for the IMPLEMENTATION (the operator) rather than
// "OpenFeature", which would wrongly imply the SDK/spec. React-free, side-effect-free.

/** Sidebar entry name for the parent that every CRD sub-menu hangs off. */
export const OPENFEATURE_SIDEBAR_PARENT = 'openfeature-operator';

/** Sidebar label for the parent entry. */
export const OPENFEATURE_SIDEBAR_LABEL = 'OpenFeature Operator';

/**
 * Iconify name string. MUST NOT be a @mui/icons-material component: those reference
 * @mui/material/utils.createSvgIcon, which is undefined in the plugin runtime and
 * crashes the whole plugin at import before it can register anything.
 */
export const OPENFEATURE_SIDEBAR_ICON = 'mdi:flag-outline';

/** Root path all CRD routes hang off. Headlamp prefixes /c/:cluster automatically. */
export const OPENFEATURE_ROUTE_BASE = '/openfeature';
