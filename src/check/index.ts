import { Tree, convertNxGenerator } from '@nx/devkit';
import { checkIvyCompatibility } from './logic';

export async function nxIvyccCheck(_tree: Tree, _options: any) {
  await checkIvyCompatibility();
}

export const ngIvyccCheck = convertNxGenerator(nxIvyccCheck)