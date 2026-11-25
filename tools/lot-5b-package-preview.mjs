import { execFileSync } from 'node:child_process';
import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
const runtime = ['app', 'components', 'data', 'lib', 'prisma', 'public', 'auth.ts', 'proxy.ts',
  'next.config.ts', 'package.json', 'package-lock.json', 'postcss.config.mjs', 'prisma.config.ts', 'tsconfig.json'];
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

if (git('branch', '--show-current').trim() !== 'anniversary') throw Error('Branche Git inattendue.');
const candidates = [...new Set(git('ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...runtime)
  .split('\0').filter(Boolean))].filter(file => !file.startsWith('app/generated/') && !file.endsWith('.test.ts'));
const files = candidates.flatMap(file => {
  if (file.split('/').some(part => part.startsWith('.')) || /\.(?:env|pem|key|dump|sqlitedb|zip|csv)$/i.test(file)) {
    throw Error('Un fichier hors périmètre a été trouvé dans les sources de Preview.');
  }
  const source = join(root, file);
  let entry;
  try { entry = lstatSync(source); } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  const physical = relative(root, realpathSync(source));
  if (!entry.isFile() || entry.isSymbolicLink() || isAbsolute(physical) || physical === '..' || /^[.][.][/\\]/.test(physical)) {
    throw Error('Le paquet Preview contient une entrée inattendue.');
  }
  return [{ file, source }];
});
for (const required of ['package.json', 'package-lock.json', 'proxy.ts', 'prisma/schema.prisma',
  'app/admin/upmans/relationships/CreatorCreditDialog.tsx', 'lib/upman-creator-admin.ts']) {
  if (!files.some(({ file }) => file === required)) throw Error('Source Preview requise absente : ' + required);
}
const destination = mkdtempSync(join(tmpdir(), 'upmandex-5b-preview-'));
for (const { file, source } of files) {
  const target = join(destination, file);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}
console.log(destination);
