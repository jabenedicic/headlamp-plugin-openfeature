// SPDX-License-Identifier: Apache-2.0
//
// Dependency-free SPDX-header guardrail. Ensures every TypeScript source file
// carries the Apache-2.0 SPDX identifier. With no arguments it recursively
// scans src/ for *.ts and *.tsx; with arguments it checks exactly those paths.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SPDX_TOKEN = 'SPDX-License-Identifier: Apache-2.0';

function walk(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...walk(full));
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      found.push(full);
    }
  }
  return found;
}

const args = process.argv.slice(2);
const targets = args.length > 0 ? args : walk('src');

const offenders = [];
for (const file of targets) {
  if (!existsSync(file)) {
    offenders.push(file);
    continue;
  }
  const content = readFileSync(file, 'utf8');
  if (!content.includes(SPDX_TOKEN)) {
    offenders.push(file);
  }
}

if (offenders.length > 0) {
  for (const file of offenders) {
    process.stderr.write(`Missing SPDX header: ${file}\n`);
  }
  process.exit(1);
}

process.exit(0);
