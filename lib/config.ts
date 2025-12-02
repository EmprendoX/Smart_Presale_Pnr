import type { DatabaseService } from './services/db';
import { SupabaseService } from './services/supabase-service';
import { createPaymentService } from './services/payment';
import { isSupabaseEnabled } from './auth/supabase';

const isEdgeRuntime = process.env.NEXT_RUNTIME === 'edge';

let dbService: DatabaseService;

if (isEdgeRuntime) {
  if (!isSupabaseEnabled()) {
    throw new Error('[config] Supabase debe estar habilitado para usarse en runtime Edge.');
  }
  dbService = new SupabaseService();
  console.log('[config] Supabase activado en runtime Edge');
} else {
  // Cargar MockDbService solo en rutas Node para evitar dependencias de fs en Edge/middleware
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MockDbService } = require('./services/mock-db-service');

  dbService = isSupabaseEnabled()
    ? new SupabaseService()
    : new MockDbService();

  if (isSupabaseEnabled()) {
    console.log('[config] Supabase activado - Conectado a base de datos real');
  } else {
    console.log('[config] Modo Mock activado - Sin base de datos ni autenticación');
  }
}

export const db = dbService;
export const payments = createPaymentService(dbService);


