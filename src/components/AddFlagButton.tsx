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

// "Add flag" on a FeatureFlag detail: add a new flag to the existing set from a starter
// template (boolean or multi-variant) without hand-editing the CR YAML. The write is an
// additive JSON merge patch inserting one new key — additive, so there is no null-diff and
// no sibling risk — guarded only by a duplicate pre-check (RFC 7386 would silently merge onto
// an existing key). The user refines the seeded flag afterwards via the per-flag Edit form.

import { AuthVisible } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { FeatureFlagClass } from '../k8s/resources';
import {
  buildAddFlagMergePatch,
  buildTemplateFlag,
  flagKeyExists,
  type FlagTemplate,
} from '../lib/flag-set';
import { isExternallyManaged } from '../lib/gitops-detector';
import type { FeatureFlagResource } from './FlagStateToggle';

/** Additive patch: instance method first (as 6.1 proved), static fallback otherwise. */
function patchAdd(resource: FeatureFlagResource, body: object): Promise<unknown> {
  if (typeof resource.patch === 'function') {
    return resource.patch(body as never);
  }
  const mergePatch = FeatureFlagClass.apiEndpoint.patch as unknown as (
    b: object,
    namespace: string | undefined,
    name: string | undefined
  ) => Promise<unknown>;
  return mergePatch(
    body,
    resource.jsonData?.metadata?.namespace,
    resource.jsonData?.metadata?.name
  );
}

function AddFlagDialog({
  resource,
  onClose,
}: {
  resource: FeatureFlagResource;
  onClose: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [flagKey, setFlagKey] = useState('');
  const [template, setTemplate] = useState<FlagTemplate>('boolean');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleAdd() {
    const key = flagKey.trim();
    if (key.length === 0) {
      setError('Enter a flag name.');
      return;
    }
    if (flagKeyExists(resource as never, key)) {
      setError(`A flag named "${key}" already exists in this resource.`);
      return;
    }
    setError('');
    setSaving(true);
    patchAdd(resource, buildAddFlagMergePatch(key, buildTemplateFlag(template)))
      .then(() => {
        enqueueSnackbar(`Flag "${key}" added`, { variant: 'success' });
        onClose();
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        enqueueSnackbar(`Could not add flag "${key}": ${message}`, { variant: 'error' });
      })
      .finally(() => setSaving(false));
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-label="Add flag">
      <DialogTitle>Add flag</DialogTitle>
      <DialogContent>
        <TextField
          label="Flag name"
          value={flagKey}
          onChange={event => setFlagKey(event.target.value)}
          fullWidth
          margin="normal"
          error={error.length > 0}
          helperText="A unique key within this resource. You can refine variants after adding."
        />
        <FormControl component="fieldset" margin="normal">
          <FormLabel component="legend">Template</FormLabel>
          <RadioGroup
            value={template}
            onChange={event => setTemplate(event.target.value as FlagTemplate)}
          >
            <FormControlLabel value="boolean" control={<Radio />} label="Boolean (on / off)" />
            <FormControlLabel
              value="multi-variant"
              control={<Radio />}
              label="Multi-variant (two string variants)"
            />
          </RadioGroup>
        </FormControl>
        {error.length > 0 && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleAdd} variant="contained" disabled={saving}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * The exported trigger: gated by `AuthVisible` on `patch` and hidden for externally-managed
 * resources (the same body-level guard as the toggle/edit controls). Opens the add dialog.
 */
export default function AddFlagButton({ resource }: { resource: FeatureFlagResource }) {
  const [open, setOpen] = useState(false);

  if (isExternallyManaged(resource)) {
    return null;
  }

  const namespace = resource.jsonData?.metadata?.namespace;
  return (
    <AuthVisible item={resource} authVerb="patch" namespace={namespace}>
      <Button variant="outlined" size="small" onClick={() => setOpen(true)}>
        Add flag
      </Button>
      {open && <AddFlagDialog resource={resource} onClose={() => setOpen(false)} />}
    </AuthVisible>
  );
}
