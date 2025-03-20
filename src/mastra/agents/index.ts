import fs from "fs";
import path from "path";
import { createOpenAI } from "@ai-sdk/openai";
import { Agent, ToolsInput } from "@mastra/core/agent";
import dedent from "dedent";
import { PnpmPackageLookup } from "pnpm-package-lookup";
import { MCPConfiguration } from "@mastra/mcp";
import { ComposioIntegration } from "@mastra/composio";
import { sortPlugins, getNpmPackageType } from "../../../util.mjs";

const rootDir = path.resolve(process.cwd(), "..", "..");

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
const pnpmLockYamlPath = path.resolve(rootDir, "pnpm-lock.yaml");
const pnpmPackageLookup = new PnpmPackageLookup({
  pnpmLockYamlPath,
});
for (const pluginSpecifier of npmPlugins) {
  const npmPackageType = getNpmPackageType(pluginSpecifier);

  let pluginSpecifier2;
  const packagesDir = path.resolve(rootDir, "packages");
  if (npmPackageType === "github") {
    const packageBasename = path.basename(
      pluginSpecifier.replace("github:", "")
    );
    const packageResolvedName = `file:${path.resolve(packagesDir, packageBasename)}`;
    pluginSpecifier2 =
      await pnpmPackageLookup.getPackageNameBySpecifier(packageResolvedName);
    if (!pluginSpecifier2) {
      throw new Error(
        `Could not resolve package name for ${JSON.stringify(
          {
            pluginSpecifier,
            packageBasename,
            packageResolvedName,
          },
          null,
          2
        )}`
      );
    }
  } else {
    pluginSpecifier2 = pluginSpecifier;
  }
  const packagePath = path.resolve(rootDir, "packages", pluginSpecifier2);
  // check if start script exists
  const packageJsonPath = path.resolve(packagePath, "package.json");
  const packageJson = JSON.parse(
    await fs.promises.readFile(packageJsonPath, "utf8")
  );
  const pluginName =
    pluginSpecifier
      .split("/")
      .pop()
      ?.replace(/[^a-zA-Z0-9]/g, "") || "plugin"; // the name have to be a valid json property
  if (packageJson.scripts.start) {
    servers[pluginName] = {
      command: "pnpm",
      args: ["--dir", packagePath, "--silent", "start"],
      env: process.env as any,
    };
  } else {
    // check if any bins exist; if so, use the first one
    if (packageJson.bin && Object.keys(packageJson.bin).length > 0) {
      const firstBin = Object.keys(packageJson.bin)[0];
      servers[pluginName] = {
        command: "pnpm",
        args: ["--dir", packagePath, "--silent", "exec", firstBin],
        env: process.env as any,
      };
    } else {
      throw new Error(
        `No start script or bins found for ${pluginSpecifier} name ${pluginName}`
      );
    }
  }
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
