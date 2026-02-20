const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for resolving node.js modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle node.js core modules that don't exist in React Native
  if (moduleName === 'crypto' || moduleName === 'stream' || moduleName === 'http' || moduleName === 'https' || moduleName === 'url' || moduleName === 'zlib' || moduleName === 'fs' || moduleName === 'path' || moduleName === 'net' || moduleName === 'tls') {
    return {
      type: 'empty',
    };
  }
  
  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
