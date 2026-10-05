import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const issuer = process.env.APP_URL ?? 'https://irotechlab-auth.netlify.app';
  const doc = {
    issuer,
    authorization_endpoint: `${issuer}/api/oauth/authorize`,
    token_endpoint: `${issuer}/api/oauth/token`,
    userinfo_endpoint: `${issuer}/api/oauth/userinfo`,
    revocation_endpoint: `${issuer}/api/oauth/revoke`,
    introspection_endpoint: `${issuer}/api/oauth/introspect`,
    end_session_endpoint: `${issuer}/api/oauth/logout`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: ['openid', 'profile', 'email'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
    revocation_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
    introspection_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
    code_challenge_methods_supported: ['S256'],
    claims_supported: [
      'sub', 'email', 'email_verified', 'name',
      'given_name', 'family_name', 'picture',
    ],
    prompt_values_supported: ['none', 'login', 'consent'],
  };
  return NextResponse.json(doc, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
