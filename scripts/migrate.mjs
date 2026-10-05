import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = neon(process.env.DATABASE_URL);
const schema = readFileSync(join(__dirname, '../src/db/schema.sql'), 'utf8');

const statements = schema.split(';').map(s => s.trim()).filter(Boolean);
for (const stmt of statements) {
  console.log('→', stmt.slice(0, 60).replace(/\s+/g, ' '), '...');
  await sql.query(stmt);
}
console.log('✓ Migration complete');
