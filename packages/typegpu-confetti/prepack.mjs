// @ts-check
/*
 * Used as a pre-publishing step.
 */

import * as fs from 'node:fs/promises';
import process from 'node:process';
import { execa } from 'execa';
import { entries, mapValues } from 'remeda';

const cwd = new URL(`file:${process.cwd()}/`);

/**
 * @param {*} value
 * @param {(path: string, value: string) => string} transform
 * @param {string=} path
 * @returns {*}
 */
function deepMapStrings(value, transform, path = '') {
  if (value === undefined || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key,
        deepMapStrings(val, transform, `${path}.${key}`),
      ]),
    );
  }

  if (typeof value === 'string') {
    return transform(path, value);
  }

  return value;
}

async function transformPackageJSON() {
  const packageJsonUrl = new URL('./package.json', cwd);
  const distPackageJsonUrl = new URL('./dist/package.json', cwd);

  const packageJson = JSON.parse(
    await fs.readFile(packageJsonUrl.pathname, 'utf-8'),
  );
  let distPackageJson = structuredClone(packageJson);

  // Replacing `exports`, `main`, and `types` with `publishConfig.*`
  if (distPackageJson.publishConfig?.main) {
    distPackageJson.main = distPackageJson.publishConfig.main;
  }
  if (distPackageJson.publishConfig?.types) {
    distPackageJson.types = distPackageJson.publishConfig.types;
  }
  if (distPackageJson.publishConfig?.exports) {
    distPackageJson.exports = distPackageJson.publishConfig.exports;
  }
  distPackageJson.publishConfig = undefined;

  // Altering paths in the package.json
  distPackageJson = deepMapStrings(distPackageJson, (_path, value) => {
    if (value.startsWith('./dist/')) {
      return value.replace(/^\.\/dist/, '.');
    }
    if (value.startsWith('./src/')) {
      return value.replace(/^\.\/src/, '.');
    }
    return value;
  });

  // Erroring out on any wildcard dependencies
  for (const [moduleKey, versionSpec] of [
    ...entries(distPackageJson.dependencies ?? {}),
  ]) {
    if (versionSpec === '*' || versionSpec === 'workspace:*') {
      throw new Error(
        `Cannot depend on a module with a wildcard version. (${moduleKey}: ${versionSpec})`,
      );
    }
  }

  distPackageJson.private = false;
  distPackageJson.scripts = {};
  // Removing dev dependencies.
  distPackageJson.devDependencies = undefined;
  // Removing workspace specifiers in dependencies.
  distPackageJson.dependencies = mapValues(
    distPackageJson.dependencies ?? {},
    (/** @type {string} */ value) => value.replace(/^workspace:/, ''),
  );
  distPackageJson.peerDependencies = mapValues(
    distPackageJson.peerDependencies ?? {},
    (/** @type {string} */ value) => value.replace(/^workspace:/, ''),
  );

  await fs.writeFile(
    distPackageJsonUrl.pathname,
    JSON.stringify(distPackageJson, undefined, 2),
    'utf-8',
  );
}

console.log('Preparing the package for publishing');

const $ = execa({ all: true });
await $`pnpm tsdown`;
await $`cp ./README.md ./dist/README.md`;
await transformPackageJSON();

console.log('Package prepared!');
