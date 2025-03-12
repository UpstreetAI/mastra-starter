import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';

import { MCPConfiguration } from "@mastra/mcp";

const mcp = new MCPConfiguration({
  servers: {
    // Telegram server configuration
    telegram: {
      command: "node",
      args: ["path/mcp-communicator-telegram/build/index.js"], //please add the correct path
      env: {
        TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN!,
        CHAT_ID: process.env.CHAT_ID!,
      },
    },
  },
});



export const telegramAgent = new Agent({
  name: "Telegram Bot",
  instructions: `
      You are a friendly Telegram bot that provides assistance.

      Your primary function is to help Telegram users. When responding:
      - Introduce yourself as a Telegram Bot in your first message
      - Keep responses concise and friendly
      - Be responsive to Telegram-specific commands like /start and /help
      
      When users send /start or /help, provide a brief introduction and explain how to use your services.
  `,
  model: openai("gpt-4o"),
  tools: { ...(await mcp.getTools()) },
});