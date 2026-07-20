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

// "New feature flag" on the list: a guided form that builds a complete, schema-valid
// single-flag FeatureFlag CR from a starter template and POSTs it — valid on the first save,
// no raw YAML. The native CreateResourceButton stays as the power path for authoring a full
// multi-flag document; this optimises the common "create one flag" case.

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
import { buildFeatureFlagResource, buildTemplateFlag, type FlagTemplate } from '../lib/flag-set';

/** RFC1123 label: lowercase alphanumerics and '-', starting/ending alphanumeric. */
const RFC1123_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

function CreateDialog({ onClose }: { onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [name, setName] = useState('');
  const [namespace, setNamespace] = useState('default');
  const [flagKey, setFlagKey] = useState('');
  const [template, setTemplate] = useState<FlagTemplate>('boolean');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleCreate() {
    const trimmedName = name.trim();
    const trimmedNs = namespace.trim();
    const key = flagKey.trim() || trimmedName;
    if (!RFC1123_LABEL.test(trimmedName)) {
      setError('Name must be a lowercase RFC 1123 label (letters, digits, hyphens).');
      return;
    }
    if (trimmedNs.length === 0) {
      setError('Enter a namespace.');
      return;
    }
    if (key.length === 0) {
      setError('Enter a flag name.');
      return;
    }
    setError('');
    setSaving(true);
    FeatureFlagClass.apiEndpoint
      .post(buildFeatureFlagResource(trimmedName, trimmedNs, key, buildTemplateFlag(template)))
      .then(() => {
        enqueueSnackbar(`FeatureFlag "${trimmedName}" created`, { variant: 'success' });
        onClose();
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        enqueueSnackbar(`Could not create "${trimmedName}": ${message}`, { variant: 'error' });
      })
      .finally(() => setSaving(false));
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-label="New feature flag">
      <DialogTitle>New feature flag</DialogTitle>
      <DialogContent>
        <TextField
          label="Name"
          value={name}
          onChange={event => setName(event.target.value)}
          fullWidth
          margin="normal"
          helperText="Resource name (lowercase RFC 1123 label)."
        />
        <TextField
          label="Namespace"
          value={namespace}
          onChange={event => setNamespace(event.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Flag name"
          value={flagKey}
          onChange={event => setFlagKey(event.target.value)}
          fullWidth
          margin="normal"
          helperText="The flag's key in the set. Defaults to the resource name."
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
        <Button onClick={handleCreate} variant="contained" disabled={saving}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * The exported trigger: gated by `AuthVisible` on `create` checked against the resource class
 * (there is no instance yet). Opens the guided create dialog.
 */
export default function CreateFeatureFlagButton() {
  const [open, setOpen] = useState(false);
  return (
    <AuthVisible item={FeatureFlagClass} authVerb="create">
      <Button variant="outlined" size="small" onClick={() => setOpen(true)}>
        New feature flag
      </Button>
      {open && <CreateDialog onClose={() => setOpen(false)} />}
    </AuthVisible>
  );
}
