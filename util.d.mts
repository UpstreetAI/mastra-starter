import { PnpmPackageLookup } from "pnpm-package-lookup";

export function runCharacter(
  characterJsonPath: string,
  options?: { env?: Record<string, string> }
): Promise<void>;

export function getPluginType(plugin: string): "composio" | "npm";

export function sortPlugins(plugins: string[]): {
  npm: string[];
  composio: string[];
};

export function installNpmPackages(packageSpecifiers: string[]): Promise<void>;

export function buildNpmPackages(packageSpecifiers: string[]): Promise<{
  success: boolean;
  results: Array<{
    success: boolean;
    package: string;
    error?: string;
  }>;
}>;
