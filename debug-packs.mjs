import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'pathe';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Auto-detect packs from filesystem
function detectPacks() {
  const packs = new Map();
  
  // Look for packs in common locations
  const packDirs = [
    join(process.cwd(), 'packs'),
    join(process.cwd(), 'packs', 'builtin'),
    join(process.cwd(), 'node_modules', '@gitvan', 'packs'),
    // Also look in GitVan's builtin packs
    join(__dirname, '..', '..', 'packs', 'builtin'),
  ];
  
  console.log('Looking for packs in:', packDirs);
  
  for (const packDir of packDirs) {
    console.log('Checking directory:', packDir, 'exists:', existsSync(packDir));
    if (existsSync(packDir)) {
      try {
        const entries = readdirSync(packDir, { withFileTypes: true });
        console.log('Found entries:', entries.map(e => e.name));
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const packPath = join(packDir, entry.name);
            const manifestPath = join(packPath, 'pack.json');
            
            console.log('Checking pack:', entry.name, 'manifest exists:', existsSync(manifestPath));
            if (existsSync(manifestPath)) {
              try {
                const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
                const packId = manifest.id || `builtin/${entry.name}`;
                
                console.log('Found pack:', packId, manifest.name);
                
                packs.set(packId, {
                  id: packId,
                  name: manifest.name || entry.name,
                  description: manifest.description || 'No description available',
                  tags: manifest.tags || [],
                  capabilities: manifest.capabilities || [],
                  version: manifest.version || '1.0.0',
                  author: manifest.author || 'Unknown',
                  license: manifest.license || 'MIT',
                  path: packPath,
                  manifest
                });
              } catch (error) {
                console.log('Error parsing manifest for', entry.name, error.message);
                continue;
              }
            }
          }
        }
      } catch (error) {
        console.log('Error reading directory', packDir, error.message);
        continue;
      }
    }
  }
  
  console.log('Total packs found:', packs.size);
  return Array.from(packs.values());
}

const packs = detectPacks();
console.log('Packs:', packs.map(p => ({ id: p.id, name: p.name, tags: p.tags, categories: p.manifest.categories })));
