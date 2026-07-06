const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const config = getDefaultConfig(projectRoot);

config.watchFolders = config.watchFolders.filter((folder) => fs.existsSync(folder));
config.resolver.nodeModulesPaths = config.resolver.nodeModulesPaths.filter((folder) => fs.existsSync(folder));

// Block non-RN workspaces from Metro bundling (backend, frontend-web)
config.resolver.blockList = [
  new RegExp(`^${path.resolve(workspaceRoot, 'backend').replace(/[/\\\\]/g, '[\\\\/]')}[\\\\/].*`),
  new RegExp(`^${path.resolve(workspaceRoot, 'frontend-web').replace(/[/\\\\]/g, '[\\\\/]')}[\\\\/].*`),
  /.*[\\/]\.git[\\/].*/,
];

module.exports = config;
