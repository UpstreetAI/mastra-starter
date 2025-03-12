#!/usr/bin/env node

import path from 'path';
import child_process from 'child_process';

import { Command } from 'commander';
import dotenv from 'dotenv';

const __dirname = path.dirname(import.meta.url.replace('file://', ''));

// node index.mjs --character='/Users/a/eliza/characters/trump.character.json'
const main = async () => {
  dotenv.config();

  const program = new Command();

  program
    .option('--character <string>', 'character json file path')
    .parse(process.argv);

  const options = program.opts();

  const character = options.character || 'default';

  const mastraPath = import.meta.resolve('mastra').replace('file://', '');
  const cp = child_process.spawn(process.execPath, [mastraPath, 'dev'], {
    env: {
      ...process.env,
      CHARACTER_JSON_PATH: character,
    },
  });
  cp.stdout.pipe(process.stdout);
  cp.stderr.pipe(process.stderr);
};
(async () => {
  await main();
})();
