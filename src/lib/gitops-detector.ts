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

// Pure detection of GitOps external management (ArgoCD / Flux) from a resource's
// annotations. Applies to every operator CRD, so it reads metadata generically and takes
// `unknown`. React-free, side-effect-free; all annotation access is narrowed here.
//
// Detection is deliberately conservative on the *keys* it trusts (the strong, controller-
// specific annotations) to avoid false positives from generic labels like
// `app.kubernetes.io/instance`, which Helm and others also set. But once a trusted signal is
// present, the resource is treated as managed (read-only) unless the editable override says
// otherwise — the fail-safe direction the PRD requires (FR31): never silently fight a
// self-healing controller.

import {
  ARGOCD_TRACKING_ID,
  EDITABLE_OVERRIDE,
  EDITABLE_OVERRIDE_VALUE,
  FLUX_HELM_NAME,
  FLUX_KUSTOMIZE_NAME,
} from '../constants/annotations';

/** The controller reconciling a managed resource, for the chip/tooltip copy. */
export type ManagingController = 'Flux' | 'Argo CD';

/** The result of an external-management check. */
export interface ExternalManagement {
  /** True when the resource is reconciled by a GitOps controller and not overridden. */
  managed: boolean;
  /** Which controller, when known — drives the chip tooltip. */
  controller?: ManagingController;
}

/** Minimal metadata shape we read; both a live KubeObject and a plain body expose it. */
interface WithMetadata {
  metadata?: { annotations?: Record<string, unknown> };
  jsonData?: { metadata?: { annotations?: Record<string, unknown> } };
}

/** Read a resource's annotations from a live KubeObject (`jsonData`) or a plain body. */
function getAnnotations(item: unknown): Record<string, unknown> {
  const withMeta = item as WithMetadata | null | undefined;
  const annotations = withMeta?.jsonData?.metadata?.annotations ?? withMeta?.metadata?.annotations;
  if (annotations === null || typeof annotations !== 'object' || Array.isArray(annotations)) {
    return {};
  }
  return annotations as Record<string, unknown>;
}

/** True when the annotation is present as a non-empty string (its value is not inspected). */
function has(annotations: Record<string, unknown>, key: string): boolean {
  const value = annotations[key];
  return typeof value === 'string' && value.length > 0;
}

/**
 * Classify a resource's external management. The editable override wins over any ownership
 * annotation; otherwise a strong Flux or Argo signal marks the resource managed.
 */
export function externalManagement(item: unknown): ExternalManagement {
  const annotations = getAnnotations(item);

  if (annotations[EDITABLE_OVERRIDE] === EDITABLE_OVERRIDE_VALUE) {
    return { managed: false };
  }
  if (has(annotations, FLUX_KUSTOMIZE_NAME) || has(annotations, FLUX_HELM_NAME)) {
    return { managed: true, controller: 'Flux' };
  }
  if (has(annotations, ARGOCD_TRACKING_ID)) {
    return { managed: true, controller: 'Argo CD' };
  }
  return { managed: false };
}

/** Convenience boolean for gating write controls. */
export function isExternallyManaged(item: unknown): boolean {
  return externalManagement(item).managed;
}
