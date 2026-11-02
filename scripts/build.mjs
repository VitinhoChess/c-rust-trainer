import { cp, mkdir, rm } from 'node:fs/promises';
import { BANK_FILES } from '../assets/core.js';
const output = new URL('../dist/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of ['index.html', 'assets']) {
  await cp(new URL('../' + path, import.meta.url), new URL(path, output), { recursive: true });
}

await mkdir(new URL('database/', output), { recursive: true });
for (const file of BANK_FILES) {
  await cp(new URL('../database/' + file, import.meta.url), new URL('database/' + file, output));
}
console.log('Site statique prêt dans dist/ — banques C, C++ et Rust.');
