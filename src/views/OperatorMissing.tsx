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

// The plugin's ONLY genuinely custom state. Loading, empty, generic errors and partial
// 403s are all handled by the native list and detail components; the plugin adds nothing
// for those.
//
// A 404 on the CRD is not an error — it means the OpenFeature Operator is not installed,
// which deserves an explanation and a way forward rather than an empty table or a raw
// error. This is the Flux `NotSupported` pattern.
//
// A 403 is deliberately NOT treated as missing: it means RBAC denied the read, and the
// operator may well be installed.

import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Link, Typography } from '@mui/material';
import { OPERATOR_INSTALL_DOCS_URL } from '../constants/links';

/** Anything with an optional HTTP status — the shape the SDK's ApiError exposes. */
interface MaybeApiError {
  status?: number;
}

/** True only for a 404: the CRD is absent, so the operator is not installed. */
export function isOperatorMissing(error: MaybeApiError | null | undefined): boolean {
  return error?.status === 404;
}

/** Full-surface panel shown instead of a list when the operator's CRDs are absent. */
export function OperatorMissing() {
  return (
    <SectionBox title="OpenFeature Operator not detected">
      <Typography variant="body1" gutterBottom>
        The <code>core.openfeature.dev</code> custom resource definitions are not present on this
        cluster, so there are no OpenFeature resources to show.
      </Typography>
      <Typography variant="body1">
        Install the OpenFeature Operator to manage feature flags from Headlamp. See the{' '}
        <Link href={OPERATOR_INSTALL_DOCS_URL} target="_blank" rel="noopener noreferrer">
          installation documentation
        </Link>
        .
      </Typography>
    </SectionBox>
  );
}
