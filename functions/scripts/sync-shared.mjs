// The award logic must be identical in the extension and on the server, so the
// single copy lives in /shared and is mirrored into functions/src/shared before
// every build. functions/src/shared is gitignored — never edit it by hand.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const from = resolve(here, '../../shared');
const to = resolve(here, '../src/shared');

rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
cpSync(from, to, { recursive: true });
console.log('synced /shared -> functions/src/shared');
