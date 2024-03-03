import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import * as semver from "semver";
import * as cliTable from "cli-table3";
import { PackageJson } from '../models/packageJson';
import { wrapAngularDevkitSchematic } from '@nx/devkit/ngcli-adapter'

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function ivyccCheck(_options: any): Rule {

  const nonIvyLibs: {
    libName: string,
    repoUrl: string
  }[] = [];

  function preIvyccCheck(tree: Tree, _context: SchematicContext) {
    const packageJson: PackageJson = tree.readJson('package.json') as any;
    if (packageJson) {
      const { dependencies, devDependencies } = packageJson;
      const angularCliVersion = { ...dependencies, ...devDependencies }['@angular/cli'];
      if (!angularCliVersion) {
        throw Error('Unable to find @angular/cli in your package.json file');
      }
      // TODO: add support for older versions of Angular
      const versionSupportRange = '^15.x.x';
      const supportedAngularVersion = semver.satisfies(semver.coerce(angularCliVersion) ?? angularCliVersion, versionSupportRange);
      if (supportedAngularVersion) {
        console.log(`Found supported angular versions: ${angularCliVersion}`);
        console.log(`Make sure that your last 'npm install' and 'ng serve' ran without any errors.`);
      } else {
        const error = `Found unsupported angular versions: ${angularCliVersion}\n` +
          `This library is tested only with Angular version ${versionSupportRange}`
        throw Error(error);
      }
    } else {
      throw Error('Unable to find package.json');
    }
  }

  function checkIfPackageIsIvyCompatible(_tree: Tree, _context: SchematicContext, nodeModulePath: string) {
    const moduleDir = _tree.getDir(`node_modules/${nodeModulePath}`);
    if (_tree.exists(`node_modules/${nodeModulePath}/package.json`) &&
      moduleDir.subdirs.find(moduleDir => moduleDir === '__ivy_ngcc__')) {
      const modulePackageJson: PackageJson = _tree.readJson(`node_modules/${nodeModulePath}/package.json`) as any;
      nonIvyLibs.push({
        libName: nodeModulePath,
        repoUrl: (modulePackageJson?.repository?.url ?? modulePackageJson?.repository) ?? 'NA'
      });
    }
  }

  function performCheck(tree: Tree, _context: SchematicContext) {
    const nodeModules = tree.getDir('node_modules');
    // loop over all the node modules
    nodeModules.subdirs.forEach(nodeModule => {
      if (tree.exists(`node_modules/${nodeModule}/package.json`)) {
        checkIfPackageIsIvyCompatible(tree, _context, nodeModule);
      } else {
        // could be nested package like @angular/core
        // 2nd level package search
        const moduleDir = tree.getDir(`node_modules/${nodeModule}`);
        moduleDir.subdirs.forEach(nestedModule => {
          checkIfPackageIsIvyCompatible(tree, _context, `${nodeModule}/${nestedModule}`);
        });
      }
    });
  }

  function postIvyccCheck(_tree: Tree, _context: SchematicContext) {
    if (nonIvyLibs.length > 0) {
      console.log(`Found some libraries which are not ivy compatible`);
      const table = new cliTable({
        head: ['Non ivy libraries', 'Repository URL']
      });
      nonIvyLibs.forEach(lib => {
        table.push([lib.libName, lib.repoUrl])
      });
      console.log(table.toString());
      console.log(`Now you can visit npm/github page of libraries which are mentioned in the above table and upgrade the version of that library to ivy supported version`);
      console.log(`If ivy supported version is not present, consider checking with the library\'s authors to see if the library is expected to be compatible with Ivy.`);
    } else {
      console.log(`Looks like you are not using any library which is not compatible with ivy`);
    }
  }

  return (tree: Tree, _context: SchematicContext) => {
    console.log(`Running ivy compatibility check`);

    preIvyccCheck(tree, _context);
    performCheck(tree, _context);
    postIvyccCheck(tree, _context);

    return tree;
  };
}

export const nxIvyccCheck = wrapAngularDevkitSchematic('ivycc', 'check');
