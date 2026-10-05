import { generateKeyPair, exportPKCS8, exportSPKI } from 'jose';

const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
const priv = await exportPKCS8(privateKey);
const pub = await exportSPKI(publicKey);

console.log('# Add these to .env (escape newlines as \\n)');
console.log('JWT_PRIVATE_KEY="' + priv.replace(/\n/g, '\\n') + '"');
console.log('JWT_PUBLIC_KEY="' + pub.replace(/\n/g, '\\n') + '"');
console.log('JWT_KEY_ID=iro-key-1');
