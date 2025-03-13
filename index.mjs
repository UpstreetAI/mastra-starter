#!/usr/bin/env node

import path from 'path';
import child_process from 'child_process';

import { Command } from 'commander';
import dotenv from 'dotenv';

// node index.mjs --character=trump.character.json
/*
pnpm install github:v-3/discordmcp
*/
const main = async () => {
  dotenv.config();

  const program = new Command();

  program
    .command('dev')
    .description('Run Mastra')
    .requiredOption('--character <string>', 'character json file path')
    .action((options) => {
      const character = options.character;
      const characterJsonPath = path.resolve(process.cwd(), character);

      const mastraPath = import.meta.resolve('mastra').replace('file://', '');
      const cp = child_process.spawn(process.execPath, [mastraPath, 'dev'], {
        env: {
          ...process.env,
          CHARACTER_JSON_PATH: characterJsonPath,
        },
      });
      cp.stdout.pipe(process.stdout);
      cp.stderr.pipe(process.stderr);
    });

  program.parse(process.argv);
};
(async () => {
  await main();
})();
