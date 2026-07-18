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

// Single source of truth for static external documentation links the plugin surfaces as
// remediation. Centralised so the target lives in exactly one place and no literal URL is
// embedded in JSX. These are documentation links only (rendered as user-clicked anchors),
// never runtime egress (NFR14).

/** OpenFeature Operator install documentation — the remediation target for the operator-missing state. */
export const OPERATOR_INSTALL_DOCS_URL =
  'https://github.com/open-feature/open-feature-operator/blob/main/docs/installation.md';
