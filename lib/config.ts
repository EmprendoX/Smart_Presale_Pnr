import { DatabaseService } from './services/db';
import { MockDbService } from './services/mock-db-service';
import { SupabaseService } from './services/supabase-service';
import { createPaymentService } from './services/payment';
import { isSupabaseEnabled } from './auth/supabase';

// Determinar qué servicio usar basado en las variables de entorno
const dbService: DatabaseService = isSupabaseEnabled() 
  ? new SupabaseService()
  : new MockDbService();

// Log para confirmar qué modo está activo
if (isSupabaseEnabled()) {
  console.log('[config] Supabase activado - Conectado a base de datos real');
} else {
  console.log('[config] Modo Mock activado - Sin base de datos ni autenticación');
}

export const db = dbService;
export const payments = createPaymentService(dbService);


