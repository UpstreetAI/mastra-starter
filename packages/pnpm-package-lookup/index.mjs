import fs from 'fs';
import yaml from 'yaml';

export class PnpmPackageLookup {
  pnpmLockYamlPath;
  constructor({
    pnpmLockYamlPath,
  } = {}) {
    if (!pnpmLockYamlPath) {
      throw new Error('pnpmLockYamlPath is required');
    }

    this.pnpmLockYamlPath = pnpmLockYamlPath;

    this.loadPromise = (async () => {
      const pnpmLockYamlString = await fs.promises.readFile(pnpmLockYamlPath, 'utf8');
      const pnpmLock = yaml.parse(pnpmLockYamlString);
      const dependencies = pnpmLock.importers['.'].dependencies;
      const specifiersToPackageNamesMap = new Map();
      for (const [packageName, packageInfo] of Object.entries(dependencies)) {
        if (packageInfo.specifier) {
          specifiersToPackageNamesMap.set(packageInfo.specifier, packageName);
        }
      }
      return specifiersToPackageNamesMap;
    })();
  }

  async getPackageNameBySpecifier(specifier) {
    const specifiersToPackageNamesMap = await this.loadPromise;
    return specifiersToPackageNamesMap.get(specifier);
  }
}
