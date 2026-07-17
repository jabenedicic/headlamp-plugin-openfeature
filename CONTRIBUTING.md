# Contributing

Thanks for your interest in improving the Headlamp OpenFeature plugin. This is a
small, community-driven project and contributions of all sizes are welcome.

By participating you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Getting started

Requires Node.js `>=20.18.1`.

```bash
npm install       # install dependencies
npm run start     # run against a local Headlamp in watch mode
npm run build     # produce dist/main.js
npm run lint      # eslint (with the repository guardrails)
npm run tsc       # TypeScript type-check
npm run test      # run the test suite (runs the SPDX check first)
npm run spdx      # verify SPDX/licence headers on src/**
npm run package   # package the plugin into a distributable tarball
```

Please make sure `npm run lint`, `npm run tsc`, `npm run spdx`, `npm run test`,
and `npm run build` all pass before opening a pull request.

## Developer Certificate of Origin (DCO)

All commits must be signed off under the
[Developer Certificate of Origin](https://developercertificate.org/). Add a
`Signed-off-by` trailer to every commit:

```bash
git commit -s -m "feat: add flag detail view"
```

This adds a line such as:

```
Signed-off-by: Your Name <you@example.com>
```

The name and email in the sign-off must match the commit author.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/). Use a type
prefix such as `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, or
`ci:`, optionally with a scope, e.g. `feat(flags): add detail drawer`.

## Changelog

User-visible changes should be recorded under the `[Unreleased]` section of
[CHANGELOG.md](./CHANGELOG.md), following the Keep a Changelog format.

## Review & triage cadence

This is a best-effort, maintainer-led project. Our current commitments:

- **Weekly triage** of new issues and pull requests.
- **Best-effort reviews within 14 days** of a pull request being opened.
- **Co-maintainer path:** contributors who land **3 merged non-trivial PRs**
  may be invited to become co-maintainers.

These are best-effort targets, not guarantees — please be patient and feel free
to ping a maintainer on a stale thread.

## Reporting security issues

Do **not** open a public issue for security vulnerabilities. Follow the process
in [SECURITY.md](./SECURITY.md) instead.

## Licensing

This project is licensed under [Apache-2.0](./LICENSE). By contributing you
agree that your contributions are licensed under the same terms. New source
files under `src/**` must carry the SPDX licence header enforced by
`npm run spdx`.
