import { exec, getEnv } from './util';
import { init as cacheInit } from 'renovate/dist/workers/global/cache';
import os from 'os';
import { existsSync } from 'fs';
import log from './utils/logger';

cacheInit(os.tmpdir());

async function docker(...args: string[]): Promise<void> {
  await exec('docker', [...args]);
}
async function dockerRun(...args: string[]): Promise<void> {
  await docker('run', '--rm', ...args);
}

async function pythonBuilder(ws: string, version: string): Promise<void> {
  await dockerRun(
    '-u',
    'root',
    '-v',
    '-e',
    `PYTHON_VERSION=${version}`,
    `${ws}/.cache/python:/usr/local/python`,
    'builder'
  );
}

// async function dockerBuildx(...args: string[]): Promise<void> {
//   await docker('buildx', ...args);
// }

(async () => {
  try {
    const ws = process.cwd();
    const data = `${ws}/data/${getEnv('UBUNTU_VERSION')}`;

    // const github = new GitHub(process.env.GITHUB_TOKEN);

    // // Get owner and repo from context of payload that triggered the action
    // const { owner, repo } = context.repo;

    exec('mkdir', ['-p', `.cache/python`]);

    for (const version of ['3.7.2']) {
      if (existsSync(`${data}/python-${version}.tar.xz`)) {
        log('Skipping existing version:', version);
        continue;
      }

      log('Building version:', version);
      await pythonBuilder(ws, version);

      await exec('tar', [
        '-cJf',
        `./.cache/python-${version}.tar.xz`,
        '-C',
        '.cache/python',
        version,
      ]);
    }
  } catch (e) {
    log.error(e.message);
    process.exit(1);
  }
})();
