<!-- SPDX-License-Identifier: Apache-2.0 -->

# Contributor & AI-assistant guide

Baseline context for anyone (human or AI) working on this repository. Read it before making
changes. The code is the source of truth; this file explains the intent and conventions that
are not obvious from the code alone.

## What this is

A [Headlamp](https://github.com/kubernetes-sigs/headlamp) plugin (client-side React +
TypeScript + MUI) that provides an admin UI for the **OpenFeature Operator's** CRDs
(`core.openfeature.dev/v1beta1`): `FeatureFlag`, `FeatureFlagSource`, `Flagd`, and
`InProcessConfiguration`. It composes Headlamp's **native** resource screens rather than
building a bespoke UI.

**Permanent non-goals (architectural commitments, not deferrals):**

- No backend, controller, webhook, or API service. The Kubernetes API is the source of truth;
  the plugin is a view layer.
- No network egress beyond Headlamp's authenticated Kubernetes client. No `fetch`,
  `XMLHttpRequest`, telemetry, or phone-home.
- No custom auth, routing, cluster/namespace selector, or theme — all inherited from Headlamp.

## Architecture

- **Per-CRD modules + one shared `registerCrd()` helper** (`src/crds/registerCrd.tsx`) register
  each CRD's sidebar entry, list route, and detail route. `src/index.tsx` is the entrypoint.
- **Resource classes** come from `K8s.crd.makeCustomResourceClass` (`src/k8s/resources.ts`) —
  each returns a `KubeObjectClass` (a subclass of the SDK `KubeObject`) that the native
  components consume directly. Instances expose `.jsonData` (the raw resource) and `.patch()`.
- A `FeatureFlag` is a **flag _set_**: `spec.flagSpec.flags` is a **map** of flags, not a single
  flag. Treat the resource (not the flag) as a list row. All access to that untyped map goes
  through `src/types/feature-flag.ts` (`getFlags`) and `src/lib/flag-set.ts` (pure helpers) —
  never reach into `spec.flagSpec.flags` directly.
- A live KubeObject stores the raw resource under `item.jsonData`, **not** `item.spec`. Reading
  `item.spec` on a live object returns nothing.
- A flag's **description lives at `metadata.description`** only; the CRD rejects a top-level
  `description` on a flag.
- The `core.openfeature.dev` CRDs have **no `status` subresource** — these are configuration
  screens, not health screens.

### Code map

```
src/
  index.tsx              # plugin registration entrypoint
  crds/registerCrd.tsx   # shared CRD sidebar+routes helper; managedResourceGuard.tsx (GitOps)
  k8s/resources.ts       # the four makeCustomResourceClass instances
  types/feature-flag.ts  # curated FeatureFlag type + getFlags accessor (the only narrowing point)
  lib/                   # PURE, React-free logic: flag-set.ts, gitops-detector.ts
  components/            # React components (StateChip, FlagStateToggle, FlagForm, AddFlagButton,
                         #   CreateFeatureFlagButton, ManagedChip, ErrorBoundary)
  views/                 # per-CRD list + detail views
  constants/             # pinned strings: rbac.ts (group/version/plurals), annotations.ts, routes.ts
examples/                # apply-able reference manifests (featureflags, sources, flagds, rbac, ...)
e2e/                     # Playwright flows + setup scripts (nightly job, not the PR gate)
artifacthub/             # Artifact Hub packaging (see docs/artifacthub.md)
```

## Conventions (enforced by ESLint + `format-check`)

- **SDK import boundary:** import only from `@kinvolk/headlamp-plugin/lib` and
  `@kinvolk/headlamp-plugin/lib/CommonComponents`. Never internal paths.
- **All Kubernetes access via the SDK** (`useList`/`useGet`/`apiEndpoint`/instance `patch`).
  No `fetch`/`XMLHttpRequest`/`axios`/`WebSocket`/`localStorage` (guardrail-linted).
- **MUI:** named imports only (`import { Button } from '@mui/material'`); **semantic theme
  tokens only** in `sx` (no hex, no px). **Never `@mui/icons-material`** (its `createSvgIcon`
  is undefined in the plugin runtime and crashes on import) — use Iconify name strings.
- **No enums** anywhere — string-literal unions. **No `any`** — `unknown` + narrowing.
- **`lib/` is pure**: no React, no side effects; unit-tested (table-driven where it has cases).
- **Naming:** components `PascalCase.tsx`, non-component modules `kebab-case.ts`, tests
  colocated `*.test.tsx`. Test descriptions imperative (`it('saves ...')`).
