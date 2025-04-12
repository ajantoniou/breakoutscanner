import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to Vite executable
const viteBinPath = resolve(__dirname, 'node_modules', '.bin', 'vite');

console.log('Starting build process with Vite path:', viteBinPath);

// Run the build command
const buildProcess = spawn(viteBinPath, ['build'], { 
  stdio: 'inherit',
  shell: true 
});

buildProcess.on('close', (code) => {
  process.exit(code);
}); 