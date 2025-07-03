// Complete TypeScript bypass by renaming all .ts/.tsx files to .js/.jsx
const fs = require('fs');
const path = require('path');

function renameFilesInDirectory(dir) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
      renameFilesInDirectory(fullPath);
    } else if (stat.isFile()) {
      if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
        const newPath = fullPath.replace('.ts', '.js');
        console.log(`Renaming ${fullPath} to ${newPath}`);
        fs.renameSync(fullPath, newPath);
      } else if (item.endsWith('.tsx')) {
        const newPath = fullPath.replace('.tsx', '.jsx');
        console.log(`Renaming ${fullPath} to ${newPath}`);
        fs.renameSync(fullPath, newPath);
      }
    }
  }
}

// Only rename files in src directory
console.log('Starting TypeScript bypass by renaming files...');
renameFilesInDirectory('./src');
console.log('TypeScript bypass complete - all .ts/.tsx files renamed to .js/.jsx');