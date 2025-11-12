#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

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

function getEnv(name, required = true) {
  const value = process.env[name];
  if (!value && required) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

async function seed() {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', false);

  console.log('➡️  Seeding demo users to Supabase...');
  const users = demoUsers;

  if (!users.length) {
    console.log('⚠️  No demo users defined, nothing to seed.');
    return;
  }

  const client = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: anonKey ? { 'x-client-info': 'seed-script', 'x-anon-key': anonKey } : { 'x-client-info': 'seed-script' }
    }
  });

  let created = 0;
  let updated = 0;

  for (const user of users) {
    const payload = {
      id: user.id,
      tenant_id: user.tenantId ?? 'tenant_default',
      name: user.name,
      role: user.role,
      kyc_status: user.kycStatus ?? 'none',
      email: user.email ?? null,
      metadata: user.metadata ?? null
    };

    const { data: existing, error: findError } = await client
      .from('app_users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (findError) {
      throw new Error(`Failed to verify existing user ${user.id}: ${findError.message}`);
    }

    const { error } = await client
      .from('app_users')
      .upsert(payload, { onConflict: 'id', ignoreDuplicates: false, defaultToNull: false });

    if (error) {
      throw new Error(`Failed to upsert user ${user.id}: ${error.message}`);
    }

    if (existing) {
      updated += 1;
      console.log(`🔁 Updated ${user.id} (${user.role})`);
    } else {
      created += 1;
      console.log(`✨ Created ${user.id} (${user.role})`);
    }
  }

  console.log(`✅  Users synced. Created: ${created}, Updated: ${updated}`);
}

seed().catch(error => {
  console.error('❌  Seeding failed:', error);
  process.exit(1);
});
