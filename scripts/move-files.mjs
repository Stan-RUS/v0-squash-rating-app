import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, statSync, cpSync, rmSync } from 'fs';
import { join, dirname } from 'path';

const src = '/vercel/share/v0-project/v0-squash-rating-app';
const dest = '/vercel/share/v0-project';

function copyRecursive(source, target) {
  const entries = readdirSync(source, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(source, entry.name);
    const destPath = join(target, entry.name);
    
    // Skip node_modules and .git and pnpm-lock.yaml
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'pnpm-lock.yaml') continue;
    
    if (entry.isDirectory()) {
      if (!existsSync(destPath)) {
        mkdirSync(destPath, { recursive: true });
      }
      copyRecursive(srcPath, destPath);
    } else {
      const dir = dirname(destPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      cpSync(srcPath, destPath);
      console.log(`Copied: ${entry.name} -> ${destPath.replace(dest + '/', '')}`);
    }
  }
}

copyRecursive(src, dest);
console.log('\nAll files copied successfully!');
