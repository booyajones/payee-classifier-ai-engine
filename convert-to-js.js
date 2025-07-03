// Convert all TypeScript files to JavaScript
const fs = require('fs');
const path = require('path');

function convertTsToJs(content) {
  // Remove TypeScript-specific syntax
  return content
    // Remove @ts-nocheck comments
    .replace(/\/\/ @ts-nocheck\s*\n?/g, '')
    
    // Remove type annotations
    .replace(/: (string|number|boolean|any|void|unknown|never)(\s*[,;=\)\]\}])/g, '$2')
    .replace(/: (string|number|boolean|any|void|unknown|never)(\s*$)/gm, '')
    
    // Remove optional parameters
    .replace(/\?\s*:/g, ':')
    
    // Remove interface declarations
    .replace(/interface\s+\w+\s*\{[^}]*\}/gs, '')
    
    // Remove type declarations
    .replace(/type\s+\w+\s*=\s*[^;]*;/g, '')
    .replace(/export\s+type\s+\w+\s*=\s*[^;]*;/g, '')
    
    // Remove import type statements
    .replace(/import\s+type\s+\{[^}]*\}\s+from\s+['"][^'"]*['"];?\s*\n?/g, '')
    .replace(/import\s+type\s+\w+\s+from\s+['"][^'"]*['"];?\s*\n?/g, '')
    
    // Remove export type statements
    .replace(/export\s+type\s+\{[^}]*\}\s*;?\s*\n?/g, '')
    
    // Remove as type assertions
    .replace(/\s+as\s+\w+/g, '')
    
    // Remove generic type parameters
    .replace(/<[^>]*>/g, '')
    
    // Remove declare statements
    .replace(/declare\s+global\s*\{[^}]*\}/gs, '')
    .replace(/declare\s+.*?;/g, '')
    
    // Clean up multiple newlines
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    
    // Clean up empty lines at start
    .replace(/^\s*\n+/, '');
}

function renameFile(filePath) {
  const dir = path.dirname(filePath);
  const name = path.basename(filePath, path.extname(filePath));
  const ext = path.extname(filePath);
  
  let newExt;
  if (ext === '.ts') {
    newExt = '.js';
  } else if (ext === '.tsx') {
    newExt = '.jsx';
  } else {
    return null;
  }
  
  return path.join(dir, name + newExt);
}

function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
      processDirectory(fullPath);
    } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
      // Skip declaration files
      if (item.endsWith('.d.ts')) {
        console.log(`Skipping declaration file: ${fullPath}`);
        continue;
      }
      
      const content = fs.readFileSync(fullPath, 'utf8');
      const convertedContent = convertTsToJs(content);
      const newPath = renameFile(fullPath);
      
      if (newPath) {
        fs.writeFileSync(newPath, convertedContent);
        fs.unlinkSync(fullPath);
        console.log(`Converted: ${fullPath} -> ${newPath}`);
      }
    }
  }
}

console.log('Starting TypeScript to JavaScript conversion...');
processDirectory('./src');
console.log('Conversion complete!');