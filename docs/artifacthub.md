<!--
SPDX-License-Identifier: Apache-2.0
-->

# Publishing to Artifact Hub

The plugin is published to [Artifact Hub](https://artifacthub.io) as a **Headlamp
plugin** so users can discover and install it from the Headlamp plugin catalog. This
repository carries the Artifact Hub metadata under [`artifacthub/`](../artifacthub); the
release tarballs themselves stay attached to the GitHub releases (see
[`docs/release.md`](./release.md) if present, or the `release-please` workflow).

## Layout

```
artifacthub/
  artifacthub-repo.yml            # repository metadata (ownership claim)
  headlamp-openfeature/           # the package
    0.1.0/artifacthub-pkg.yml     # one directory per released version
    0.2.0/artifacthub-pkg.yml
    ...
```

Artifact Hub scans the packages path and treats **each version directory** as an
immutable package version. The minimum supported Headlamp version lives in the
`headlamp/plugin/version-compat` annotation — **not** in `package.json`.

## One-time: register the repository

1. In the Artifact Hub Control Panel: **Repositories → Add**, kind **Headlamp plugins**.
2. Set the URL to this directory on the default branch, e.g.
   `https://github.com/jabenedicic/headlamp-plugin-openfeature/tree/main/artifacthub`.
3. Ownership is claimed via the `repositoryID` already set in
   [`artifacthub/artifacthub-repo.yml`](../artifacthub/artifacthub-repo.yml).

## Per release: add a new version

`release-please` tags `headlamp-openfeature-vX.Y.Z` and the release workflow attaches
`headlamp-openfeature-X.Y.Z.tar.gz` and its `.sha256`. After a release is published:

1. Read the checksum from the release asset:
   ```bash
   gh release download headlamp-openfeature-vX.Y.Z --pattern '*.sha256' --dir /tmp
   cat /tmp/headlamp-openfeature-X.Y.Z.tar.gz.sha256
   ```
2. Create `artifacthub/headlamp-openfeature/X.Y.Z/artifacthub-pkg.yml` by copying the
   previous version's file and updating:
   - `version`, `createdAt` (the release's `publishedAt`, RFC 3339), and the `release` link,
   - `headlamp/plugin/archive-url` → the new tarball's download URL,
   - `headlamp/plugin/archive-checksum` → `sha256:<checksum from step 1>`,
   - `headlamp/plugin/version-compat` → the minimum Headlamp version if it changed
     (keep it in sync with [`docs/compat-matrix.md`](./compat-matrix.md)).
3. Commit and push to the default branch; Artifact Hub re-scans on its own schedule.

> Keep older version directories in place — Artifact Hub keeps every version discoverable.
