// SPDX-License-Identifier: Apache-2.0
//
// size-limit budget for the plugin bundle. AR4 (Story 1.2 feasibility) proved
// the Headlamp SDK builds a single UMD `dist/main.js` with no lazy chunks, so
// this gates that one file — no per-chunk sub-budgets. Uses @size-limit/file to
// measure the gzipped size of the built artifact.
module.exports = [
  {
    path: 'dist/main.js',
    limit: '500 KB',
    gzip: true,
  },
];
