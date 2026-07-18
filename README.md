# Headlamp OpenFeature Plugin

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

A [Headlamp](https://github.com/kubernetes-sigs/headlamp) plugin for viewing and
managing [OpenFeature](https://openfeature.dev/) feature flags directly from the
Kubernetes dashboard. It surfaces the resources managed by the OpenFeature
Operator and flagd so platform teams can inspect and change flag configuration in
context, using Headlamp's own native resource screens.

> Status: early development. The first tagged release will be `0.1.0`; interfaces
> and screens are still evolving.

## Features

- **Browse every OpenFeature Operator resource** — `FeatureFlag`,
  `FeatureFlagSource`, `Flagd`, and `InProcessConfiguration` — from a dedicated
  "OpenFeature Operator" sidebar section, scoped by Headlamp's namespace filter.
- **Native list and detail views** with search, sort, pagination, and the standard
  Headlamp metadata grid and events — no bespoke chrome.
- **Flag-set aware.** A `FeatureFlag` holds a *set* of flags; the list summarises
  state across the set (e.g. `2 enabled · 1 disabled`) and the detail view renders
  every flag with its variants, default, and targeting.
- **Create, edit, and delete** through Headlamp's native YAML editor (Monaco, dry-run
  server validation, and apply) and native delete confirmation.
- **Graceful when the operator is absent** — a clear "OpenFeature Operator not
  detected" panel with install guidance instead of an empty table.

## Installation

The plugin ships as a packaged tarball attached to each
[GitHub release](https://github.com/jabenedicic/headlamp-plugin-openfeature/releases).
Installing a Headlamp plugin means placing its folder in Headlamp's plugins
directory and restarting Headlamp:

- **Headlamp desktop** — extract the release tarball into your Headlamp plugins
  directory (its location varies by platform) and restart the app. From `0.2`
  onward the plugin will also be installable from the in-app Plugin Catalog.
- **Headlamp server / in-cluster** — extract the tarball into the directory passed
  to the server's `-plugins-dir` flag and restart the server.

See Headlamp's [plugin installation guide](https://headlamp.dev/docs/latest/installation/plugins/)
for the exact per-platform directory and options. After restarting, an
**OpenFeature Operator** entry appears in the sidebar (the plugin needs the
[OpenFeature Operator](https://github.com/open-feature/open-feature-operator)
installed on the target cluster; if it is not, the plugin says so and links to the
install docs).

## Compatibility

See [docs/compat-matrix.md](docs/compat-matrix.md) for the Headlamp, OpenFeature
Operator, and Kubernetes versions each release was tested against.

## Examples

Ready-to-apply manifests for all four OpenFeature Operator CRDs live in
[`examples/`](examples/):

```bash
kubectl create namespace openfeature-demo
kubectl apply -f examples/featureflags/
kubectl apply -f examples/featureflagsources/
kubectl apply -f examples/flagds/
kubectl apply -f examples/inprocessconfigurations/
```

`examples/rbac/` holds viewer and editor bindings scoped to the
`core.openfeature.dev` CRDs.

A `FeatureFlag` holds a *set* of flags: `spec.flagSpec.flags` is a map, so one
resource may define many flags — see
[`examples/featureflags/multi-flag.yaml`](examples/featureflags/multi-flag.yaml).
A flag's description belongs under `metadata.description`; the CRD schema rejects a
top-level `description`.

## Demo

<!-- 90-second demo GIF placeholder — a recorded walkthrough is coming soon.
     No image is embedded yet to avoid a broken/404 media link. -->

_A 90-second demo GIF is coming soon._

## Development

Building the plugin from source requires Node.js `>=20.18.1`.

```bash
# Install dependencies
npm install

# Run the plugin against a local Headlamp in watch mode
npm run start

# Type-check, lint, and run the SPDX header + test suites
npm run tsc
npm run lint
npm run spdx
npm run test

# Produce a production bundle (dist/main.js)
npm run build

# Package the plugin into a distributable tarball
npm run package
```

## Contributing & policies

- [Contributing guide](./CONTRIBUTING.md) — dev setup, cadences, DCO, and commit conventions.
- [Security policy](./SECURITY.md) — how to report a vulnerability.
- [Code of conduct](./CODE_OF_CONDUCT.md) — CNCF-aligned community expectations.
- [Maintainers](./MAINTAINERS.md) — who looks after this project.
- [Changelog](./CHANGELOG.md) — notable changes per release.

## Developing Headlamp plugins

For more information on developing Headlamp plugins, please refer to:

- [Getting Started](https://headlamp.dev/docs/latest/development/plugins/), How to create a new Headlamp plugin.
- [API Reference](https://headlamp.dev/docs/latest/development/api/), API documentation for what you can do.
- [UI Component Storybook](https://headlamp.dev/docs/latest/development/frontend/#storybook), pre-existing components you can use when creating your plugin.
- [Plugin Examples](https://github.com/kubernetes-sigs/headlamp/tree/main/plugins/examples), Example plugins you can look at to see how it's done.

## License

Licensed under the [Apache License 2.0](./LICENSE).
