import { spawnSync } from 'node:child_process';
import process from 'node:process';

const args = process.argv.slice(2);
const distro = process.env.OPTIMIERA_WSL_DISTRO || 'Ubuntu-24.04';
const windowsPath = process.cwd().replaceAll('\\', '/');
const wslPath = `/mnt/${windowsPath[0].toLowerCase()}${windowsPath.slice(2)}`;
const command = `cd '${wslPath.replaceAll("'", "'\\''")}' && /home/msi/.foundry/bin/forge ${args.map((arg) => `'${arg.replaceAll("'", "'\\''")}'`).join(' ')}`;
const result = spawnSync('wsl.exe', ['-d', distro, '--', 'bash', '-lc', command], {
  stdio: 'inherit',
  shell: false,
});
if (result.error) {
  console.error('Foundry is unavailable. Install Foundry inside WSL2 or set OPTIMIERA_WSL_DISTRO.');
  process.exit(2);
}
process.exit(result.status ?? 2);
