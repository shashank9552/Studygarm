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


// 4. URL Polyfill protection for Node.js / SSR / Metro (prevents "URL.parse is not a function" crash)
const urlPolyfillDirs = [
  path.join(__dirname, '..', 'node_modules', 'react-native-url-polyfill'),
  path.join(__dirname, '..', 'node_modules', '@stream-io', 'video-react-native-sdk', 'node_modules', 'react-native-url-polyfill'),
];

for (const dir of urlPolyfillDirs) {
  const indexJs = path.join(dir, 'index.js');
  replaceInFile(
    indexJs,
    'export function setupURLPolyfill() {\n  globalThis.REACT_NATIVE_URL_POLYFILL',
    'export function setupURLPolyfill() {\n  if (typeof process !== "undefined" && process.versions && process.versions.node) return;\n  globalThis.REACT_NATIVE_URL_POLYFILL'
  );

  const urlJs = path.join(dir, 'js', 'URL.js');
  replaceInFile(
    urlJs,
    'export const URL = whatwgUrl;',
    'if (typeof whatwgUrl.parse !== "function") {\n  whatwgUrl.parse = function parse(url, base) {\n    try { return new whatwgUrl(url, base); } catch { return null; }\n  };\n}\n\nexport const URL = whatwgUrl;'
  );
}

// 5. Prevent Expo CLI crash on Windows when ~/.expo directory has EPERM / restricted permissions
const expoUserSettingsPaths = [
  path.join(__dirname, '..', 'node_modules', '@expo', 'cli', 'build', 'src', 'api', 'user', 'UserSettings.js'),
  path.join(__dirname, '..', 'node_modules', 'expo', 'node_modules', '@expo', 'cli', 'build', 'src', 'api', 'user', 'UserSettings.js'),
];

for (const expoUserSettings of expoUserSettingsPaths) {
  if (fs.existsSync(expoUserSettings)) {
    replaceInFile(
      expoUserSettings,
      'function getAnonymousId() {\n    const settings = getSettings();\n    let id = settings.get(\'uuid\', null);\n    if (!id) {\n        id = _crypto().default.randomUUID();\n        settings.set(\'uuid\', id);\n    }\n    return id;\n}',
      'function getAnonymousId() {\n    try {\n        const settings = getSettings();\n        let id = settings.get(\'uuid\', null);\n        if (!id) {\n            id = _crypto().default.randomUUID();\n            try { settings.set(\'uuid\', id); } catch {}\n        }\n        return id;\n    } catch {\n        return _crypto().default.randomUUID();\n    }\n}'
    );
  }
}

// 6. Ensure Foojay toolchain resolver in @react-native/gradle-plugin is 1.0.0 (prevents Gradle 9 / IBM_SEMERU crash)
const foojayKts = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native',
  'gradle-plugin',
  'settings.gradle.kts'
);
if (fs.existsSync(foojayKts)) {
  replaceInFile(
    foojayKts,
    'plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("0.5.0") }',
    'plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("1.0.0") }'
  );
  replaceInFile(
    foojayKts,
    'plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("0.8.0") }',
    'plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("1.0.0") }'
  );
}
