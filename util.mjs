import path from "path";
import child_process from "child_process";
import { mkdirp } from "mkdirp";

export const runCharacter = async (characterJsonPath, { env = {} } = {}) => {
  const mastraPath = import.meta.resolve("mastra").replace("file://", "");
  const cp = child_process.spawn(process.execPath, [mastraPath, "dev"], {
    env: {
      ...env,
      _CHARACTER_JSON_PATH: characterJsonPath,
    },
  });
  cp.stdout.pipe(process.stdout);
  cp.stderr.pipe(process.stderr);

  return new Promise((resolve, reject) => {
    cp.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`));
      } else {
        resolve();
      }
    });

    cp.on("error", (error) => {
      reject(error);
    });
  });
};

export const getPluginType = (plugin) => {
  if (plugin.startsWith("composio:")) {
    return "composio";
  } else {
    return "npm";
  }
};
export const sortPlugins = (plugins) => {
  const npm = [];
  const composio = [];
  for (const plugin of plugins) {
    const pluginType = getPluginType(plugin);
    if (pluginType === "npm") {
      npm.push(plugin);
    } else if (pluginType === "composio") {
      composio.push(plugin);
    }
  }
  return {
    npm,
    composio,
  };
};

export const installNpmPackages = async (packageSpecifiers) => {
  console.log(`Installing packages: ${packageSpecifiers.join(", ")}`);

  // Ensure packages directory exists
  const packagesDir = path.resolve(process.cwd(), "packages");
  try {
    await mkdirp(packagesDir);
  } catch (error) {
    console.error(`Error creating packages directory: ${error.message}`);
    return Promise.reject(error);
  }

  return await new Promise((resolve, reject) => {
    const cp = child_process.spawn(
      "git",
      ["clone", "--depth", "1", ...packageSpecifiers],
      {
        stdio: "inherit",
        cwd: packagesDir,
      }
    );

    cp.on("error", (error) => {
      console.error(`Error executing git clone: ${error.message}`);
      reject(error);
    });

    cp.on("close", (code) => {
      if (code !== 0) {
        console.error(`git clone exited with code ${code}`);
        reject(new Error(`git clone exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
};
export const buildNpmPackages = async (packageSpecifiers) => {
  console.log(`Building packages: ${packageSpecifiers.join(", ")}`);

  // Instead of using packageLookup, extract package names from git URLs
  const packageNames = packageSpecifiers.map((url) => {
    // Extract the repo name from the git URL
    const parts = url.split("/");
    let repoName = parts[parts.length - 1];
    // Remove .git extension if present
    if (repoName.endsWith(".git")) {
      repoName = repoName.slice(0, -4);
    }
    return repoName;
  });

  const results = [];
  let allSuccessful = true;

  for (const packageName of packageNames) {
    console.log(`Building package: ${packageName}`);

    try {
      const p = path.resolve(process.cwd(), "packages", packageName);
      const cp = child_process.spawn("pnpm", ["build"], {
        stdio: "inherit",
        cwd: p,
        env: { ...process.env },
      });

      const result = await new Promise((resolveSpawn, rejectSpawn) => {
        cp.on("error", (error) => {
          console.error(
            `Error executing pnpm build for ${packageName}: ${error.message}`
          );
          resolveSpawn({
            success: false,
            package: packageName,
            error: error.message,
          });
        });

        cp.on("close", (code) => {
          if (code !== 0) {
            console.error(
              `pnpm build for ${packageName} exited with code ${code}`
            );
            resolveSpawn({
              success: false,
              package: packageName,
              error: `exited with code ${code}`,
            });
          } else {
            console.log(`Build completed successfully for ${packageName}`);
            resolveSpawn({ success: true, package: packageName });
          }
        });
      });

      results.push(result);
      if (!result.success) {
        allSuccessful = false;
      }
    } catch (error) {
      console.log("error", error);
      results.push({
        success: false,
        package: packageName,
        error: error.message,
      });
      allSuccessful = false;
    }
  }

  return { success: allSuccessful, results };
};
