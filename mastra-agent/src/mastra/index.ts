
import { Mastra } from '@mastra/core/mastra';
import { createLogger } from '@mastra/core/logger';

import { telegramAgent } from "./agents";

export const mastra = new Mastra({
  agents: { telegramAgent },
  logger: createLogger({
    name: "Mastra",
    level: "info",
  }),
});
