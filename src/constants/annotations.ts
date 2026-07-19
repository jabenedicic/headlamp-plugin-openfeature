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

// Pinned annotation/label keys used to detect GitOps external management. Centralised so a
// typo cannot silently disable detection (a resource would then appear editable when it is
// actually reconciled by a controller — the exact failure mode we must avoid). React-free,
// side-effect-free. Detection logic lives in the pure `lib/gitops-detector.ts`.

/** ArgoCD writes a tracking id onto every resource it manages. The strong Argo signal. */
export const ARGOCD_TRACKING_ID = 'argocd.argoproj.io/tracking-id';

/**
 * Flux Kustomize controller stamps the owning Kustomization's name/namespace. Presence of
 * the name annotation is the strong Flux signal.
 */
export const FLUX_KUSTOMIZE_NAME = 'kustomize.toolkit.fluxcd.io/name';
export const FLUX_KUSTOMIZE_NAMESPACE = 'kustomize.toolkit.fluxcd.io/namespace';

/** Flux Helm controller stamps the owning HelmRelease's name/namespace. */
export const FLUX_HELM_NAME = 'helm.toolkit.fluxcd.io/name';
export const FLUX_HELM_NAMESPACE = 'helm.toolkit.fluxcd.io/namespace';

/**
 * Escape hatch: an operator/user sets this to "true" on a resource to declare it
 * intentionally editable in-cluster despite carrying GitOps ownership annotations. Only the
 * exact string "true" re-enables write controls (FR30).
 */
export const EDITABLE_OVERRIDE = 'headlamp.openfeature.io/editable';
export const EDITABLE_OVERRIDE_VALUE = 'true';
