import fs from 'fs';
import path from 'path';

function checkImports(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      checkImports(full);
    } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      const importRegex = /import\s+.*?from\s+['"](\.[^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const dirOfFile = path.dirname(full);
        const resolved = path.resolve(dirOfFile, importPath);
        const candidates = [
          resolved,
          resolved + '.jsx',
          resolved + '.js',
          resolved + '.css',
          path.join(resolved, 'index.jsx'),
          path.join(resolved, 'index.js')
        ];
        let found = null;
        for (const c of candidates) {
          if (fs.existsSync(c)) {
            found = c;
            break;
          }
        }
        if (!found) {
          console.log('MISSING:', importPath, 'in', full);
        } else {
          const actualDir = path.dirname(found);
          const actualName = path.basename(found);
          const dirEntries = fs.readdirSync(actualDir);
          if (!dirEntries.includes(actualName)) {
            console.log('CASE MISMATCH:', importPath, 'in', full, 'actual file is:', dirEntries.find(e => e.toLowerCase() === actualName.toLowerCase()));
          }
        }
      }
    }
  }
}

checkImports('client/src');
console.log('Import check complete.');
