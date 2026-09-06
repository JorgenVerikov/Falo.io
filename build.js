import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.cpSync('index.html', path.join(distDir, 'index.html'));
fs.cpSync('assets', path.join(distDir, 'assets'), { recursive: true });
fs.cpSync('src', path.join(distDir, 'src'), { recursive: true });

console.log('Build complete: static files copied to dist/');
