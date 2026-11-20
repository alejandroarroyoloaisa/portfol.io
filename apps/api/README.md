# @portfolio/api

API REST + WebSocket de Portfol.io. Usa NestJS 11, Prisma 6 y PostgreSQL 17 con PostGIS.

- **REST:** prefijo `/api/v1`. La documentación OpenAPI está en `http://localhost:3000/api/docs`.
- **Tiempo real:** Socket.IO, espacio de nombres `/ws`. El cliente se autentica con `handshake.auth.token`.
- **Imágenes públicas:** se sirven en `/media/...` y solo en variantes WebP.

## Puesta en marcha

```bash
# desde la raíz del monorepo
pnpm db:up                                # PostgreSQL + PostGIS en el puerto 5434
cp apps/api/.env.example apps/api/.env
pnpm --filter @portfolio/api prisma:migrate
pnpm db:seed                              # datos de demostración (unos 25 s, genera las imágenes)
pnpm dev:api                              # http://localhost:3000/api/v1
```

En todas las cuentas de demostración la contraseña es `portfolio123`:

| Cuenta | Rol |
|---|---|
| `nora@portfol.io` | Artista (Nora Vidal, Málaga): usuaria principal de la app |
| `alcana@portfol.io` | Galería Alcaná: panel web de organización |
| `elena@portfol.io` | Elena Sáez, comisaria y miembro de Galería Alcaná |
| `admin@portfol.io` | Administración (moderación y verificación) |

## Pruebas

```bash
pnpm --filter @portfolio/api test
```

Son 24 pruebas de integración con Vitest y Supertest. Usan una base de datos propia, `portfolio_test`, que debe existir en el mismo contenedor; si no existe, se crea con:

```bash
docker exec portfolio-db psql -U portfolio -c "CREATE DATABASE portfolio_test"
```

Las pruebas solo aplican migraciones (`migrate deploy`) y generan datos únicos en cada ejecución, así que nunca borran nada. Cubren:

- **Autenticación:** registro, inicio de sesión, rotación del *refresh* y detección de reutilización, recuperación de contraseña.
- **Perfil y obras:** perfil, onboarding y publicación de obras con variantes de imagen.
- **Interacción y red:** valoraciones y comentarios, conexiones y muro, validación de técnicas.
- **Búsqueda:** búsqueda con PostGIS.
- **Datos personales (RGPD):** exportación y supresión de la cuenta.
- **Convocatorias:** RN-2, encaje y avisos, ciclo de vida completo de una solicitud (RN-3, RN-4), documentos con URL firmada.
- **Mensajería:** RN-5 y tiempo real con Socket.IO (mensaje, escribiendo, no leídos, búsqueda).

## Estructura

```
src/
  auth/           registro, login, refresh rotativo, recuperación, OAuth Google (si hay GOOGLE_CLIENT_ID)
  users/          /me (perfil, onboarding, ajustes, resumen, estadísticas, exportar, borrar) y /users
  artworks/       obras, series, sala virtual, valoraciones, guardados, comentarios
  uploads/        subida: variantes WebP con sharp (nunca el original) y PDF privados con URL firmada
  feed/           muro paginado por cursor
  search/         texto completo en español (tsvector), trigramas y distancia (PostGIS ST_DWithin)
  network/        conexiones, sugerencias, seguir
  calls/          convocatorias, solicitudes, panel de organización, algoritmo de encaje
  messaging/      conversaciones (REST) y gateway Socket.IO
  notifications/  avisos en la app, push con Expo, emisión en tiempo real
  reports/        denuncias, moderación y verificación de organizaciones (administración)
  common/         guard JWT con roles, pipe Zod con los esquemas compartidos, mapeadores a DTO
prisma/
  schema.prisma   modelo de datos (Sección 6 de la especificación)
  migrations/     migración inicial; añade a mano la columna geography generada y el tsvector
  seed.ts, art.ts datos de demostración y generador de imágenes de las obras
test/             pruebas de integración
```

## Reglas de negocio implementadas

| Regla | Dónde |
|---|---|
| RN-1. Conexión mutua con aceptación | `network.service.ts` |
| RN-2. Solo organizaciones verificadas publican | `calls.service.ts` (`create`) |
| RN-3. Máximo de obras por solicitud | `applications.service.ts` (`save`) |
| RN-4. Una solicitud enviada no se edita, pero se puede retirar hasta el cierre | `applications.service.ts` |
| RN-5. Para escribir hace falta conexión o contexto | `messaging.service.ts` (`start`) |
| RN-6. La ubicación se muestra solo por ciudad | `common/mappers.ts` (`toUserSummary`) |
| RN-7. El encaje es orientativo | `@portfolio/schemas` (`computeMatch`); nunca bloquea |
