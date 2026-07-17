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

// Clean fixture: only allowed patterns. Doubles as the SPDX-pass fixture.
// Includes deliberate near-misses that MUST pass: a permitted @mui/material/styles
// deep import (the negation exception) and unitless theme spacing (not a px literal).

import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';

const Panel = styled(Box)({});

export function Clean() {
  return (
    <Panel sx={{ m: 2, p: 8 }}>
      <img src="x" alt="ok" />
    </Panel>
  );
}
