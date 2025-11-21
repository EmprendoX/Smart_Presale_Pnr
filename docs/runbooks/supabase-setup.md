# Supabase setup runbook

> ⚠️ **Modo simplificado**: Supabase y Stripe están deshabilitados temporalmente. No ejecutes los SQL de `supabase/` ni los scripts de `scripts/` hasta que se restablezca la integración real.

Esta guía detalla los pasos obligatorios para que cualquier entorno (local, staging o producción) quede alineado con el esquema y almacenamiento que la app espera. Sigue el orden para evitar inconsistencias en KYC o en la sincronización de usuarios.

## 1. Variables de entorno mínimas

Configura los secretos antes de aplicar migraciones o semillas:

| Variable | Descripción | Dónde se usa |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL base del proyecto Supabase | Cliente web y scripts |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave `anon` pública | Cliente web |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave `service_role` **solo** para backend/scripts | API routes y scripts |
| `DEFAULT_TENANT_ID` / `DEFAULT_TENANT_SLUG` | Identificadores del tenant inicial | Bootstrap y seeds |

> 💡 La clave `service_role` jamás debe exponerse en el cliente. Cárgala como secreto en el hosting o en tu gestor de CI/CD antes de ejecutar scripts.

## 2. Aplicar esquema e índices

Ejecuta los scripts SQL incluidos en `supabase/` usando el editor SQL de Supabase, `psql` o la CLI.

```bash
# Aplica tablas, RLS, índices y datos seed mínimos
psql "$SUPABASE_DB_URL" -f supabase/schema.sql

# Crea el bucket privado y las políticas de storage
psql "$SUPABASE_DB_URL" -f supabase/storage-setup.sql
```

Verificaciones rápidas tras ejecutar los scripts:

```sql
-- Confirmar índices críticos de KYC
select indexname from pg_indexes where tablename = 'kyc_profiles';

-- Revisar constraints esenciales
select constraint_name, constraint_type from information_schema.table_constraints
where table_name = 'kyc_profiles';

-- Validar políticas activas de KYC
select policyname from pg_policies where schemaname = 'public' and tablename = 'kyc_profiles';
select policyname from pg_policies where schemaname = 'public' and tablename = 'kyc_documents';

-- Confirmar bucket y políticas de storage
select name, public from storage.buckets where name = 'kyc-documents';
select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'kyc_documents_%';
```

Si alguno de los índices o políticas falta, vuelve a ejecutar el script correspondiente; ambos archivos son idempotentes y no duplicarán definiciones existentes.

## 3. Seeds y sincronización de usuarios

Con el esquema listo y las variables cargadas, ejecuta los scripts Node para poblar datos base:

```bash
# Usuarios demo + sincronización de metadata
node scripts/seed-supabase-users.mjs

# (Opcional) Reconciliar usuarios de Auth existentes con app_users
node scripts/migrate-app-users.mjs
```

Estos scripts requieren `SUPABASE_SERVICE_ROLE_KEY` y `NEXT_PUBLIC_SUPABASE_URL`. Si el script detecta usuarios existentes, hará `upsert` manteniendo metadata.

## 4. Checklist post-deploy

1. Crear o verificar el bucket `kyc-documents` (debe ser privado y con límite de 5 MB).
2. Confirmar que `kyc_profiles` tiene el índice `idx_kyc_profiles_user_id` y las políticas `kyc_profiles_*`.
3. Revisar que `kyc_documents` permita inserciones y lecturas (`kyc_documents_self_*`).
4. Ejecutar el flujo `/kyc` con un usuario nuevo para validar inserciones en `kyc_profiles` y `kyc_documents` y la actualización de `kycStatus`.
5. Documentar cualquier cambio adicional de esquema en `supabase/schema.sql` y versionarlo.

Consulta también [../supabase-verification.md](../supabase-verification.md) para restricciones del entorno de CI donde no hay acceso directo a Supabase.
