
import { Mastra } from '@mastra/core/mastra';
import { createLogger } from '@mastra/core/logger';

import { characterAgent } from "./agents";

export const mastra = new Mastra({
  agents: { characterAgent },
  logger: createLogger({
    name: "Mastra",
    level: "info",
  }),
});
