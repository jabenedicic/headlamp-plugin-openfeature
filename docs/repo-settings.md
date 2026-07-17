<!--
SPDX-License-Identifier: Apache-2.0
-->

# Repository settings runbook

Some supply-chain and code-scanning controls are GitHub **repository settings**,
not files that can be committed. This PR ships the committable half — the
`pr.yml` PR gate, the `codeql.yml` scan, and `dependabot.yml` — and this runbook
records the non-committable toggles a maintainer must enable in the GitHub UI so
the security posture is auditable and honest.

> Nothing in this repository can flip these switches. Do **not** treat them as
> "enabled" until a maintainer has turned them on in **Settings**.

## 1. GHAS / security toggles

All live under **Settings → Advanced Security** (formerly **Settings → Code
security and analysis**). Enable each:

| Toggle | Where | Why |
|--------|-------|-----|
| **Dependabot alerts** | Settings → Advanced Security → Dependabot alerts | Surfaces known CVEs in dependencies. Required for `dependabot.yml` to raise automatic **security** update PRs (the committed config only schedules the weekly version bumps). |
| **Secret scanning** | Settings → Advanced Security → Secret scanning | Detects committed credentials/tokens. |
| **Push protection** | Settings → Advanced Security → Secret scanning → Push protection | Blocks pushes that contain detected secrets before they land. |
| **Private vulnerability reporting** | Settings → Advanced Security → Private vulnerability reporting | Gives reporters the private advisory channel referenced by `SECURITY.md`. |

CodeQL code scanning itself is provided by the committed
`.github/workflows/codeql.yml` (no UI toggle needed beyond enabling Advanced
Security). Review its findings under the **Security → Code scanning** tab.

> **Do not enable CodeQL "default setup."** This repo ships CodeQL *advanced
> setup* (the committed `codeql.yml`). Turning on **Settings → Advanced Security
> → Code scanning → CodeQL analysis → Default setup** conflicts with the
> workflow: the advanced runs error out and the required `analyze
> (javascript-typescript)` check never turns green, blocking every PR. Leave
> code scanning driven by the workflow only.

## 2. Branch protection — required status checks

Under **Settings → Branches → Branch protection rules** (or **Rulesets**), add a
rule targeting `main` and mark the following status checks **Required** (enable
"Require status checks to pass before merging" and "Require branches to be up to
date before merging"):

| Required check | Source workflow / job |
|----------------|-----------------------|
| `ci` | `.github/workflows/pr.yml` → job `ci` (runs lint, format-check, tsc, licenses, spdx, test, build, size) |
| `analyze (javascript-typescript)` | `.github/workflows/codeql.yml` → job `analyze` (matrix language `javascript-typescript`) |

Notes:

- The `ci` job is a single gate; each guardrail is a separate **step** so a
  failure names the offending check, but branch protection only needs the one
  job-level check `ci`.
- The exact CodeQL check label GitHub offers is the job name plus the matrix
  value, i.e. `analyze (javascript-typescript)`. Select it from the search box
  after at least one run has reported (the list is populated from observed check
  runs).
- Also recommended on the same rule: **Require a pull request before merging**,
  **Require review from Code Owners** (honours `.github/CODEOWNERS`), and
  **Require signed commits / DCO sign-off** per `CONTRIBUTING.md`.

> **DCO vs. Dependabot.** Dependabot commits carry no `Signed-off-by` trailer and
> cannot be configured to add one, so if the DCO check is *required* on `main`
> every weekly Dependabot PR fails it and cannot merge as-is. Pick one before
> enforcing DCO: (a) install the DCO GitHub App and add Dependabot (and other
> bots) to its allowlist, (b) leave the DCO check *not required* and rely on
> reviewer sign-off, or (c) accept that a maintainer must rebase each Dependabot
> PR with `--signoff`. Without one of these, the dependency-hygiene automation is
> effectively blocked.

## 3. Licence gate scope

The `licenses` npm script (the CI "Licence allowlist" step) enforces two things,
deliberately at different scopes:

- **`--production --onlyAllow` (the shipped surface):** every *runtime*
  dependency — i.e. anything that can be bundled into `dist/main.js` and
  distributed — must be Apache-2.0 / MIT / BSD-2-Clause / BSD-3-Clause / ISC. The
  plugin currently declares no runtime `dependencies`, so this scope will start
  catching third-party licences as soon as the first bundled dependency lands
  (e.g. Epic 3).
- **`--failOn` copyleft denylist (the whole tree):** the *entire* installed tree,
  build-time `devDependencies` included, is scanned and fails on any GPL / LGPL /
  AGPL / SSPL variant. This is what implements the architecture's "reject GPL/AGPL
  and any transitive dep" intent across the full dependency graph.

A strict allowlist over the *whole* tree was rejected on purpose: the build
toolchain legitimately pulls in ~10 other permissive licences (0BSD, Unlicense,
CC0-1.0, BlueOak-1.0.0, MPL-2.0, EPL-2.0, Python-2.0, …) that would false-fail an
allowlist while posing no copyleft risk. The denylist catches the licences that
actually matter without that churn.
