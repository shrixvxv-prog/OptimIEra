import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const ignored = new Set([
  '.git',
  'node_modules',
  '.next',
  'build',
  'dist',
  'test-results',
  'playwright-report',
  '.github',
]);
const secretPattern = /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/i;
const bannedPattern =
  /(?:execute|call|submit|broadcast|deploy)[^\n]{0,80}(?:0g|wallet|ai inference)/i;
const violations = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name) || entry.name.startsWith('.env')) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (/\.(?:ts|tsx|js|mjs|json|md|yml|yaml|prisma|env\.example)$/.test(entry.name)) {
      const text = await readFile(path, 'utf8');
      if (secretPattern.test(text)) violations.push(`${relative(root, path)}: possible secret`);
      if (
        !path.endsWith('verify-safety.mjs') &&
        /\.(?:ts|tsx|js|mjs)$/.test(entry.name) &&
        bannedPattern.test(text)
      )
        violations.push(`${relative(root, path)}: prohibited runtime claim`);
    }
  }
}

await walk(root);
if (violations.length) {
  console.error(violations.join('\n'));
  process.exit(1);
}
console.log('Safety scan passed.');
