# Restaurar usuarios demo

Este procedimiento repuebla la tabla `app_users` de Supabase con los usuarios de demostración definidos en `scripts/seed-supabase-users.mjs`. Está pensado para resetear rápidamente el entorno después de una prueba manual o antes de ejecutar QA.

## Prerrequisitos

1. Variables de entorno configuradas (pueden vivir en `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Tener acceso al proyecto de Supabase que se desea repoblar.

## Pasos

1. Revisar/editar el arreglo `demoUsers` en `scripts/seed-supabase-users.mjs`. Los IDs se sincronizan tal cual, por lo que coincidirán con los registros existentes en Supabase.
2. Ejecutar el script de sincronización:

   ```bash
   npm run seed:users
   ```

   El script usa la llave de servicio para hacer `upsert` (crea o actualiza) en la tabla `app_users` y conservará los roles `buyer`, `developer` y `admin` definidos en el arreglo.
3. Verificar en Supabase (tabla `app_users`) que los usuarios aparecen con su `tenant_id`, `role` y `kyc_status` correctos.

Si el script falla, revise que las variables de entorno sean válidas y que la tabla `tenants` contenga el `tenantId` especificado en cada usuario (por defecto `tenant_default`).
