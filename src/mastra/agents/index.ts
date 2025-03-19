import fs from "fs";
import path from "path";
import { createOpenAI } from "@ai-sdk/openai";
import { Agent, ToolsInput } from "@mastra/core/agent";
import dedent from "dedent";
import { MCPConfiguration } from "@mastra/mcp";
import { ComposioIntegration } from "@mastra/composio";
import { sortPlugins } from "../../../util.mjs";

const characterJsonPath = process.env._CHARACTER_JSON_PATH as string;
const characterJsonString = await fs.promises.readFile(
  characterJsonPath,
  "utf8"
);
const characterJson = JSON.parse(characterJsonString);

// sort plugins
const { plugins = [] } = characterJson;
const { npm: npmPlugins, composio: composioPlugins } = sortPlugins(plugins);

// resolve npm plugins
const servers: Record<string, any> = {};
for (const plugin of npmPlugins) {
  const packagePath = path.resolve(process.cwd(), "packages", plugin);
  servers[plugin] = {
    command: "pnpm",
    args: ["--dir", packagePath, "start"],
    env: process.env as any,
  };
}

// mcp tools
const mcp = new MCPConfiguration({
  servers,
});
const mcpTools = await mcp.getTools();

// composio tools
const composioApiKey = process.env.COMPOSIO_API_KEY;
const composioAccountId = process.env.COMPOSIO_ACCOUNT_ID;
let composioToolset: ToolsInput | undefined;
if (composioApiKey && composioAccountId) {
  const composio = new ComposioIntegration({
    config: {
      API_KEY: composioApiKey,
      entityId: "default",
      connectedAccountId: composioAccountId,
    },
  });
  // const actionsEnums = [
  //   'GITHUB_STAR_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER',
  //   'GITHUB_ACTIVITY_LIST_STARGAZERS_FOR_REPO',
  //   'GITHUB_GET_OCTOCAT',
  // ];
  const actionsEnums = composioPlugins.map((plugin: string) =>
    plugin.replace("composio:", "")
  );
  composioToolset = (await composio.getTools({
    actions: actionsEnums,
  })) as ToolsInput;
}

// agent
const model = createOpenAI({
  baseURL: process.env.OPENAI_API_URL || "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY,
})("gpt-4o");
export const characterAgent = new Agent({
  name: "Character",
  instructions:
    dedent`\
    You are the following character:
  ` +
    "\n" +
    JSON.stringify(characterJson, null, 2),
  model,
  tools: {
    // ToolsInput = string -> ToolAction
    ...mcpTools,
    ...composioToolset,
  },
});
