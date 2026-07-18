<!--
SPDX-License-Identifier: Apache-2.0
-->

# Compatibility matrix

Each row records the versions a plugin release was actually tested against — by
loading the packaged plugin into a real Headlamp and driving the UI, not by
inference.

| Plugin | Headlamp | OpenFeature Operator | flagd | Kubernetes |
|--------|----------|----------------------|-------|------------|
| 0.1.0  | `latest` image, `ghcr.io/headlamp-k8s/headlamp:latest` (tested 2026-07-18; the image embeds no version string, see Notes) | 0.9.2 (chart) | n/a — the plugin never talks to flagd | v1.31.x (Docker Desktop `docker-desktop` context) |

## Notes

- The plugin's only contract is with the `core.openfeature.dev/v1beta1` CRDs on the
  Kubernetes API. It makes no runtime assumption that flagd is running or reachable,
  so no flagd version is implied.
- CRD version support is `v1beta1` only. Other versions are a future milestone.
- Any CNCF-compliant Kubernetes distribution should work; the plugin makes no
  distribution-specific assumptions.
- The Headlamp version could not be pinned to a semver: the `ghcr.io/headlamp-k8s/headlamp:latest`
  image (pulled 2026-06-16) does not embed an `org.opencontainers.image.version` label
  or a version string in its server binary or frontend bundle. The row above records
  the tag and the date it was tested rather than inventing a version number.
