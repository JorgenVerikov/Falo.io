import fs from 'fs';
import path from 'path';

function copyStatic(targetDirName) {
  const targetDir = path.resolve(targetDirName);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.cpSync('index.html', path.join(targetDir, 'index.html'));
  fs.cpSync('assets', path.join(targetDir, 'assets'), { recursive: true });
  fs.cpSync('src', path.join(targetDir, 'src'), { recursive: true });
}

copyStatic('dist');
copyStatic('public');

console.log('Build complete: static files copied to dist/ and public/');
