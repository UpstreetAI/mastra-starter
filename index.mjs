import { Command } from 'commander';
import dotenv from 'dotenv';

const main = async () => {
  // Load environment variables from .env file
  dotenv.config();

  const program = new Command();

  program
    .option('--character <string>', 'character json file path')
    .parse(process.argv);

  const options = program.opts();

  const character = options.character || 'default';
  console.log(`Hello, world! Character: ${character}`);
};

(async () => {
  await main();
})();
