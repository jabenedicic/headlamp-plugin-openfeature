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

import { describe, expect, it } from 'vitest';
import { externalManagement, isExternallyManaged } from './gitops-detector';

/** A plain resource body carrying the given annotations. */
function body(annotations: Record<string, unknown>) {
  return { metadata: { annotations } };
}

/** A live KubeObject keeps the body under jsonData. */
function kubeObject(annotations: Record<string, unknown>) {
  return { jsonData: { metadata: { annotations } } };
}

describe('externalManagement', () => {
  it('reports Flux for a Kustomize-owned resource', () => {
    expect(externalManagement(body({ 'kustomize.toolkit.fluxcd.io/name': 'apps' }))).toEqual({
      managed: true,
      controller: 'Flux',
    });
  });

  it('reports Flux for a HelmRelease-owned resource', () => {
    expect(externalManagement(body({ 'helm.toolkit.fluxcd.io/name': 'flags' }))).toEqual({
      managed: true,
      controller: 'Flux',
    });
  });

  it('reports Argo CD for a resource carrying the tracking id', () => {
    expect(
      externalManagement(body({ 'argocd.argoproj.io/tracking-id': 'app:group/Kind:ns/name' }))
    ).toEqual({ managed: true, controller: 'Argo CD' });
  });

  it('reads annotations from a live KubeObject under jsonData', () => {
    expect(isExternallyManaged(kubeObject({ 'kustomize.toolkit.fluxcd.io/name': 'apps' }))).toBe(
      true
    );
  });

  it('is not managed when no ownership annotations are present', () => {
    expect(externalManagement(body({ 'some.other/annotation': 'x' }))).toEqual({ managed: false });
  });

  it('does not treat a bare app.kubernetes.io/instance label as managed (Helm also sets it)', () => {
    expect(isExternallyManaged(body({ 'app.kubernetes.io/instance': 'my-release' }))).toBe(false);
  });

  it('honours the editable override even when a Flux annotation is present (FR30)', () => {
    expect(
      externalManagement(
        body({
          'kustomize.toolkit.fluxcd.io/name': 'apps',
          'headlamp.openfeature.io/editable': 'true',
        })
      )
    ).toEqual({ managed: false });
  });

  it('ignores an editable override that is not exactly "true"', () => {
    expect(
      isExternallyManaged(
        body({
          'argocd.argoproj.io/tracking-id': 'x',
          'headlamp.openfeature.io/editable': 'yes',
        })
      )
    ).toBe(true);
  });

  it.each([
    ['no metadata at all', {}],
    ['null annotations', { metadata: { annotations: null } }],
    ['annotations as an array', { metadata: { annotations: [] } }],
    ['a null item', null],
    ['undefined', undefined],
  ])('never throws and defaults to not-managed for %s', (_label, item) => {
    expect(isExternallyManaged(item as never)).toBe(false);
  });
});
