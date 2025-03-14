import path from 'path';
import child_process from "child_process";
import { PnpmPackageLookup } from 'pnpm-package-lookup';

export const runCharacter = async (characterJsonPath, {
  env = {},
} = {}) => {
  const mastraPath = import.meta.resolve('mastra').replace('file://', '');
  const cp = child_process.spawn(process.execPath, [mastraPath, 'dev'], {
    env: {
      ...env,
      _CHARACTER_JSON_PATH: characterJsonPath,
    },
  });
  cp.stdout.pipe(process.stdout);
  cp.stderr.pipe(process.stderr);
  
  return new Promise((resolve, reject) => {
    cp.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`));
      } else {
        resolve();
      }
    });
    
    cp.on('error', (error) => {
      reject(error);
    });
  });
};
export const installPackages = (packageSpecifiers) => {
  console.log(`Installing packages: ${packageSpecifiers.join(", ")}`);

  return new Promise((resolve, reject) => {
    const cp = child_process.spawn("pnpm", ["install", ...packageSpecifiers], {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    cp.on("error", (error) => {
      console.error(`Error executing pnpm install: ${error.message}`);
      reject(error);
    });

    cp.on("close", (code) => {
      if (code !== 0) {
        console.error(`pnpm install exited with code ${code}`);
        reject(new Error(`pnpm install exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
};
export const buildPackages = async (packageSpecifiers) => {
  console.log(`Building packages: ${packageSpecifiers.join(", ")}`);

  // get the packagePaths from the packageSpecifiers
  const packageLookup = new PnpmPackageLookup({
    pnpmLockYamlPath: path.resolve(process.cwd(), 'pnpm-lock.yaml'),
  });
  const packagePaths = await Promise.all(packageSpecifiers.map(async (packageSpecifier) => {
    return await packageLookup.getPackageNameBySpecifier(packageSpecifier);
  }));

  const results = [];
  let allSuccessful = true;

  for (const packagePath of packagePaths) {
    console.log(`Building package: ${packagePath}`);
    
    try {
      const p = path.resolve(process.cwd(), 'node_modules', packagePath);
      const cp = child_process.spawn("pnpm", ["build"], {
        stdio: "inherit",
        cwd: p,
        env: { ...process.env },
      });

      const result = await new Promise((resolveSpawn, rejectSpawn) => {
        cp.on("error", (error) => {
          console.error(`Error executing pnpm build for ${packagePath}: ${error.message}`);
          resolveSpawn({ success: false, package: packagePath, error: error.message });
        });

        cp.on("close", (code) => {
          if (code !== 0) {
            console.error(`pnpm build for ${packagePath} exited with code ${code}`);
            resolveSpawn({ success: false, package: packagePath, error: `exited with code ${code}` });
          } else {
            console.log(`Build completed successfully for ${packagePath}`);
            resolveSpawn({ success: true, package: packagePath });
          }
        });
      });

      results.push(result);
      if (!result.success) {
        allSuccessful = false;
      }
    } catch (error) {
      console.log('error', error);
      results.push({ success: false, package: packagePath, error: error.message });
      allSuccessful = false;
    }
  }

  return { success: allSuccessful, results };
};
