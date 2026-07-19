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

// A per-flag edit form for one flag inside a multi-flag FeatureFlag set: description,
// variants (name + typed JSON value, add/remove, a radio to pick the default), and a
// read-only targeting preview. Saving issues a scoped merge patch on that one flag entry
// (the same mechanism as the 6.1 state toggle), with removed variant keys nulled so the
// server converges to exactly the form's set. Sibling flags and unmanaged fields — crucially
// the opaque targeting JSONLogic — are never in the patch body, so they cannot be dropped.
//
// The resource is the single source of truth: the form is a transient view assembled when it
// opens and discarded on close. No reducer, no form/YAML sync — real targeting edits go to
// the native YAML editor (the resource's Edit action).

import { AuthVisible } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Box,
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
import { useRef, useState } from 'react';
import { FeatureFlagClass } from '../k8s/resources';
import { buildFlagMergePatch, getFlagDescription, parseVariantValue } from '../lib/flag-set';
import { isExternallyManaged } from '../lib/gitops-detector';
import type { FlagDefinition } from '../types/feature-flag';
import type { FeatureFlagResource } from './FlagStateToggle';

/** One editable variant row; `value` is the raw JSON text the user edits. */
interface VariantRow {
  id: number;
  name: string;
  value: string;
}

interface FlagFormProps {
  resource: FeatureFlagResource;
  flagName: string;
  flag: FlagDefinition;
  open: boolean;
  onClose: () => void;
}

/** Serialise a variant value back to editable JSON text (objects pretty-printed inline). */
function toEditableValue(value: unknown): string {
  return JSON.stringify(value);
}

/** Build the initial variant rows from the flag's current variants. */
function initialRows(flag: FlagDefinition): VariantRow[] {
  const variants = flag.variants;
  if (!variants || typeof variants !== 'object') {
    return [];
  }
  return Object.entries(variants).map(([name, value], index) => ({
    id: index,
    name,
    value: toEditableValue(value),
  }));
}

/** Issue the scoped patch: instance method first (as 6.1 proved), static fallback otherwise. */
function patchFlag(resource: FeatureFlagResource, body: object): Promise<unknown> {
  if (typeof resource.patch === 'function') {
    return resource.patch(body as never);
  }
  const mergePatch = FeatureFlagClass.apiEndpoint.patch as unknown as (
    b: object,
    namespace: string | undefined,
    name: string | undefined
  ) => Promise<unknown>;
  return mergePatch(body, resource.jsonData?.metadata?.namespace, resource.jsonData?.metadata?.name);
}

/** Does this flag carry targeting rules worth showing read-only? */
function hasTargeting(flag: FlagDefinition): boolean {
  const targeting = flag.targeting;
  return !!targeting && typeof targeting === 'object' && Object.keys(targeting).length > 0;
}

