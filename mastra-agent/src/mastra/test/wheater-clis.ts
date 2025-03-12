#!/usr/bin/env node

import { mastra } from "..";
import readline from "readline";

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("🌤️  Weather Agent CLI");
console.log('Type your weather questions (e.g., "What\'s the weather in London today?")');
console.log('Type "exit" to quit\n');

// Main interaction loop
function askQuestion() {
  rl.question("> ", async (input) => {
    if (input.toLowerCase() === "exit") {
      console.log("Goodbye! 👋");
      rl.close();
      return;
    }

    try {
      console.log("Fetching weather information...");
      const response = await mastra.run({
        agent: "weatherAgent",
        input,
      });

      console.log("\nResponse:");
      console.log(response);
      console.log(); // Empty line for better readability
    } catch (error) {
      console.error("Error:", error.message);
    }

    // Continue the conversation
    askQuestion();
  });
}

// Start the interaction
askQuestion();
