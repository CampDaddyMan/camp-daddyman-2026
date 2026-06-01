const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const reactDir = path.resolve(__dirname, 'node_modules/react');

// Root node_modules/@react-navigation/core loads react/jsx-dev-runtime from
// root React 18, which crashes with React 19's removed __SECRET_INTERNALS.
// Force ALL react/* imports to the local React 19 versions.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    const subPath = moduleName === 'react' ? 'index.js' : moduleName.slice('react/'.length) + '.js';
    return { filePath: path.join(reactDir, subPath), type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
