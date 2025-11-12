#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dataFile = path.join(projectRoot, 'data', 'users.json');

function getEnv(name, required = true) {
  const value = process.env[name];
  if (!value && required) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

async function loadUsers() {
  try {
    const content = await fs.readFile(dataFile, 'utf8');
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      throw new Error('users.json must contain an array of users');
    }
    return parsed;
  } catch (error) {
    throw new Error(`Failed to read demo users from ${dataFile}: ${error.message}`);
  }
}

async function seed() {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', false);

  console.log('➡️  Seeding demo users to Supabase...');
  const users = await loadUsers();

  if (!users.length) {
    console.log('⚠️  users.json is empty, nothing to seed.');
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
