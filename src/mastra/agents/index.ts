import fs from 'fs';
import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import dedent from 'dedent';
import { MCPConfiguration } from "@mastra/mcp";

const characterJsonPath = process.env.CHARACTER_JSON_PATH as string;
const characterJsonString = await fs.promises.readFile(characterJsonPath, 'utf8');
const characterJson = JSON.parse(characterJsonString);

const mcp = new MCPConfiguration({
  servers: {
    // telegram: {
    //   command: "node",
    //   args: ["path/mcp-communicator-telegram/build/index.js"], //please add the correct path
    //   env: {
    //     TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN!,
    //     CHAT_ID: process.env.CHAT_ID!,
    //   },
    // },
  },
});

export const characterAgent = new Agent({
  name: "Character",
  instructions: dedent`\
    You are the following character:
  ` + '\n' + JSON.stringify(characterJson, null, 2),
  model: openai("gpt-4o"),
  tools: { ...(await mcp.getTools()) },
});