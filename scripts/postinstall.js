/**
 * Postinstall script to patch third-party libraries for Expo SDK 58 / React 19 compatibility.
 * 
 * 1. stream-chat-react-native-core: Polyfill SSR compatibility for window.structuredClone
 * 2. react-native-web: Polyfill requireNativeComponent mock for web bundler
 * 3. @stream-io/video-react-native-sdk: Fix TDZ export order in common.js for react-native-worklets
 */

const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, target, replacement) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(target)) {
    fs.writeFileSync(filePath, content.replace(target, replacement), 'utf8');
    console.log(`[postinstall] Patched ${filePath}`);
  }
}

// 1. stream-chat-react-native-core polyfill for Node SSR
const streamPolyfillFiles = [
  path.join(__dirname, '..', 'node_modules', 'stream-chat-react-native-core', 'lib', 'module', 'polyfills.js'),
  path.join(__dirname, '..', 'node_modules', 'stream-chat-react-native-core', 'lib', 'commonjs', 'polyfills.js'),
  path.join(__dirname, '..', 'node_modules', 'stream-chat-react-native-core', 'src', 'polyfills.ts'),
];

for (const f of streamPolyfillFiles) {
  replaceInFile(
    f,
    'if (!window.structuredClone) {\n    window.structuredClone =',
    'var g = typeof window !== "undefined" ? window : globalThis;\n  if (!g.structuredClone) {\n    g.structuredClone ='
  );
  replaceInFile(
    f,
    'if (!window.structuredClone) {\n    window.structuredClone = structuredClone;',
    'const g = typeof window !== "undefined" ? window : (globalThis as any);\n  if (!g.structuredClone) {\n    g.structuredClone = structuredClone;'
  );
}

// 2. react-native-web requireNativeComponent mock
const rnwEsm = path.join(__dirname, '..', 'node_modules', 'react-native-web', 'dist', 'index.js');
replaceInFile(
  rnwEsm,
  "// components\nexport { default as ActivityIndicator",
  "// components\nexport const requireNativeComponent = (name) => () => null;\nexport { default as ActivityIndicator"
);

const rnwCjs = path.join(__dirname, '..', 'node_modules', 'react-native-web', 'dist', 'cjs', 'index.js');
replaceInFile(
  rnwCjs,
  'exports.Vibration = _Vibration.default;\nvar _ActivityIndicator',
  'exports.Vibration = _Vibration.default;\nexports.requireNativeComponent = function(name) { return function() { return null; }; };\nvar _ActivityIndicator'
);

// 3. @stream-io/video-react-native-sdk TDZ fix for react-native-worklets Babel transform
const streamSdkCommonCjs = path.join(
  __dirname,
  '..',
  'node_modules',
  '@stream-io',
  'video-react-native-sdk',
  'dist',
  'commonjs',
  'components',
  'Participant',
  'FloatingParticipantView',
  'FloatingView',
  'common.js'
);

if (fs.existsSync(streamSdkCommonCjs)) {
  let content = fs.readFileSync(streamSdkCommonCjs, 'utf8');
  if (content.includes('exports.getClosestSnapAlignment = getClosestSnapAlignment;')) {
    content = content.replace(
      'exports.floatingChildViewContainerStyle = exports.FloatingViewAlignment = void 0;\nexports.getClosestSnapAlignment = getClosestSnapAlignment;\nexports.getSnapAlignments = getSnapAlignments;',
      'exports.floatingChildViewContainerStyle = exports.FloatingViewAlignment = void 0;'
    );
    content = content.replace(
      '  return snapOffsets;\n}',
      '  return snapOffsets;\n}\nexports.getSnapAlignments = getSnapAlignments;'
    );
    content = content.replace(
      '  return closestSnapAlignmentKey;\n}',
      '  return closestSnapAlignmentKey;\n}\nexports.getClosestSnapAlignment = getClosestSnapAlignment;'
    );
    fs.writeFileSync(streamSdkCommonCjs, content, 'utf8');
    console.log(`[postinstall] Patched ${streamSdkCommonCjs}`);
  }
}
