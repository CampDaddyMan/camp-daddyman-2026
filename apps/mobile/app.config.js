const base = require('./app.json').expo;
const fs   = require('fs');
const path = require('path');

// google-services.json is gitignored.
// - In EAS Build: GOOGLE_SERVICES_JSON env var holds the path to the secret file.
// - Locally: the file is present in the project directory.
// - In OTA/CI export: neither is available — omit the field entirely (safe for JS-only exports).
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ||
  (fs.existsSync(path.join(__dirname, 'google-services.json'))
    ? './google-services.json'
    : undefined);

module.exports = {
  ...base,
  android: {
    ...base.android,
    ...(googleServicesFile ? { googleServicesFile } : {}),
  },
};
