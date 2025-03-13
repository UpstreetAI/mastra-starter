import fs from 'fs';
import path from 'path';
import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import dedent from 'dedent';
import { MCPConfiguration } from "@mastra/mcp";
import yaml from 'yaml';

//

const pnpmLockYamlString = await fs.promises.readFile(path.join('..', '..', 'pnpm-lock.yaml'), 'utf8');
const pnpmLock = yaml.parse(pnpmLockYamlString);
const dependencies = pnpmLock.importers['.'].dependencies as Record<string, any>;
const specifiersToPackageNamesMap = new Map<string, string>();
for (const [packageName, packageInfo] of Object.entries(dependencies)) {
  if (packageInfo.specifier) {
    specifiersToPackageNamesMap.set(packageInfo.specifier, packageName);
  }
}

//

const characterJsonPath = process.env.CHARACTER_JSON_PATH as string;
const characterJsonString = await fs.promises.readFile(characterJsonPath, 'utf8');
const characterJson = JSON.parse(characterJsonString);
const { plugins = [] } = characterJson;

const servers: Record<string, any> = {};
for (const plugin of plugins) {
  // find the package name matching this specifier
  const packageName = specifiersToPackageNamesMap.get(plugin);
  if (!packageName) {
    throw new Error(`Package name not found for specifier: ${plugin}`);
  }

  const packagePath = import.meta.resolve(packageName).replace('file://', '');
  servers[plugin] = {
    command: "node",
    args: [packagePath],
    env: process.env as any,
  };
}
const mcp = new MCPConfiguration({
  servers,
});

export const characterAgent = new Agent({
  name: "Character",
  instructions: dedent`\
    You are the following character:
  ` + '\n' + JSON.stringify(characterJson, null, 2),
  model: openai("gpt-4o"),
  tools: { ...(await mcp.getTools()) },
});