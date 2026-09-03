const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(repoRoot, 'fronend');
const backendDir = path.join(repoRoot, 'backend');

// Load .env if present (simple parser) and ensure .env.example exists
const envPath = path.join(repoRoot, '.env');
const envExamplePath = path.join(repoRoot, '.env.example');

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const out = {};
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // remove surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const envVars = parseDotEnv(envPath);
// Merge into process.env if not already set
for (const k of Object.keys(envVars)) {
  if (!process.env[k]) process.env[k] = envVars[k];
}

// Auto-generate .env.example if missing
if (!fs.existsSync(envExamplePath)) {
  const example = [
    '# Example environment file for RaawaAI dev runner',
    '# Copy this to .env and customize values as needed',
    '',
    '# Port for the backend uvicorn server',
    'BACKEND_PORT=8001',
    '',
    '# Optional: full path to Python executable to use (overrides .venv detection)',
    "# PYTHON_PATH=.venv/Scripts/python.exe  # Windows",
    "# PYTHON_PATH=.venv/bin/python        # macOS / Linux",
    '',
    '# Optionally override the Vite API base used by the frontend',
    "# VITE_API_BASE_URL=http://localhost:8001",
    '',
  ].join('\n');
  try {
    fs.writeFileSync(envExamplePath, example, { encoding: 'utf8' });
    console.log('Wrote .env.example — copy to .env to customize Python path and port');
  } catch (e) {
    // ignore write failures
  }
}

// Find Python executable: prefer explicit PYTHON_PATH from env, then backend/.venv, then repo .venv, then system
const explicitPython = process.env.PYTHON_PATH;
const backendVenvWin = path.join(backendDir, '.venv', 'Scripts', 'python.exe');
const backendVenvUnix = path.join(backendDir, '.venv', 'bin', 'python');
const venvWin = path.join(repoRoot, '.venv', 'Scripts', 'python.exe');
const venvUnix = path.join(repoRoot, '.venv', 'bin', 'python');
let pythonExe = null;
if (explicitPython && fs.existsSync(explicitPython)) {
  pythonExe = explicitPython;
} else if (fs.existsSync(backendVenvWin)) {
  pythonExe = backendVenvWin;
} else if (fs.existsSync(backendVenvUnix)) {
  pythonExe = backendVenvUnix;
} else if (fs.existsSync(venvWin)) {
  pythonExe = venvWin;
} else if (fs.existsSync(venvUnix)) {
  pythonExe = venvUnix;
} else if (explicitPython) {
  // user provided a path but it doesn't exist — still try to use it (might be a command)
  pythonExe = explicitPython;
} else {
  // Fallback to system python
  pythonExe = process.platform === 'win32' ? 'python' : 'python3';
}

const backendPort = process.env.BACKEND_PORT || process.env.VITE_API_PORT || '9000';
const frontendEnv = {
  ...process.env,
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || `http://localhost:${backendPort}`,
};

console.log('Starting frontend and backend...');
console.log(`Using Python: ${pythonExe}`);

const frontend = spawn('npm', ['run', 'dev'], {
  cwd: frontendDir,
  env: frontendEnv,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

const backend = spawn(pythonExe, ['-m', 'uvicorn', 'app.main:app', '--reload', '--port', backendPort], {
  cwd: backendDir,
  stdio: 'inherit',
});

const shutdown = (signal) => {
  console.log(`Received ${signal}. Shutting down child processes...`);
  try { frontend.kill(); } catch (e) {}
  try { backend.kill(); } catch (e) {}
  process.exit();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

frontend.on('exit', (code) => {
  console.log(`Frontend exited with ${code}`);
  // keep backend running, or exit both? we'll exit both to keep behavior consistent
  shutdown('frontend-exit');
});

backend.on('exit', (code) => {
  console.log(`Backend exited with ${code}`);
  shutdown('backend-exit');
});
