#!/usr/bin/env node

const demoUsers = [
  {
    id: 'u_buyer_1',
    name: 'Ana Compradora',
    role: 'buyer',
    kycStatus: 'basic',
    tenantId: 'tenant_default',
    email: 'ana@example.com',
    metadata: {
      phone: '+52 555 555 0000'
    }
  },
  {
    id: 'u_dev_1',
    name: 'Carlos Dev',
    role: 'developer',
    kycStatus: 'verified',
    tenantId: 'tenant_default',
    email: 'carlos@example.com',
    metadata: {
      company: 'BlueRock Dev S.A.'
    }
  },
  {
    id: 'u_admin_1',
    name: 'Pat Admin',
    role: 'admin',
    kycStatus: 'verified',
    tenantId: 'tenant_default',
    email: 'pat@example.com',
    metadata: {
      notes: 'Super admin demo'
    }
  }
];

function getEnv(name, { required = true, fallback } = {}) {
  const value = process.env[name] ?? fallback;
  if (!value && required) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function parseListEnv(name) {
  const raw = process.env[name];
  if (!raw) {
    return new Set();
  }
  return new Set(
    raw
      .split(',')
      .map(entry => entry.trim().toLowerCase())
      .filter(Boolean)
  );
}

async function parseJsonResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse JSON response (${response.status}): ${text}`);
  }
}

function buildUrl(base, path, searchParams) {
  const url = new URL(path, base);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    }
  }
  return url;
}

function normalizeMetadata(value) {
  if (value === null) {
    return null;
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'object' && value !== null) {
    return value;
  }
  if (value === undefined) {
    return {};
  }
  return { value };
}

function nameFromEmail(email, fallback) {
  if (!email) {
    return fallback;
  }
  const [local] = email.split('@');
  if (!local) {
    return fallback;
  }
  return local
    .split(/[._-]+/g)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function createSupabaseRestClient({ url, serviceKey, anonKey, clientInfo }) {
  const restBase = new URL('/rest/v1/', url).toString();
  const authBase = new URL('/auth/v1/', url).toString();
  const baseHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: 'application/json',
    'x-client-info': clientInfo
  };

  if (anonKey) {
    baseHeaders['x-anon-key'] = anonKey;
  }

  async function request(method, path, { base = restBase, searchParams, headers, body, prefer } = {}) {
    const url = buildUrl(base, path, searchParams);
    const finalHeaders = {
      ...baseHeaders,
      ...headers
    };

    if (prefer?.length) {
      finalHeaders.Prefer = prefer.join(',');
    }

    const init = {
      method,
      headers: finalHeaders
    };

    if (body !== undefined) {
      finalHeaders['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    const response = await fetch(url, init);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${method} ${url} failed with ${response.status}: ${errorText}`);
    }

    return parseJsonResponse(response);
  }

  return {
    restBase,
    authBase,
    listAppUsersByIds: async ids => {
      if (!ids.length) {
        return new Map();
      }

      const serialized = ids.map(id => JSON.stringify(id)).join(',');
      const params = {
        select: 'id,tenant_id,name,role,kyc_status,email,metadata',
        id: `in.(${serialized})`
      };
      const rows = (await request('GET', 'app_users', { searchParams: params })) ?? [];
      return new Map(rows.map(row => [row.id, row]));
    },
    upsertAppUsers: async rows => {
      if (!rows.length) {
        return [];
      }
      return (
        await request('POST', 'app_users', {
          searchParams: { on_conflict: 'id' },
          body: rows,
          prefer: ['resolution=merge-duplicates', 'return=representation']
        })
      ) ?? [];
    },
    fetchAllAuthUsers: async () => {
      const perPage = 100;
      let page = 1;
      const users = [];

      while (true) {
        const pageUsers =
          (await request('GET', 'admin/users', {
            base: authBase,
            searchParams: { page: String(page), per_page: String(perPage) }
          })) ?? [];

        const list = Array.isArray(pageUsers?.users)
          ? pageUsers.users
          : Array.isArray(pageUsers)
          ? pageUsers
          : [];

        if (!list.length) {
          break;
        }

        users.push(...list);

        if (list.length < perPage) {
          break;
        }

        page += 1;
      }

      return users;
    }
  };
}

