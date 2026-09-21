const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(relative, mocks = {}) {
  const file = path.resolve(__dirname, '..', relative);
  const loaded = new Module(file, module);
  loaded.require = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('@/')) {
      const target = path.resolve(__dirname, '..', name.slice(2));
      return load(path.relative(path.resolve(__dirname, '..'), target) + '.ts', mocks);
    }
    return require(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, file);
  return loaded.exports;
}

function request(body) {
  return new Request('https://example.com/api/account/test', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

test('signup trims and lowercases email and uses the account confirmation redirect', async () => {
  let args;
  const route = load('app/api/account/signup/route.ts', {
    '@/lib/supabase-server': { applySupabaseAuthCookies: () => {}, createServerClient: async () => ({ auth: { signUp: async (input) => { args = input; return { data: { user: { id: 'u1' } }, error: null }; } } }) },
    '@/lib/site-origin': { siteOrigin: () => 'https://example.com' },
  });
  const response = await route.POST(request({ email: '  Ada@Example.COM ', password: 'long-password' }));
  assert.equal(response.status, 200);
  assert.equal(args.email, 'ada@example.com');
  assert.equal(args.options.emailRedirectTo, 'https://example.com/auth/confirm?next=%2Faccount');
});

test('signup returns a generic response for an existing account', async () => {
  const route = load('app/api/account/signup/route.ts', {
    '@/lib/supabase-server': { applySupabaseAuthCookies: () => {}, createServerClient: async () => ({ auth: { signUp: async () => ({ data: {}, error: { message: 'User already registered', status: 422 } }) } }) },
    '@/lib/site-origin': { siteOrigin: () => 'https://example.com' },
  });
  const response = await route.POST(request({ email: 'ada@example.com', password: 'long-password' }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
});

test('login normalizes credentials and rejects unverified users with a resend hint', async () => {
  let args;
  const route = load('app/api/account/login/route.ts', {
    '@/lib/supabase-server': { createServerClient: async () => ({ auth: { signInWithPassword: async (input) => { args = input; return { data: { user: { email_confirmed_at: null } }, error: null }; } } }) },
  });
  const response = await route.POST(request({ email: ' Ada@Example.COM ', password: 'long-password' }));
  assert.equal(response.status, 403);
  assert.equal(args.email, 'ada@example.com');
  assert.match((await response.json()).error, /verify/i);
});

test('password reset and verification resend use account confirmation links', async () => {
  const calls = [];
  const auth = {
    resetPasswordForEmail: async (...args) => { calls.push(['reset', ...args]); return { error: null }; },
    resend: async (...args) => { calls.push(['resend', ...args]); return { error: null }; },
  };
  const mocks = {
    '@/lib/supabase-server': { applySupabaseAuthCookies: () => {}, createServerClient: async () => ({ auth }) },
    '@/lib/site-origin': { siteOrigin: () => 'https://example.com' },
  };
  const reset = load('app/api/account/password-reset/route.ts', mocks);
  const resend = load('app/api/account/resend-verification/route.ts', mocks);
  assert.equal((await reset.POST(request({ email: ' Ada@Example.COM ' }))).status, 200);
  assert.equal((await resend.POST(request({ email: ' Ada@Example.COM ' }))).status, 200);
  assert.equal(calls[0][1], 'ada@example.com');
  assert.equal(calls[0][2].redirectTo, 'https://example.com/auth/confirm?next=%2Faccount');
  assert.equal(calls[1][1].email, 'ada@example.com');
  assert.equal(calls[1][1].options.emailRedirectTo, 'https://example.com/auth/confirm?next=%2Faccount');
});

test('account confirmation redirects to account while preserving registration and admin destinations', async () => {
  const route = load('app/auth/confirm/route.ts', {
    '@/lib/supabase-server': { applySupabaseAuthCookies: () => {}, createServerClient: async () => ({ auth: { verifyOtp: async () => ({ error: null }), exchangeCodeForSession: async () => ({ error: null }) } }) },
    '@/lib/admin-auth': { PASSWORD_RESET_COOKIE: 'reset-cookie' },
  });
  const confirmRequest = (url, cookieValue) => { const parsed = new URL(url); return { url, nextUrl: { origin: parsed.origin, searchParams: parsed.searchParams }, cookies: { get: (name) => cookieValue && name === 'reset-cookie' ? { value: cookieValue } : undefined } }; };
  const account = await route.GET(confirmRequest('https://example.com/auth/confirm?token_hash=t&type=signup&next=%2Faccount'));
  assert.equal(new URL(account.headers.get('location')).pathname, '/account');
  const register = await route.GET(confirmRequest('https://example.com/auth/confirm?token_hash=t&type=signup'));
  assert.equal(new URL(register.headers.get('location')).pathname, '/register/verified');
  const admin = await route.GET(confirmRequest('https://example.com/auth/confirm?token_hash=t&type=recovery', '1'));
  assert.equal(new URL(admin.headers.get('location')).pathname, '/admin/reset-password');
  const accountRecovery = await route.GET(confirmRequest('https://example.com/auth/confirm?token_hash=t&type=recovery&next=%2Faccount'));
  assert.equal(new URL(accountRecovery.headers.get('location')).pathname, '/account');
  assert.equal(new URL(accountRecovery.headers.get('location')).searchParams.get('recovery'), '1');
  const unscopedRecovery = await route.GET(confirmRequest('https://example.com/auth/confirm?token_hash=t&type=recovery'));
  assert.equal(new URL(unscopedRecovery.headers.get('location')).pathname, '/admin/reset-password');
});

test('account UI includes authenticated password update validation and Supabase update call', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../app/account/AccountClient.tsx'), 'utf8');
  assert.match(source, /updateUser\(\{ password \}\)/);
  assert.match(source, /passwords do not match/);
  assert.match(source, /Update password/);
});
