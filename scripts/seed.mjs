import { neon } from '@neondatabase/serverless';
import { hash } from '@node-rs/argon2';
import { randomBytes } from 'crypto';

const sql = neon(process.env.DATABASE_URL);

const email = 'demo@irotechlab.com';
const password = 'Demo1234!';
const pwHash = await hash(password);
const clientId = 'iro_demo_client';
const secretRaw = 'iro_sk_live_' + randomBytes(18).toString('base64url').slice(0, 24);
const secretHash = await hash(secretRaw);

const [user] = await sql`
  INSERT INTO users (email, password_hash, first_name, last_name, email_verified)
  VALUES (${email}, ${pwHash}, 'Demo', 'User', TRUE)
  ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
  RETURNING id
`;

await sql`
  INSERT INTO oauth_clients (
    owner_id, client_id, client_secret_hash, client_secret_prefix,
    name, description, redirect_uris, allowed_scopes, is_public
  ) VALUES (
    ${user.id}, ${clientId}, ${secretHash}, ${secretRaw.slice(0, 16) + '…'},
    'Demo App', 'Seeded demo OAuth client',
    ARRAY['http://localhost:3000/callback'],
    ARRAY['openid','profile','email'], FALSE
  )
  ON CONFLICT (client_id) DO NOTHING
`;

console.log('✓ Seeded demo client');
console.log('  Email:        ', email);
console.log('  Password:     ', password);
console.log('  Client ID:    ', clientId);
console.log('  Client Secret:', secretRaw);