function buildDemoPayload(user, { defaultTenantId }) {
  return {
    id: user.id,
    tenant_id: user.tenantId ?? defaultTenantId,
    name: user.name,
    role: user.role,
    kyc_status: user.kycStatus ?? 'none',
    email: user.email ?? null,
    metadata: normalizeMetadata(user.metadata ?? null)
  };
}

function buildAuthPayload(authUser, existing, { defaultTenantId, adminEmails, developerEmails }) {
  const existingMetadata = Object.prototype.hasOwnProperty.call(existing ?? {}, 'metadata')
    ? existing.metadata
    : undefined;
  const email = authUser.email ?? existing?.email ?? null;
  const appRole = authUser.app_metadata?.role ?? authUser.user_metadata?.role;
  const inferredRole = appRole
    ? String(appRole)
    : email && adminEmails.has(email.toLowerCase())
    ? 'admin'
    : email && developerEmails.has(email.toLowerCase())
    ? 'developer'
    : 'buyer';
  const role = existing?.role ?? inferredRole;

  const appKyc = authUser.app_metadata?.kyc_status ?? authUser.user_metadata?.kyc_status;
  const inferredKyc = appKyc
    ? String(appKyc)
    : role === 'admin'
    ? 'verified'
    : role === 'developer'
    ? 'basic'
    : 'none';
  const kyc_status = existing?.kyc_status ?? inferredKyc;

  const name = existing?.name ?? authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? nameFromEmail(email, `User ${authUser.id}`);
  const tenantId = existing?.tenant_id ?? authUser.user_metadata?.tenant_id ?? defaultTenantId;

  const rawMetadata = existingMetadata !== undefined ? existingMetadata : authUser.user_metadata ?? authUser.raw_user_meta_data ?? {};

  return {
    id: authUser.id,
    tenant_id: tenantId,
    name,
    role,
    kyc_status,
    email,
    metadata: normalizeMetadata(rawMetadata)
  };
}

async function seed() {
  const url = new URL(getEnv('NEXT_PUBLIC_SUPABASE_URL'));
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', { required: false });
  const defaultTenantId = getEnv('DEFAULT_TENANT_ID', { required: false, fallback: 'tenant_default' });
  const adminEmails = parseListEnv('ADMIN_EMAILS');
  const developerEmails = parseListEnv('DEVELOPER_EMAILS');

  const client = createSupabaseRestClient({
    url,
    serviceKey,
    anonKey,
    clientInfo: 'seed-script'
  });

  console.log('➡️  Seeding demo users to Supabase...');
  const demoIds = demoUsers.map(user => user.id);
  const existingDemo = await client.listAppUsersByIds(demoIds);
  const demoPayloads = demoUsers.map(user => buildDemoPayload(user, { defaultTenantId }));
  await client.upsertAppUsers(demoPayloads);

  let demoCreated = 0;
  let demoUpdated = 0;
  for (const payload of demoPayloads) {
    if (existingDemo.has(payload.id)) {
      demoUpdated += 1;
      console.log(`🔁 Updated ${payload.id} (${payload.role})`);
    } else {
      demoCreated += 1;
      console.log(`✨ Created ${payload.id} (${payload.role})`);
    }
  }
  console.log(`✅  Demo users synced. Created: ${demoCreated}, Updated: ${demoUpdated}`);

  console.log('➡️  Synchronizing Supabase Auth users into app_users...');
  let authUsers = [];
  try {
    authUsers = await client.fetchAllAuthUsers();
  } catch (error) {
    console.warn('⚠️  Unable to load Supabase Auth users:', error.message);
  }

  if (!authUsers.length) {
    console.log('⚠️  No Supabase Auth users found or request failed. Skipping auth user sync.');
    return;
  }

  const authIds = authUsers.map(user => user.id);
  const existingAuthUsers = await client.listAppUsersByIds(authIds);

  const authPayloads = authUsers.map(user =>
    buildAuthPayload(user, existingAuthUsers.get(user.id), {
      defaultTenantId,
      adminEmails,
      developerEmails
    })
  );

  await client.upsertAppUsers(authPayloads);

  let authCreated = 0;
  let authUpdated = 0;
  for (const payload of authPayloads) {
    if (existingAuthUsers.has(payload.id)) {
      authUpdated += 1;
    } else {
      authCreated += 1;
    }
  }

  console.log(`✅  Auth users synced. Created: ${authCreated}, Updated: ${authUpdated}`);
}

seed().catch(error => {
  console.error('❌  Seeding failed:', error);
  process.exit(1);
});
