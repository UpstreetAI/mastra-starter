import path from "path";
// import fs from "fs";
import child_process from "child_process";
import { mkdirp } from "mkdirp";
import { rimraf } from "rimraf";

// const uniquify = (array) => {
//   return [...new Set(array)];
// };

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
  if (/^https?:\/\//.test(plugin)) {
    return "http";
  } else if (plugin.startsWith("composio:")) {
    return "composio";
  } else {
    return "npm";
  }
};
export const sortPlugins = (plugins) => {
  const http = [];
  const npm = [];
  const composio = [];
  for (const plugin of plugins) {
    const pluginType = getPluginType(plugin);
    if (pluginType === "http") {
      http.push(plugin);
    } else if (pluginType === "npm") {
      npm.push(plugin);
    } else if (pluginType === "composio") {
      composio.push(plugin);
    }
  }
  return {
    http,
    npm,
    composio,
  };
};

export const getNpmPackageType = (packageSpecifier) => {
  if (packageSpecifier.startsWith("github:")) {
    return "github";
  } else {
    return "npm";
  }
};
export const sortNpmPackages = (packageSpecifiers) => {
  const github = [];
  const npm = [];
  for (const packageSpecifier of packageSpecifiers) {
    const packageType = getNpmPackageType(packageSpecifier);
    if (packageType === "github") {
      github.push(packageSpecifier);
    } else {
      npm.push(packageSpecifier);
    }
  }
  return { github, npm };
};
const installNpmGithubPackages = async (packageSpecifiers) => {
  console.log(`Installing github packages: ${packageSpecifiers.join(", ")}`);

  // wipe packages directory
  const packagesDir = path.resolve(process.cwd(), "packages");
  await rimraf(packagesDir);

  // Ensure packages directory exists
  try {
    await mkdirp(packagesDir);
  } catch (error) {
    console.error(`Error creating packages directory: ${error.stack}`);
    return Promise.reject(error);
  }

  // Transform package specifiers to GitHub URLs
  const repoNames = packageSpecifiers.map((specifier) => {
    specifier = specifier.replace("github:", "");
    specifier = `https://github.com/${specifier}`;
    return specifier;
  });

  // git clone all packages
  await Promise.all(
    repoNames.map(async (repoUrl) => {
      return new Promise((resolveClone, rejectClone) => {
        console.log(`Cloning ${repoUrl}...`);
        const cp = child_process.spawn(
          "git",
          ["clone", "--depth", "1", repoUrl],
          {
            stdio: "inherit",
            cwd: packagesDir,
          }
        );

        cp.on("error", (error) => {
          console.error(
            `Error executing git clone for ${repoUrl}: ${error.stack}`
          );
          rejectClone(error);
        });

        cp.on("close", (code) => {
          if (code !== 0) {
            console.error(`git clone for ${repoUrl} exited with code ${code}`);
            rejectClone(new Error(`git clone exited with code ${code}`));
          } else {
            console.log(`Successfully cloned ${repoUrl}`);
            resolveClone();
          }
        });
      });
    })
  );

  // build and install all plugins into local packages
  await Promise.all(
    packageSpecifiers.map(async (packageSpecifier) => {
      const packageBasename = path.basename(
        packageSpecifier.replace("github:", "")
      );
      const packagePath = path.resolve(packagesDir, packageBasename);
      
      // pnpm install in local directory
      await new Promise((resolveInstall, rejectInstall) => {
        const cp = child_process.spawn("pnpm", ["install"], {
          stdio: "inherit",
          cwd: packagePath,
          env: { ...process.env },
        });

        cp.on("error", (error) => {
          console.error(
            `Error executing pnpm install for ${packageBasename}: ${error.stack}`
          );
          rejectInstall(error);
        });
        cp.on("close", (code) => {
          if (code !== 0) {
            rejectInstall(new Error(`pnpm install exited with code ${code}`));
          } else {
            resolveInstall();
          }
        });
      });

      // pnpm build
      // note: this is advisory and allowed to fail
      await new Promise((resolveSpawn, rejectSpawn) => {
        const cp = child_process.spawn("pnpm", ["build"], {
          stdio: "inherit",
          cwd: packagePath,
          env: { ...process.env },
        });

        cp.on("error", (error) => {
          console.error(
            `Error executing pnpm build for ${packageBasename}: ${error.stack}`
          );
          resolveSpawn({
            success: false,
            package: packageBasename,
            error: error.stack,
          });
        });
        cp.on("close", (code) => {
          if (code !== 0) {
            console.error(
              `pnpm build for ${packageBasename} exited with code ${code}`
            );
            resolveSpawn({
              success: false,
              package: packageBasename,
              error: `exited with code ${code}`,
            });
          } else {
            console.log(`Build completed successfully for ${packageBasename}`);
            resolveSpawn({ success: true, package: packageBasename });
          }
        });
      });
    })
  );

  // install all plugins into app
  // pnpm install to app
  await new Promise((resolveInstall, rejectInstall) => {
    const packageRefs = packageSpecifiers.map((packageSpecifier) => {
      const packageBasename = path.basename(
        packageSpecifier.replace("github:", "")
      );
      const packagePath = path.resolve(packagesDir, packageBasename);
      return `file:${packagePath}`;
    });
    console.log(`Installing ${JSON.stringify(packageRefs)} to app`);
    const cp = child_process.spawn(
      "pnpm",
      ["install", ...packageRefs],
      {
        stdio: "inherit",
        cwd: process.cwd(),
        env: { ...process.env },
      }
    );

    cp.on("error", (error) => {
      console.error(
        `Error executing pnpm install for ${packageBasename}: ${error.stack}`
      );
      rejectInstall(error);
    });
    cp.on("close", (code) => {
      if (code !== 0) {
        rejectInstall(new Error(`pnpm install exited with code ${code}`));
      } else {
        resolveInstall();
      }
    });
  });
};
const installNpmBasicPackages = async (packageSpecifiers) => {
  // packageSpecifiers = uniquify(packageSpecifiers);
  console.log(`Installing npm basic packages: ${packageSpecifiers.join(", ")}`);

  const cp = child_process.spawn("pnpm", ["install", ...packageSpecifiers], {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  return new Promise((resolve, reject) => {
    cp.on("error", (error) => {
      reject(error);
    });

    cp.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`pnpm install exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
};
export const installNpmPackages = async (packageSpecifiers) => {
  console.log(`Installing packages: ${packageSpecifiers.join(", ")}`);

  const { github, npm } = sortNpmPackages(packageSpecifiers);
  await Promise.all([
    installNpmGithubPackages(github),
    installNpmBasicPackages(npm),
  ]);
};
