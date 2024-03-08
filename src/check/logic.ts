import * as fs from 'fs/promises'; // Use promises for async/await syntax
import * as path from 'path';
import * as semver from 'semver';
import * as cliTable from 'cli-table3';
import { PackageJson } from '../models/packageJson';

interface NonIvyLibrary {
  libName: string;
  repoUrl: string;
  currentVersion: string;
}

const nonIvyLibs: NonIvyLibrary[] = [];

async function readPackageJson(filePath: string): Promise<PackageJson | undefined> {
  try {
    // Read the file asynchronously
    const data = await fs.readFile(filePath, 'utf8');

    // Parse the JSON data
    const jsonData = JSON.parse(data);

    // Return the parsed JSON data
    return jsonData;
  } catch (error) { }
}

async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

async function checkAngularVersion(projectRoot: string): Promise<void> {
  const packageJson = await readPackageJson(path.join(projectRoot, 'package.json'));
  if (packageJson) {
    const angularCliVersion = packageJson.dependencies['@angular/cli'] || packageJson.devDependencies['@angular/cli'];

    if (!angularCliVersion) {
      throw new Error('Unable to find @angular/cli in your package.json file');
    }

    const versionSupportRange = '^16.x.x';
    const supportedAngularVersion = semver.lte(semver.coerce(angularCliVersion) ?? angularCliVersion, semver.coerce(versionSupportRange) ?? versionSupportRange);

    if (supportedAngularVersion) {
      console.log(`Found supported angular versions: ${angularCliVersion}`);
      console.log(`Make sure that your last 'npm install' and 'ng serve' ran without any errors.`);
    } else {
      const error = `Found unsupported angular versions: ${angularCliVersion}\n` +
        `This library is tested only with version lower than Angular version ${versionSupportRange}`;
      throw new Error(error);
    }
  }
}

async function checkPackageForIvyCompatibility(nodeModulePath: string): Promise<void> {
  try {
    const packageJsonPath = path.join(nodeModulePath, 'package.json');
    const packageJson = await readPackageJson(packageJsonPath);
    if (packageJson) {
      const ivyccPath = path.join(nodeModulePath, '__ivy_ngcc__');
      const ivyFolder = await checkFileExists(ivyccPath);
      if (ivyFolder) {
        nonIvyLibs.push({
          libName: nodeModulePath.split('/').pop() ?? nodeModulePath,
          repoUrl: packageJson?.repository?.url ?? 'NA',
          currentVersion: packageJson.version,
        });
      }
    }
  } catch (error) { }
}

async function checkNodeModules(projectRoot: string): Promise<void> {
  const nodeModulesDir = path.join(projectRoot, 'node_modules');
  const nodeModules = await fs.readdir(nodeModulesDir);
  for (const nodeModule of nodeModules) {
    const modulePath = path.join(nodeModulesDir, nodeModule);
    const stats = await fs.stat(modulePath);
    if (nodeModule !== '.bin') {
      if (await checkFileExists(path.join(modulePath, 'package.json'))) {
        await checkPackageForIvyCompatibility(modulePath);
      } else if (stats.isDirectory()) {
        // could be nested package like @angular/core
        // 2nd level package search
        const nestedModules = await fs.readdir(modulePath);
        for (const nestedModule of nestedModules) {
          await checkPackageForIvyCompatibility(path.join(modulePath, nestedModule));
        }
      }
    }
  }
}

function reportResults(): void {
  if (nonIvyLibs.length > 0) {
    console.log(`Found some libraries which are not ivy compatible`);
    const table = new cliTable({
      head: ['Non ivy libraries', 'Repository URL', 'Current installed version'],
    });
    nonIvyLibs.forEach(lib => {
      table.push([lib.libName, lib.repoUrl, lib.currentVersion]);
    });
    console.log(table.toString());
    console.log(`Now you can visit npm/github page of libraries which are mentioned in the above table and upgrade the version of that library to ivy supported version`);
    console.log(`If ivy supported version is not present, consider checking with the library's authors to see if the library is expected to be compatible with Ivy.`);
  } else {
    console.log(`Looks like you are not using any library which is not compatible with ivy`);
  }
}

export async function checkIvyCompatibility(): Promise<void> {
  const projectRoot = process.cwd(); // Get the current working directory

  console.log(`Running ivy compatibility check`);

  await checkAngularVersion(projectRoot);
  await checkNodeModules(projectRoot);
  reportResults();
}
