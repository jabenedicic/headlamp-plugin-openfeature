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

// Pinned identifiers for the four core.openfeature.dev CRDs and the RBAC verbs used
// with AuthVisible. Named consts so a typo cannot silently target the wrong resource
// or break an access check. React-free, side-effect-free.

/** Kubernetes verbs the plugin checks or performs. */
export type RbacVerb = 'get' | 'list' | 'create' | 'update' | 'delete';

/** All verbs the plugin may check. */
export const RBAC_VERBS: readonly RbacVerb[] = ['get', 'list', 'create', 'update', 'delete'];

/** API group shared by every OpenFeature Operator CRD. */
export const OPENFEATURE_GROUP = 'core.openfeature.dev';

/** API version shared by every OpenFeature Operator CRD (operator chart 0.9.2). */
export const OPENFEATURE_VERSION = 'v1beta1';

/** Plural resource names, as used in API paths and RBAC rules. */
export const FEATURE_FLAG_RESOURCE = 'featureflags';
export const FEATURE_FLAG_SOURCE_RESOURCE = 'featureflagsources';
export const FLAGD_RESOURCE = 'flagds';
export const IN_PROCESS_CONFIGURATION_RESOURCE = 'inprocessconfigurations';
