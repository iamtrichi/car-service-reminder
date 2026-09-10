const { spawn } = require('child_process');
const fs = require('fs');
fs.mkdirSync('C:\\Temp', { recursive: true });
const out = fs.openSync('C:\\Temp\\emu-out.log', 'w');
const err = fs.openSync('C:\\Temp\\emu-err.log', 'w');
const child = spawn(
  'G:\\Android\\emulator\\emulator.exe',
  ['-avd', 'csr_avd', '-no-snapshot-load'],
  { detached: true, stdio: ['ignore', out, err], windowsHide: true, env: { ...process.env } }
);
child.unref();
console.log('launched pid=' + child.pid);
