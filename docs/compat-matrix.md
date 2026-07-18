<!--
SPDX-License-Identifier: Apache-2.0
-->

# Compatibility matrix

Each row records the versions a plugin release was actually tested against — by
loading the packaged plugin into a real Headlamp and driving the UI, not by
inference.

| Plugin | Headlamp | OpenFeature Operator | flagd | Kubernetes |
|--------|----------|----------------------|-------|------------|
| 0.1.0  | v0.43.0 (`ghcr.io/headlamp-k8s/headlamp:v0.43.0`, also the tag the nightly e2e pins) | 0.9.2 (chart) | n/a — the plugin never talks to flagd | v1.31.x (Docker Desktop `docker-desktop` context) |

## Notes

- The plugin's only contract is with the `core.openfeature.dev/v1beta1` CRDs on the
  Kubernetes API. It makes no runtime assumption that flagd is running or reachable,
  so no flagd version is implied.
- CRD version support is `v1beta1` only. Other versions are a future milestone.
- Any CNCF-compliant Kubernetes distribution should work; the plugin makes no
  distribution-specific assumptions.
- The Headlamp version is the tag pinned by the nightly end-to-end harness
  (`e2e/setup/start-headlamp.sh`), so the documented tested version matches the
  automated verification path. Every change was also driven manually against
  Headlamp `v0.43.0` locally (the `:latest` image on the v0.43.0 release date is
  the same digest as `:v0.43.0`).
- The minimum supported Headlamp version is not asserted below `v0.43.0`: the
  plugin has only been verified against `v0.43.0`, which also carries the RBAC
  behaviour later access-control work depends on. Older versions may work but are
  untested.
