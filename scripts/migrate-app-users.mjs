#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

function getEnv(name, { required = true, fallback } = {}) {
  const value = process.env[name] ?? fallback;
  if (!value && required) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

async function main() {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const defaultTenant = getEnv('DEFAULT_TENANT_ID', { required: false, fallback: 'tenant_default' });

  const client = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: anonKey
        ? { 'x-client-info': 'app-users-migration', 'x-anon-key': anonKey }
        : { 'x-client-info': 'app-users-migration' }
    }
  });

  console.log('➡️  Inspecting Supabase app_users table...');
  const { data: users, error } = await client.from('app_users').select('*');
  if (error) {
    throw new Error(`Failed to load app_users: ${error.message}`);
  }

  if (!users?.length) {
    console.log('⚠️  No users found in app_users. Nothing to migrate.');
    return;
  }

  const updates = [];
  const report = { missingTenant: 0, missingRole: 0, missingKyc: 0, missingName: 0, missingMetadata: 0 };

  for (const user of users) {
    const payload = { id: user.id };
    let needsUpdate = false;

    if (!user.tenant_id) {
      payload.tenant_id = defaultTenant;
      needsUpdate = true;
      report.missingTenant += 1;
    }

    if (!user.role) {
      payload.role = 'buyer';
      needsUpdate = true;
      report.missingRole += 1;
    }

    if (!user.kyc_status) {
      payload.kyc_status = 'none';
      needsUpdate = true;
      report.missingKyc += 1;
    }

    if (!user.name) {
      payload.name = user.email ?? `User ${user.id}`;
      needsUpdate = true;
      report.missingName += 1;
    }

    if (user.metadata === null) {
      payload.metadata = {};
      needsUpdate = true;
      report.missingMetadata += 1;
    }

    if (needsUpdate) {
      updates.push(payload);
      console.log(`🔧 Preparing update for ${user.id}`, payload);
    }
  }

  if (!updates.length) {
    console.log('✅  All users already contain required fields.');
    return;
  }

  console.log(`➡️  Applying fixes to ${updates.length} users...`);
  const { error: upsertError } = await client
    .from('app_users')
    .upsert(updates, { onConflict: 'id', ignoreDuplicates: false, defaultToNull: false });

  if (upsertError) {
    throw new Error(`Failed to update app_users: ${upsertError.message}`);
  }

  console.log('✅  app_users table updated successfully. Summary:');
  console.table(report);
}

main().catch(error => {
  console.error('❌  Migration failed:', error);
  process.exit(1);
});
