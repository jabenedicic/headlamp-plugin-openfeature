#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
#
# Stage the freshly-packaged plugin and start a real Headlamp server process
# with it loaded, then block until the server answers. Headlamp scans its
# plugins directory at server START, so staging must happen before launch.
#
# Runs on the GitHub Actions Linux runner only (needs Docker + the kind
# kubeconfig). `npm run build` and `npm run package` must have run first so a
# dist/ and a packaged tarball exist.
set -euo pipefail

# --- Pinned Headlamp image (NFR26). -------------------------------------------
# Track the Headlamp/plugin compatibility matrix; MUST NOT be `:latest`.
HEADLAMP_IMAGE="ghcr.io/headlamp-k8s/headlamp:v0.43.0"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# Local plugin-staging dir; kept in .gitignore. Layout must be
# <plugins-dir>/<PluginName>/{main.js,package.json}.
PLUGINS_DIR="${REPO_ROOT}/.headlamp-plugins"
PLUGIN_NAME="headlamp-openfeature"
BASE_URL="http://localhost:4466"
# Stable container name so the workflow's always-on diagnostics step (and a
# re-run on a reused host) can find/replace this exact container instead of
# leaking a stale server still bound to the port with yesterday's plugin.
CONTAINER_NAME="headlamp-e2e"

# --- Stage the packaged plugin. -----------------------------------------------
echo "==> Staging plugin into ${PLUGINS_DIR}/${PLUGIN_NAME}"
rm -rf "${PLUGINS_DIR}"
mkdir -p "${PLUGINS_DIR}/${PLUGIN_NAME}"

# `npm run package` (headlamp-plugin package) writes <name>-<version>.tar.gz to
# the repo root. Derive the exact filename from package.json so a stray tarball
# from a prior local run can't be picked up non-deterministically.
PKG_NAME="$(node -p "require('${REPO_ROOT}/package.json').name")"
PKG_VERSION="$(node -p "require('${REPO_ROOT}/package.json').version")"
TARBALL="${REPO_ROOT}/${PKG_NAME}-${PKG_VERSION}.tar.gz"
if [ -f "${TARBALL}" ]; then
  tar xzf "${TARBALL}" -C "${PLUGINS_DIR}/${PLUGIN_NAME}" --strip-components=1
else
  # Fallback: use the SDK's extract to stage dist/ into the plugins-dir layout.
  npx --yes @kinvolk/headlamp-plugin extract "${REPO_ROOT}" "${PLUGINS_DIR}"
fi

# --- Stage a container-readable kubeconfig. -----------------------------------
# The image runs as the non-root `headlamp` user, whose UID differs from the
# runner's. kind writes ~/.kube/config user-readable only (0600), so mounting
# ${HOME}/.kube directly gives the container "permission denied" on the config,
# Headlamp loads no cluster, and every Playwright click times out. Stage a
# world-readable copy in a temp dir and mount that instead.
KUBE_STAGE="$(mktemp -d)"
# mktemp -d is 0700; the container's non-root user must also be able to TRAVERSE the
# directory (not just read the file), so make the dir world-executable too.
chmod 755 "${KUBE_STAGE}"
cp "${HOME}/.kube/config" "${KUBE_STAGE}/config"
chmod 644 "${KUBE_STAGE}/config"

# --- Start the Headlamp server process. ---------------------------------------
# kind's kubeconfig embeds the API server as 127.0.0.1:<port>; --network=host on
# the Linux runner generally makes it reachable from the container. If not, an
# address rewrite may be needed — this is validated by the live nightly run.
echo "==> Starting Headlamp server (${HEADLAMP_IMAGE})"
# Replace any leftover container from a prior run so we never validate against a
# stale server that loaded an earlier plugin snapshot at its start.
docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
# `--entrypoint` is load-bearing. The image's own ENTRYPOINT is already
# `/headlamp/headlamp-server -html-static-dir /headlamp/frontend -plugins-dir /headlamp/plugins`,
# so appending `/headlamp/headlamp-server …` as the container command makes the repeated binary
# path a positional arg — Go's flag parser stops at the first non-flag token, silently discarding
# every flag after it (`-plugins-dir`, `-enable-dynamic-clusters`) and loading plugins from the
# baked-in `/headlamp/plugins` instead of our mount. Overriding the entrypoint makes the args
# below the binary's full argv so the flags are parsed. The image runs as user `headlamp`
# (HOME=/home/headlamp), so the kubeconfig must land at /home/headlamp/.kube — not /root/.kube.
CID="$(docker run -d --name "${CONTAINER_NAME}" --network=host \
  --entrypoint /headlamp/headlamp-server \
  -v "${KUBE_STAGE}:/home/headlamp/.kube" \
  -v "${PLUGINS_DIR}:/build/plugins" \
  "${HEADLAMP_IMAGE}" \
  -html-static-dir /headlamp/frontend \
  -plugins-dir=/build/plugins \
  -enable-dynamic-clusters)"

# --- Block until the server is reachable AND serving the plugin. --------------
# `/plugins` is the JSON array of loaded plugins (each `{path,type,name}`); our
# plugin appears as `plugins/headlamp-openfeature`. (`/plugins/list` is NOT an
# endpoint — it 404s.) Requiring our plugin to appear there fails a bad stage/load
# early instead of burning Playwright retries on an empty sidebar.
echo "==> Waiting for Headlamp at ${BASE_URL}"
for attempt in $(seq 1 60); do
  if curl -sf "${BASE_URL}/plugins" 2>/dev/null | grep -qi 'openfeature'; then
    echo "==> Headlamp is up and the plugin is loaded (attempt ${attempt})"
    exit 0
  fi
  sleep 2
done

echo "ERROR: Headlamp did not become reachable / load the plugin at ${BASE_URL}" >&2
# The whole point is diagnosability from a run we cannot reproduce locally.
docker logs "${CID}" >&2 2>&1 || true
docker ps -a >&2 2>&1 || true
exit 1
