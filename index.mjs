import child_process from 'child_process';

import { Command } from 'commander';
import dotenv from 'dotenv';

const main = async () => {
  dotenv.config();

  const program = new Command();

  program
    .option('--character <string>', 'character json file path')
    .parse(process.argv);

  const options = program.opts();

  const character = options.character || 'default';

  const cp = child_process.spawn('mastra', ['dev'], {
    env: {
      CHARACTER_JSON_PATH: character,
    },
  });
  cp.stdout.pipe(process.stdout);
  cp.stderr.pipe(process.stderr);
};
(async () => {
  await main();
})();
