const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const localJest = path.join(__dirname, '..', 'node_modules', 'jest', 'bin', 'jest.js');
const rootJest = path.join(__dirname, '..', '..', 'node_modules', 'jest', 'bin', 'jest.js');

let jestPath = localJest;
if (!fs.existsSync(localJest) && fs.existsSync(rootJest)) {
  jestPath = rootJest;
}

const args = [jestPath, ...process.argv.slice(2)];
const child = spawn(process.execPath, args, { stdio: 'inherit' });

child.on('close', (code) => {
  process.exit(code || 0);
});
