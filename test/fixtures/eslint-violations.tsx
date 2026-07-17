// Deliberately-violating fixture: triggers every repository guardrail.
// Lives outside src/ so it is never linted, type-checked, spdx-scanned, or bundled.
// It is exercised only by test/guardrails.test.ts via the ESLint programmatic API.

import { registerRoute } from '@kinvolk/headlamp-plugin/lib/plugin/registry';
import * as MUI from '@mui/material';
import Button from '@mui/material/Button';
import red from '@mui/material/colors/red';
import axios from 'axios';

const hexColour = '#ff0000';
const pxSize = '16px';

export function Violations() {
  registerRoute({});
  fetch('/x');
  const xhr = new XMLHttpRequest();
  const winFetch = window.fetch('/y');
  localStorage.getItem('x');
  sessionStorage.setItem('y', 'z');
  const ws = new WebSocket('/ws');
  const es = new EventSource('/es');
  window.localStorage.getItem('a');
  window.sessionStorage.setItem('b', 'c');
  const wws = new window.WebSocket('/wws');
  const wes = new window.EventSource('/wes');

  return (
    <MUI.Box style={{ color: hexColour, width: pxSize }}>
      <div dangerouslySetInnerHTML={{ __html: '<b>hi</b>' }} />
      <Button>ok</Button>
      <img src="x" />
      {String(xhr)}
      {String(winFetch)}
      {String(red)}
      {String(axios)}
      {String(ws)}
      {String(es)}
      {String(wws)}
      {String(wes)}
    </MUI.Box>
  );
}
