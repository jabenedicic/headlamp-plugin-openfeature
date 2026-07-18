# Security Policy

We take the security of the Headlamp OpenFeature plugin seriously and appreciate
responsible disclosure.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities privately through
[**GitHub private vulnerability reporting**](https://github.com/jabenedicic/headlamp-plugin-openfeature/security/advisories/new)
(GitHub Security Advisories). From the repository, go to the **Security** tab →
**Report a vulnerability**. This opens a private advisory visible only to the
maintainers.

### Response cadence

We aim to acknowledge new reports on a **best-effort basis within 7 days**. As a
small, maintainer-led project these are best-effort targets rather than
contractual guarantees.

## Scope

**In scope — report here:** vulnerabilities in the code of *this plugin* — the
Headlamp OpenFeature plugin itself (its TypeScript/React source, build output,
and packaging).

**Out of scope — please report upstream:** this plugin is a read-oriented view
over resources owned by other projects. Vulnerabilities in those components
should be reported to their respective maintainers, not here:

- **OpenFeature Operator** — https://github.com/open-feature/open-feature-operator/security
- **flagd** — https://github.com/open-feature/flagd/security
- **Kubernetes** — https://kubernetes.io/docs/reference/issues-security/security/

If you are unsure whether an issue is in the plugin or upstream, open a private
advisory here and we will help route it to the right place.
