// SPDX-License-Identifier: Apache-2.0
//
// Render artifacthub/artifacthub-pkg.template.yml into a per-version package file at
// artifacthub/headlamp-openfeature/<version>/artifacthub-pkg.yml, substituting the release's
// version, tag, archive URL, sha256 checksum, and creation timestamp.
//
// A version's Artifact Hub metadata references the RELEASED tarball's checksum, which only
// exists after the release is cut — so this runs in the release workflow (which already
// computes the checksum) rather than being hand-written ahead of time.
//
// Usage:
//   node scripts/gen-artifacthub-pkg.mjs \
//     --version 0.2.0 \
//     --tag headlamp-openfeature-v0.2.0 \
//     --archive-url https://github.com/.../headlamp-openfeature-0.2.0.tar.gz \
//     --checksum <sha256-hex> \
//     --created-at 2026-07-20T12:00:00Z

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = join(REPO_ROOT, 'artifacthub', 'artifacthub-pkg.template.yml');
const PACKAGE = 'headlamp-openfeature';

/** Parse `--key value` pairs into an object. */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      args[token.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const required = ['version', 'tag', 'archive-url', 'checksum', 'created-at'];
const missing = required.filter(key => !args[key]);
if (missing.length > 0) {
  console.error(`gen-artifacthub-pkg: missing required argument(s): ${missing.join(', ')}`);
  process.exit(1);
}

// A bare sha256 hex string is expected; strip an accidental "sha256:" prefix so the template's
// own prefix is not doubled.
const checksum = args.checksum.replace(/^sha256:/i, '').trim();

const rendered = readFileSync(TEMPLATE, 'utf8')
  .replace(/__VERSION__/g, args.version)
  .replace(/__TAG__/g, args.tag)
  .replace(/__ARCHIVE_URL__/g, args['archive-url'])
  .replace(/__CHECKSUM__/g, checksum)
  .replace(/__CREATED_AT__/g, args['created-at'])
  // Drop the maintainer-only instructions block (delimited by markers) from the output.
  .replace(/# >>> template-instructions\n[\s\S]*?# <<< template-instructions\n/m, '');

const outDir = join(REPO_ROOT, 'artifacthub', PACKAGE, args.version);
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'artifacthub-pkg.yml');
writeFileSync(outFile, rendered);
console.log(`Wrote ${outFile}`);
