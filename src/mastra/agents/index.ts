import fs from 'fs';
import path from 'path';
import { openai } from '@ai-sdk/openai';
import { Agent, ToolsInput } from '@mastra/core/agent';
import dedent from 'dedent';
import { MCPConfiguration } from "@mastra/mcp";
import { ComposioIntegration } from '@mastra/composio';
import { sortPlugins } from '../../../util.mjs';
import { PnpmPackageLookup } from 'pnpm-package-lookup';

// character
const packageLookup = new PnpmPackageLookup({
  pnpmLockYamlPath: path.join('..', '..', 'pnpm-lock.yaml'),
});
const characterJsonPath = process.env._CHARACTER_JSON_PATH as string;
const characterJsonString = await fs.promises.readFile(characterJsonPath, 'utf8');
const characterJson = JSON.parse(characterJsonString);

// sort plugins
const { plugins = [] } = characterJson;
const {
  npm: npmPlugins,
  composio: composioPlugins,
} = sortPlugins(plugins);

// resolve npm plugins
const servers: Record<string, any> = {};
for (const plugin of npmPlugins) {
  // find the package name matching this specifier
  const packageName = await packageLookup.getPackageNameBySpecifier(plugin);
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

// mcp tools
const mcp = new MCPConfiguration({
  servers,
});
const mcpTools = await mcp.getTools();

// composio tools
const composio = new ComposioIntegration({
  config: {
    API_KEY: process.env.COMPOSIO_API_KEY!,
    entityId: 'default',
    // connectedAccountId: '899144e5-a466-428b-8a00-7c931fb57f9f',
    connectedAccountId: '4d79004e-320a-4dc9-be1a-1037a6fe9866',
  },
});
// const actionsEnums = [
//   'GITHUB_STAR_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER',
//   'GITHUB_ACTIVITY_LIST_STARGAZERS_FOR_REPO',
//   'GITHUB_GET_OCTOCAT',
// ];
const actionsEnums = composioPlugins.map((plugin) => plugin.replace('composio:', ''));
const composioToolset = await composio.getTools({
  actions: actionsEnums,
}) as ToolsInput;

// agent
export const characterAgent = new Agent({
  name: "Character",
  instructions: dedent`\
    You are the following character:
  ` + '\n' + JSON.stringify(characterJson, null, 2),
  model: openai("gpt-4o"),
  tools: { // ToolsInput = string -> ToolAction
    ...mcpTools,
    ...composioToolset,
  },
});