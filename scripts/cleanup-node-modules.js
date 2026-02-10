import { execSync } from 'child_process';
import { existsSync, statSync, unlinkSync } from 'fs';
import path from 'path';

const projectRoot = '/vercel/share/v0-project';

// Check if node_modules exists as a file (not directory) at root
const nmPath = path.join(projectRoot, 'node_modules');
if (existsSync(nmPath)) {
  const stat = statSync(nmPath);
  if (stat.isFile() || stat.isSymbolicLink()) {
    console.log('Found node_modules as a file/symlink, removing...');
    unlinkSync(nmPath);
    console.log('Removed node_modules file');
  } else if (stat.isDirectory()) {
    console.log('node_modules is a directory (expected for dev), skipping delete');
  }
} else {
  console.log('No node_modules file found at root');
}

// Check nested paths too
const nestedNm = path.join(projectRoot, 'v0-squash-rating-app', 'node_modules');
if (existsSync(nestedNm)) {
  const stat = statSync(nestedNm);
  console.log(`Found nested node_modules (isFile: ${stat.isFile()}, isDir: ${stat.isDirectory()})`);
} else {
  console.log('No nested node_modules found');
}

// List any suspicious files at root
console.log('\nChecking git status...');
try {
  const gitStatus = execSync('git status --short', { cwd: projectRoot }).toString();
  console.log('Git status:', gitStatus || '(clean)');
} catch (e) {
  console.log('Could not run git status:', e.message);
}

// Try to remove node_modules from git tracking
try {
  execSync('git rm -r --cached node_modules 2>/dev/null || true', { cwd: projectRoot });
  console.log('Removed node_modules from git cache');
} catch (e) {
  console.log('git rm node_modules:', e.message);
}

// Also remove any nested v0-squash-rating-app from tracking
try {
  execSync('git rm -r --cached v0-squash-rating-app 2>/dev/null || true', { cwd: projectRoot });
  console.log('Removed v0-squash-rating-app from git cache');
} catch (e) {
  console.log('git rm v0-squash-rating-app:', e.message);
}
