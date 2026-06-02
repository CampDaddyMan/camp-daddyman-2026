// app.config.js — replaces app.json so EAS file secrets work for googleServicesFile
const base = require('./app.json').expo;

module.exports = {
  ...base,
  android: {
    ...base.android,
    // In CI/EAS: GOOGLE_SERVICES_JSON env var holds the path to the uploaded secret file.
    // Locally: falls back to the file in the project directory.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
};
