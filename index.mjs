#!/usr/bin/env node

import path from 'path';
import fs from 'fs';

import { Command } from 'commander';
import dotenv from 'dotenv';

import {
  runCharacter,
  getPluginType,
  installNpmPackages,
  buildNpmPackages,
} from "./util.mjs";

const main = async () => {
  dotenv.config();

  const program = new Command();

  program
    .command('dev')
    .description('Run Mastra')
    .argument('<character>', 'character json file path')
    .action(async (character) => {
      if (!character) {
        console.error('Character json file path is required');
        process.exit(1);
      }

      const characterJsonPath = path.resolve(process.cwd(), character);

      try {
        await runCharacter(characterJsonPath, {
          env: process.env,
        });
      } catch (error) {
        console.error(`Error in dev command: ${error.message}`);
      }
      process.exit(1);
    });

  program
    .command('install')
    .alias('i')
    .description('Install packages using pnpm')
    .argument('<packages...>', 'packages to install')
    .action(async (packages) => {
      try {
        await installNpmPackages(packages);
        await buildNpmPackages(packages);
      } catch (error) {
        console.error(`Error in install command: ${error.message}`);
      }
      process.exit(1);
    });
  
  program
    .command('installall')
    .alias('ia')
    .description('Install all plugins from character.json files')
    .argument('<files...>', 'character.json file paths')
    .action(async (files) => {
      try {
        const pluginsToInstall = new Set();
        
        for (const file of files) {
          const characterJsonPath = path.resolve(process.cwd(), file);
          const characterJsonString = await fs.promises.readFile(characterJsonPath, 'utf8');
          const characterJson = JSON.parse(characterJsonString);
          
          if (characterJson.plugins && Array.isArray(characterJson.plugins)) {
            characterJson.plugins.forEach(plugin => {
              if (getPluginType(plugin) === 'npm') {
                pluginsToInstall.add(plugin);
              }
            });
          }
        }
        
        if (pluginsToInstall.size === 0) {
          console.log('No plugins found to install');
          return;
        }
        
        await installNpmPackages([...pluginsToInstall]);
        await buildNpmPackages([...pluginsToInstall]);
      } catch (error) {
        console.error(`Error in installall command: ${error.message}`);
      }
      process.exit(1);
    });

  program
    .command('build')
    .alias('b')
    .description('Build packages without installing them')
    .argument('<packages...>', 'packages to build')
    .action(async (packages) => {
      try {
        await buildNpmPackages(packages);
      } catch (error) {
        console.error(`Error in build command: ${error.message}`);
      }
      process.exit(1);
    });

  program
    .command('buildall')
    .alias('ba')
    .description('Build all plugins from character.json files')
    .argument('<files...>', 'character.json file paths')
    .action(async (files) => {
      try {
        const pluginsToBuild = new Set();
        
        for (const file of files) {
          const characterJsonPath = path.resolve(process.cwd(), file);
          const characterJsonString = await fs.promises.readFile(characterJsonPath, 'utf8');
          const characterJson = JSON.parse(characterJsonString);
          
          if (characterJson.plugins && Array.isArray(characterJson.plugins)) {
            characterJson.plugins.forEach(plugin => {
              if (getPluginType(plugin) === 'npm') {
                pluginsToBuild.add(plugin);
              }
            });
          }
        }
        
        if (pluginsToBuild.size === 0) {
          console.log('No plugins found to build');
          return;
        }
        
        await buildNpmPackages([...pluginsToBuild]);
      } catch (error) {
        console.error(`Error in buildall command: ${error.message}`);
      }
      process.exit(1);
    });

  program.parse(process.argv);
};
(async () => {
  await main();
})();
