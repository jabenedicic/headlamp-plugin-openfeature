#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
#
# Provision the OpenFeature backend the nightly smoke flow exercises: install
# cert-manager (required by the operator's webhooks), install the OpenFeature
# Operator via Helm, wait for both to be ready, then apply the canned
# FeatureFlag. Ordering is load-bearing — the FeatureFlag admission webhook
# rejects the apply unless the operator Deployment is Available and the CRD is
# Established, which is the classic flaky-nightly failure. Every wait is bounded.
#
# Runs on the GitHub Actions Linux runner only; it cannot run on the dev box
# (no kind/cluster). Assumes kubectl + helm are on PATH and KUBECONFIG points at
# the kind cluster created by helm/kind-action.
set -euo pipefail

# --- Pinned versions (NFR26 — never float `latest`). --------------------------
# cert-manager release validated against the operator chart below.
CERT_MANAGER_VERSION="v1.14.3"
# OpenFeature Operator Helm chart version. Confirm the exact available semver
# with: helm search repo openfeature/open-feature-operator --versions
# (chart tags are published with a `v` prefix, e.g. `v0.9.2`, never bare `0.9.2`).
OPERATOR_CHART_VERSION="v0.9.2"

FIXTURE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../fixtures" && pwd)"

# --- cert-manager (must be Ready before the operator). ------------------------
echo "==> Installing cert-manager ${CERT_MANAGER_VERSION}"
kubectl apply -f "https://github.com/cert-manager/cert-manager/releases/download/${CERT_MANAGER_VERSION}/cert-manager.yaml"
kubectl wait --for=condition=Available=True deploy --all -n cert-manager --timeout=300s

# --- OpenFeature Operator via Helm. -------------------------------------------
echo "==> Installing OpenFeature Operator chart ${OPERATOR_CHART_VERSION}"
# `--force-update` keeps this idempotent: helm 3 tolerated re-adding an existing repo, but
# helm 4 errors ("repository name (openfeature) already exists") and, under `set -e`, would
# abort the whole setup on a second local run (or a reused self-hosted runner).
helm repo add --force-update openfeature https://open-feature.github.io/open-feature-operator/
helm repo update
# cert-manager reporting its Deployment Available does not guarantee its webhook
# endpoint is already serving; the operator chart provisions Certificate/webhook
# resources that depend on it, so the very first install can race and fail. Retry
# the (idempotent) install a few times to absorb that window instead of letting
# `set -e` abort the whole setup — the same belt-and-braces stance the canned
# FeatureFlag apply below already takes for the admission webhook.
for attempt in 1 2 3; do
  if helm upgrade --install openfeature openfeature/open-feature-operator \
    --namespace open-feature-operator-system --create-namespace \
    --version "${OPERATOR_CHART_VERSION}" \
    --wait --timeout 300s; then
    echo "==> Operator chart installed (attempt ${attempt})"
    break
  fi
  if [ "${attempt}" -eq 3 ]; then
    echo "ERROR: operator chart install did not succeed after ${attempt} attempts" >&2
    exit 1
  fi
  echo "==> Operator install failed (attempt ${attempt}); retrying in 10s"
  sleep 10
done

echo "==> Waiting for the operator to be ready"
kubectl wait --for=condition=Available deploy -n open-feature-operator-system --all --timeout=300s
kubectl wait --for=condition=Established crd/featureflags.core.openfeature.dev --timeout=120s

# --- Canned FeatureFlag. ------------------------------------------------------
echo "==> Applying the canned FeatureFlag"
# Namespace must exist before the manifest (which declares metadata.namespace).
kubectl create namespace openfeature-e2e --dry-run=client -o yaml | kubectl apply -f -

# Belt-and-braces retry: even after the CRD is Established the admission webhook
# can briefly race, so retry the apply a few times before giving up.
for attempt in 1 2 3 4 5; do
  if kubectl apply -f "${FIXTURE_DIR}/featureflag.yaml"; then
    echo "==> FeatureFlag applied (attempt ${attempt})"
    exit 0
  fi
  echo "==> FeatureFlag apply failed (attempt ${attempt}); retrying in 5s"
  sleep 5
done

echo "ERROR: FeatureFlag apply did not succeed after retries" >&2
exit 1
