import { importPKCS8, importSPKI, exportJWK, type KeyLike } from 'jose';

let _private: KeyLike | null = null;
let _public: KeyLike | null = null;

export async function getPrivateKey(): Promise<KeyLike> {
  if (!_private) {
    const pem = process.env.JWT_PRIVATE_KEY!.replace(/\\n/g, '\n');
    _private = await importPKCS8(pem, 'RS256');
  }
  return _private;
}

export async function getPublicKey(): Promise<KeyLike> {
  if (!_public) {
    const pem = process.env.JWT_PUBLIC_KEY!.replace(/\\n/g, '\n');
    _public = await importSPKI(pem, 'RS256');
  }
  return _public;
}

export async function getJwks() {
  const pub = await getPublicKey();
  const jwk = await exportJWK(pub);
  return {
    keys: [{
      ...jwk,
      use: 'sig',
      alg: 'RS256',
      kid: process.env.JWT_KEY_ID ?? 'iro-key-1',
    }],
  };
}