/** The edit dialog. Controlled by `open`; assembles its state fresh each time it mounts. */
export function FlagForm({ resource, flagName, flag, open, onClose }: FlagFormProps) {
  const { enqueueSnackbar } = useSnackbar();
  const originalNames = useRef(Object.keys(flag.variants ?? {}));
  const nextId = useRef(initialRows(flag).length);
  const [description, setDescription] = useState(getFlagDescription(flag) ?? '');
  const [defaultVariant, setDefaultVariant] = useState(flag.defaultVariant ?? '');
  const [rows, setRows] = useState<VariantRow[]>(() => initialRows(flag));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateRow(id: number, patch: Partial<VariantRow>) {
    setRows(current => current.map(row => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows(current => [...current, { id: nextId.current++, name: '', value: '""' }]);
  }

  function removeRow(id: number) {
    setRows(current => current.filter(row => row.id !== id));
  }

  function handleSave() {
    const variants: Record<string, unknown> = {};
    for (const row of rows) {
      const name = row.name.trim();
      if (name.length === 0) {
        continue;
      }
      variants[name] = parseVariantValue(row.value);
    }
    const currentNames = new Set(Object.keys(variants));
    if (defaultVariant.length > 0 && !currentNames.has(defaultVariant)) {
      setError(`Default variant "${defaultVariant}" is not one of the variants.`);
      return;
    }
    const removedVariantNames = originalNames.current.filter(name => !currentNames.has(name));

    setError('');
    setSaving(true);
    patchFlag(
      resource,
      buildFlagMergePatch(flagName, {
        description: description.trim().length > 0 ? description : null,
        defaultVariant,
        variants,
        removedVariantNames,
      })
    )
      .then(() => {
        enqueueSnackbar(`Flag "${flagName}" updated`, { variant: 'success' });
        onClose();
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        enqueueSnackbar(`Could not update flag "${flagName}": ${message}`, { variant: 'error' });
      })
      .finally(() => setSaving(false));
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-label={`Edit flag ${flagName}`}>
      <DialogTitle>Edit flag &quot;{flagName}&quot;</DialogTitle>
      <DialogContent>
        <TextField
          label="Description"
          value={description}
          onChange={event => setDescription(event.target.value)}
          fullWidth
          multiline
          margin="normal"
          helperText="Shown on the flag's detail. Leave empty to remove it."
        />

        <FormControl component="fieldset" margin="normal" fullWidth error={error.length > 0}>
          <FormLabel component="legend">Variants</FormLabel>
          <RadioGroup
            value={defaultVariant}
            onChange={event => setDefaultVariant(event.target.value)}
          >
            {rows.map(row => (
              <Box key={row.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <FormControlLabel
                  value={row.name}
                  control={<Radio inputProps={{ 'aria-label': `Default variant ${row.name}` }} />}
                  label=""
                  sx={{ m: 0 }}
                />
                <TextField
                  label="Name"
                  value={row.name}
                  onChange={event => updateRow(row.id, { name: event.target.value })}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Value (JSON)"
                  value={row.value}
                  onChange={event => updateRow(row.id, { value: event.target.value })}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <Button
                  onClick={() => removeRow(row.id)}
                  color="warning"
                  size="small"
                  aria-label={`Remove variant ${row.name}`}
                >
                  Remove
                </Button>
              </Box>
            ))}
          </RadioGroup>
          <Box sx={{ mt: 1 }}>
            <Button onClick={addRow} size="small" variant="outlined">
              Add variant
            </Button>
          </Box>
        </FormControl>

        {hasTargeting(flag) && (
          <Box sx={{ mt: 2 }}>
            <FormLabel component="legend">Targeting (read-only)</FormLabel>
            <TextField
              value={JSON.stringify(flag.targeting, null, 2)}
              fullWidth
              multiline
              margin="normal"
              InputProps={{ readOnly: true }}
              helperText="Edit targeting rules through the resource's Edit (YAML) action."
            />
          </Box>
        )}

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
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * The exported trigger: an "Edit flag" button gated by `AuthVisible` on the `patch` verb and
 * hidden for externally-managed resources (the same body-level guard as the 6.1 toggle, which
 * the header-actions processor cannot reach). Opens the form.
 */
export default function FlagEditButton({
  resource,
  flagName,
  flag,
}: {
  resource: FeatureFlagResource;
  flagName: string;
  flag: FlagDefinition;
}) {
  const [open, setOpen] = useState(false);

  if (isExternallyManaged(resource)) {
    return null;
  }

  const namespace = resource.jsonData?.metadata?.namespace;
  return (
    <AuthVisible item={resource} authVerb="patch" namespace={namespace}>
      <Button variant="outlined" size="small" onClick={() => setOpen(true)}>
        Edit flag
      </Button>
      {/*
        Mount the form only while open so it assembles fresh state from the CURRENT flag on
        every open. Keeping it permanently mounted would freeze its initial variants/description
        at first render, so edits made after a prior save (and watch revalidation) would compute
        removals against a stale baseline — silently dropping the null needed to delete a key.
      */}
      {open && (
        <FlagForm
          resource={resource}
          flagName={flagName}
          flag={flag}
          open
          onClose={() => setOpen(false)}
        />
      )}
    </AuthVisible>
  );
}
