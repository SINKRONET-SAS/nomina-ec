const fs = require('fs');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.watchFolders = config.watchFolders.filter((folder) => fs.existsSync(folder));
config.resolver.nodeModulesPaths = config.resolver.nodeModulesPaths.filter((folder) => fs.existsSync(folder));

module.exports = config;
