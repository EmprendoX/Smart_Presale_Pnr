import { DatabaseService } from './services/db';
import { SupabaseService } from './services/supabase-service';
import { createPaymentService } from './services/payment';

/**
 * Valida la configuración de autenticación y muestra advertencias en desarrollo
 */
function validateAuthConfig() {
  if (process.env.NODE_ENV !== 'development') {
    return; // Solo validar en desarrollo
  }

  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!hasSupabaseUrl || !hasSupabaseKey || !hasServiceKey) {
    console.warn(
      '\n⚠️  [config] ADVERTENCIA: Faltan credenciales de Supabase:\n' +
        `   - NEXT_PUBLIC_SUPABASE_URL: ${hasSupabaseUrl ? '✓' : '✗'}\n` +
        `   - NEXT_PUBLIC_SUPABASE_ANON_KEY: ${hasSupabaseKey ? '✓' : '✗'}\n` +
        `   - SUPABASE_SERVICE_ROLE_KEY: ${hasServiceKey ? '✓' : '✗'}\n` +
        '   La aplicación requiere Supabase configurado correctamente.\n'
    );
  } else {
    console.log('[config] ✓ Credenciales de Supabase detectadas');
  }
}

// Validar configuración al cargar el módulo
validateAuthConfig();

let dbService: DatabaseService;

try {
  dbService = new SupabaseService();
  console.log('[config] Modo Supabase activado');
} catch (error) {
  console.error('[config] Error al inicializar Supabase:', error);
  throw error;
}

export const db = dbService;
export const payments = createPaymentService(dbService);


