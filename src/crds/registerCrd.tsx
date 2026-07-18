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

// The plugin's only shared registration abstraction: one CRD's sidebar sub-entry plus
// its list and detail routes. Registration is repetitive and typo-prone, and a typo here
// fails silently (see below), so it lives in exactly one place.
//
// Every view is wrapped in the top-level ErrorBoundary so a crash in one CRD's screen
// stays contained and never takes down the Headlamp host or a sibling plugin.

import { ApiProxy, registerRoute, registerSidebarEntry } from '@kinvolk/headlamp-plugin/lib';
import { Loader } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { type ComponentType, useEffect, useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OPENFEATURE_GROUP, OPENFEATURE_VERSION } from '../constants/rbac';
import { OPENFEATURE_ROUTE_BASE, OPENFEATURE_SIDEBAR_PARENT } from '../constants/routes';
import type { OpenFeatureResourceClass } from '../k8s/resources';
import { isOperatorMissing, OperatorMissing } from '../views/OperatorMissing';

export interface CrdRegistration {
  /**
   * The CRD's resource class. Its static `kind` (set by makeCustomResourceClass in
   * resources.ts) is the SINGLE source of truth for the detail route's name — see the
   * comment at the route registration below.
   */
  resourceClass: OpenFeatureResourceClass;
  /** Plural resource name, e.g. 'featureflags'. Used in the URL and the operator probe. */
  plural: string;
  /** Sidebar label, e.g. 'Feature Flags'. */
  label: string;
  /** Native ResourceListView wrapper for this CRD. */
  List: ComponentType;
  /** Native DetailsGrid wrapper for this CRD. */
  Detail: ComponentType;
}

type ProbeResult = 'probing' | 'present' | 'missing';

/**
 * Render the list, unless the CRD itself is absent — in which case explain that the
 * operator is not installed instead of showing an empty table.
 *
 * We do NOT branch on `useList()`'s error: the SDK list query is watch-based and retries
 * a missing CRD indefinitely without ever settling its `error`, so the panel would never
 * appear (the table just spins forever). Instead we fire a single proactive request at the
 * collection endpoint — the cert-manager pattern. A one-shot request settles cleanly: 200
 * when the CRD is served, 404 when the operator's CRDs are absent. A non-404 failure (e.g.
 * 403) is deliberately NOT treated as missing — the list renders and surfaces that itself.
 */
// Exported (only) so registerCrd.test.tsx can render and probe this state machine directly.
export function ListOrOperatorMissing({
  resourceClass,
  plural,
  List,
}: {
  resourceClass: OpenFeatureResourceClass;
  plural: string;
  List: ComponentType;
}) {
  const [probe, setProbe] = useState<ProbeResult>('probing');

  useEffect(() => {
    let cancelled = false;
    const path = `/apis/${OPENFEATURE_GROUP}/${OPENFEATURE_VERSION}/${plural}`;
    // autoLogoutOnAuthError=false: a probe must never log the user out on a 401/403.
    ApiProxy.request(path, {}, false, true, { limit: '1' }).then(
      () => {
        if (!cancelled) {
          setProbe('present');
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setProbe(isOperatorMissing(error) ? 'missing' : 'present');
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [plural]);

  if (probe === 'probing') {
    return <Loader title={`Checking for ${resourceClass.kind} support…`} />;
  }
  if (probe === 'missing') {
    return <OperatorMissing />;
  }
  return <List />;
}

/** Register one CRD's sidebar sub-entry, list route, and detail route. */
export function registerCrd({ resourceClass, plural, label, List, Detail }: CrdRegistration) {
  const base = `${OPENFEATURE_ROUTE_BASE}/${plural}`;
  const sidebarName = `openfeature-${plural}`;

  registerSidebarEntry({
    parent: OPENFEATURE_SIDEBAR_PARENT,
    name: sidebarName,
    label,
    url: base,
  });

  registerRoute({
    path: `${base}/:namespace?`,
    exact: true,
    name: `${sidebarName}-list`,
    sidebar: sidebarName,
    component: () => (
      <ErrorBoundary>
        <ListOrOperatorMissing resourceClass={resourceClass} plural={plural} List={List} />
      </ErrorBoundary>
    ),
  });

  // The route NAME must be resourceClass.kind, not a separate literal: KubeObject.
  // detailsRoute returns the kind, and the native 'name' column links via
  // createRouteURL(kind, {namespace, name, cluster}). Deriving the name from the same
  // resourceClass that resources.ts constructs (rather than a second hand-typed 'kind'
  // string here) makes drift between the two impossible — a mismatch would make
  // createRouteURL find no route and silently return an empty string, so every row in
  // the list would link nowhere with no error and no console warning.
  registerRoute({
    path: `${base}/:namespace/:name`,
    exact: true,
    name: resourceClass.kind,
    sidebar: sidebarName,
    component: () => (
      <ErrorBoundary>
        <Detail />
      </ErrorBoundary>
    ),
  });
}
