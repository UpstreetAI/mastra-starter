import child_process from "child_process";

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
export const installPackages = async (packageSpecifiers) => {
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
