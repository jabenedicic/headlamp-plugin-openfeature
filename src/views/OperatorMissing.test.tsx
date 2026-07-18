/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it } from 'vitest';
import { isOperatorMissing } from './OperatorMissing';

describe('isOperatorMissing', () => {
  it.each([
    ['a 404, which means the CRD is absent', { status: 404 }, true],
    ['a 403, which means RBAC denied us — the operator may well exist', { status: 403 }, false],
    ['a 500, which is a real server error', { status: 500 }, false],
    ['no error at all', null, false],
    ['an undefined error', undefined, false],
    ['an error with no status', {}, false],
  ])('returns the right verdict for %s', (_label, error, expected) => {
    expect(isOperatorMissing(error as never)).toBe(expected);
  });
});
