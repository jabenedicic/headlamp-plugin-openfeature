# Headlamp OpenFeature Plugin

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

A [Headlamp](https://github.com/kubernetes-sigs/headlamp) plugin for viewing and
managing [OpenFeature](https://openfeature.dev/) feature flags directly from the
Kubernetes dashboard. It surfaces the resources managed by the OpenFeature
Operator and flagd so platform teams can inspect flag configuration in context.

> Status: early development (`0.1.0`). Interfaces and screens are still evolving.

## Compatibility matrix

> **Placeholder — TBD.** Verified version ranges will be published once the
> plugin has been tested end-to-end against real Operator and flagd releases. Do
> not treat the rows below as supported combinations yet.

| Component            | Verified version |
| -------------------- | ---------------- |
| Headlamp             | _TBD_            |
| OpenFeature Operator | _TBD_            |
| flagd                | _TBD_            |
| Kubernetes           | _TBD_            |

## Demo

<!-- 90-second demo GIF placeholder — a recorded walkthrough is coming soon.
     No image is embedded yet to avoid a broken/404 media link. -->

_A 90-second demo GIF is coming soon._

## Quickstart

Requires Node.js `>=20.18.1`.

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