- **SPDX header** (`SPDX-License-Identifier: Apache-2.0`) on every source file.
- **Native-first UX:** `ResourceListView` (list), `DetailsGrid` (detail, with
  `extraSections`), `EditorDialog` (native Monaco YAML edit), `CreateResourceButton` /
  `DeleteButton` (create/delete). Custom controls use `ActionButton`/MUI `Button` +
  `AuthVisible` (RBAC gating) + `StatusLabel` (chips). GitOps read-only is a
  `registerDetailsViewHeaderActionsProcessor` that strips Edit/Delete + adds a chip; per-flag
  body controls (toggle/edit/add) consult `lib/gitops-detector.ts` directly and hide when managed.

### Writing to the cluster

- **Merge patch only** (`resource.patch(body)`, `application/merge-patch+json`). Body is a
  deep-partial touching one leaf; `null` deletes a map key; RFC 7386 matches keys literally so
  dotted flag names are safe. It cannot wholesale-replace a nested object (targeting stays
  read-only). Create: `FeatureFlagClass.apiEndpoint.post(body)`.
- RBAC verb = the request verb: PATCH→`patch`, POST→`create`, DELETE→`delete`.

## Testing & verification

- **Runner is Vitest**, invoked via `npm test` (`headlamp-plugin test`, which takes a *package
  folder*, not a file). For a single file: `npx vitest run --config
  node_modules/@kinvolk/headlamp-plugin/config/vite.config.mjs <file>` (that config sets
  `environment: jsdom`; plain `npx vitest` fails with `document is not defined`). `vi.mock`
  factories must reference spies via `vi.hoisted`.
- **The Definition of Done is a live render driven in a real Headlamp**, not just green tests.
  Build → `npm run package` → load into Headlamp against a cluster → drive the actual screen.
  Unit tests are the inner loop; they are never the gate on their own. See `docs/` and the
  `e2e/setup` scripts (Linux/CI); running against local `docker-desktop` on macOS needs
  adaptations (rewrite the kube API server to `host.docker.internal`, mount the plugin into the
  image's default `/headlamp/plugins`, no command override).

### Commands

```
npm test            # vitest (via headlamp-plugin)
npm run tsc         # type-check
npm run lint        # eslint
npm run format-check# prettier check — RUN THIS before pushing; eslint alone does not catch it
npm run build       # bundle to dist/main.js
npm run package     # headlamp-plugin package -> tarball
npm run size        # bundle-size budget (500 kB gzipped)
npm run e2e         # playwright (needs a cluster + operator; nightly job, not PR gate)
```

CI (`.github/workflows/pr.yml`, job `ci`) runs: lint, format-check, tsc, licenses, spdx, test,
build, size. CodeQL runs separately.

## Workflow

Work through **GitHub issues → branch → PR**. `main` is protected by a ruleset:

- Squash-merge only; conversation-resolution required; status checks (`ci`, `analyze`, `DCO`,
  `Validate PR title`) must pass; a **Copilot review** is required on every PR.
- Branch names: `feat/…`, `fix/…`, `chore/…`, `ci/…`, `docs/…` (kebab). Match repo history.
- **Conventional commits** with a **DCO `Signed-off-by`** trailer. Author identity for this
  OSS repo: `Jason Benedicic <48251655+jabenedicic@users.noreply.github.com>`.
- Address or reply-and-resolve Copilot review threads before merging. `gh pr merge --admin` is
  discouraged; a normal squash merge works once the gates are green and threads are resolved.

## Releases & distribution

- **`release-please`** (`.github/workflows/release-please.yml`) opens a "chore: release main"
  PR from the conventional commits; merging it tags `headlamp-openfeature-vX.Y.Z`, publishes a
  GitHub release, attaches the tarball + `.sha256`, and generates that version's Artifact Hub
  package (`scripts/gen-artifacthub-pkg.mjs`).
- **Versioning:** during 0.x, `feat` bumps the **minor** (0.2.0, 0.3.0…), `fix` bumps the patch;
  cut `1.0.0` when the API is stable (`bump-patch-for-minor-pre-major: false`).
- **Artifact Hub:** repo `openfeature`, package `headlamp-openfeature`. Metadata is generated
  from `artifacthub/artifacthub-pkg.template.yml` + `artifacthub/README.md`. See
  [`docs/artifacthub.md`](docs/artifacthub.md).
- Some GitHub settings are not in the tree — see [`docs/repo-settings.md`](docs/repo-settings.md).

## Donation

This repo is intended for donation to the **OpenFeature** org. Keep it matching their
conventions, and never commit client identifiers (buckets, ARNs, hostnames, real flag names).
On transfer, update the hard-coded `jabenedicic/…` URLs (README badges, `artifacthub/`,
`docs/`) and re-register the Artifact Hub repository.
