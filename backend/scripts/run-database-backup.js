'use strict';

require('dotenv').config();

const { runDatabaseBackup } = require('../src/services/backupService');

runDatabaseBackup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[BACKUP] FAIL', error.message);
    process.exit(1);
  });
