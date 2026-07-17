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

import { registerRoute, registerSidebarEntry } from '@kinvolk/headlamp-plugin/lib';
import type { ComponentType } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OPENFEATURE_ROUTE_BASE, OPENFEATURE_SIDEBAR_PARENT } from '../constants/routes';

export interface CrdRegistration {
  /**
   * The CRD's kind, e.g. 'FeatureFlag'.
   *
   * This is NOT cosmetic. KubeObject.detailsRoute returns the kind, and the native
   * 'name' column links via createRouteURL(kind, {namespace, name, cluster}). The detail
   * route MUST therefore be registered under this exact name (matching is
   * case-insensitive). If it is not, createRouteURL finds no route and returns an empty
   * string — with no error and no console warning — so every row in the list links
   * nowhere and nothing explains why.
   */
  kind: string;
  /** Plural resource name, e.g. 'featureflags'. Used in the URL. */
  plural: string;
  /** Sidebar label, e.g. 'Feature Flags'. */
  label: string;
  /** Native ResourceListView wrapper for this CRD. */
  List: ComponentType;
  /** Native DetailsGrid wrapper for this CRD. */
  Detail: ComponentType;
}

/** Register one CRD's sidebar sub-entry, list route, and detail route. */
export function registerCrd({ kind, plural, label, List, Detail }: CrdRegistration) {
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
        <List />
      </ErrorBoundary>
    ),
  });

  // The route NAME must be the kind — see CrdRegistration.kind above.
  registerRoute({
    path: `${base}/:namespace/:name`,
    exact: true,
    name: kind,
    sidebar: sidebarName,
    component: () => (
      <ErrorBoundary>
        <Detail />
      </ErrorBoundary>
    ),
  });
}
