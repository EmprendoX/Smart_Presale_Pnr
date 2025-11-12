# Pruebas manuales de autenticación y KYC

Esta guía resume las verificaciones manuales que se deben ejecutar en cada release para asegurar que el flujo de inicio de sesión y verificación KYC funciona correctamente.

## Preparación

1. Restaurar los usuarios demo ejecutando el procedimiento descrito en [docs/demo-users.md](./demo-users.md).
2. Asegurarse de que el proyecto corra con credenciales válidas de Supabase.
3. Limpiar cookies/sesión del navegador antes de iniciar cada escenario.

## Escenario 1: Login por OTP

1. Abrir `/sign-up` y solicitar un enlace mágico para `ana@example.com`.
2. Completar el login (OTP vía correo de prueba de Supabase) y esperar la redirección a `/dashboard`.
3. Confirmar en la barra superior que el usuario aparece como `buyer` con estado KYC `basic`.
4. Intentar acceder a `/kyc` y verificar que redirige al home porque el usuario ya no requiere completar pasos adicionales.

## Escenario 2: Login por OAuth (Google)

1. Desde `/sign-up`, elegir el proveedor Google y completar el flujo de OAuth (usar credenciales de prueba).
2. Confirmar que el usuario autenticado inicia con `kycStatus = none` y es enviado automáticamente a `/kyc` para capturar datos personales.
3. Completar el formulario de datos personales y guardar. Verificar que la UI muestre un mensaje de progreso y que el `kycStatus` cambie a `basic`.
4. Cargar los documentos requeridos (frontal, reverso e identificación). Al completar la carga, el `kycStatus` debe pasar a `verified` y se debe permitir el acceso a `/dashboard`.

## Escenario 3: Restricción de rutas protegidas

1. Intentar acceder directamente a `/admin` sin sesión. Debe redirigir a `/sign-up`.
2. Iniciar sesión con `pat@example.com` y verificar que, con `kycStatus = verified`, el middleware redirige a `/admin` sin solicitar pasos KYC.
3. Repetir con un usuario en `kycStatus = basic` (por ejemplo, después del paso 3 del escenario OAuth) y confirmar que cualquier ruta protegida redirige a `/kyc?step=documents`.

Documentar cualquier incidencia o diferencia en la consola del navegador y registrar capturas de pantalla cuando el flujo falle.
