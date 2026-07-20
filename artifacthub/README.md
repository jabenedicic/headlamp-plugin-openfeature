<!-- SPDX-License-Identifier: Apache-2.0 -->

# Headlamp OpenFeature Plugin

A [Headlamp](https://github.com/kubernetes-sigs/headlamp) plugin for viewing and managing
[OpenFeature](https://openfeature.dev/) feature flags directly from the Kubernetes
dashboard. It surfaces the resources managed by the OpenFeature Operator and flagd —
`FeatureFlag`, `FeatureFlagSource`, `Flagd`, and `InProcessConfiguration` — so platform
teams can inspect and change flag configuration in context, using Headlamp's own native
resource screens.

> This package's metadata (`artifacthub-pkg.yml`) is generated per release; the images below
> are hosted from the repository's `main` branch.

## Highlights

**Explore every OpenFeature resource** — native list and detail screens for all four
operator CRDs, with a flag's state, variants, and read-only targeting preview.

![Browsing the four OpenFeature CRD lists and a FeatureFlag detail](https://raw.githubusercontent.com/jabenedicic/headlamp-plugin-openfeature/main/docs/images/openfeature-plugin-explore.gif)

**Manage flags without touching YAML** — a one-click per-flag state toggle, a per-flag edit
form (description, variants, default), adding a flag to a set from a template, and creating a
new flag through a guided form. No `flagSpec` knowledge required.

![Toggling a flag's state, editing it through a form, adding a flag, and creating a new one](https://raw.githubusercontent.com/jabenedicic/headlamp-plugin-openfeature/main/docs/images/openfeature-plugin-manage.gif)

**RBAC- and GitOps-aware** — write controls follow the user's RBAC, and a resource reconciled
by Flux or Argo CD is shown read-only, with a "GitOps managed" chip explaining why.

![A Flux-managed FeatureFlag shown read-only with a GitOps managed chip](https://raw.githubusercontent.com/jabenedicic/headlamp-plugin-openfeature/main/docs/images/openfeature-plugin-governance.gif)

## Features

- Named **OpenFeature Operator** sidebar section with a sub-entry per CRD, scoped by
  Headlamp's namespace filter.
- Native list and detail views — the flag set's state, variants, default, and a read-only
  targeting preview — on Headlamp's metadata grid.
- Simple per-flag editing: state toggle, edit form, add-to-set, and guided create.
- Create, edit, and delete through Headlamp's native YAML editor (Monaco, dry-run) for the
  advanced path.
- RBAC-reflective controls and GitOps external-management read-only treatment.
- A friendly "operator not detected" panel when the CRDs are absent.

## Install

Place the plugin's folder in Headlamp's plugins directory and restart Headlamp. See Headlamp's
[plugin installation guide](https://headlamp.dev/docs/latest/installation/plugins/) for the
per-platform directory, and click **INSTALL** above for the tarball steps. The plugin needs
the [OpenFeature Operator](https://github.com/open-feature/open-feature-operator) installed on
the target cluster.

## Compatibility

Tested against Headlamp `v0.43.0` and OpenFeature Operator chart `0.9.2` (CRDs
`core.openfeature.dev/v1beta1`). The minimum Headlamp version is declared in this package's
`headlamp/plugin/version-compat`.

## Links

- [Source & documentation](https://github.com/jabenedicic/headlamp-plugin-openfeature)
- [Changelog](https://github.com/jabenedicic/headlamp-plugin-openfeature/blob/main/CHANGELOG.md)
