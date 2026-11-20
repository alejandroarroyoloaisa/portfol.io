# Portfol.io · web (Next.js)

Aplicación web de Portfol.io: **portfolio público indexable** de cada artista u organización, **portada**, **listado público de convocatorias** y **panel de galerías e instituciones** para publicar convocatorias y revisar candidaturas.

- Next.js 16.4 (App Router, Turbopack) · React 19.3 · TypeScript estricto.
- CSS sin frameworks: hoja global con variables generadas desde `@portfolio/tokens` + CSS Modules por pantalla.
- Tipografías con `next/font/google` (Bricolage Grotesque y Caveat), autoalojadas en el build.
- Cliente tipado `@portfolio/api-client`, tipos y esquemas Zod de `@portfolio/schemas`.

## Puesta en marcha

Requisitos: la API (`apps/api`) en marcha en `http://localhost:3000/api/v1` con los datos de demostración cargados.

```bash
# desde la raíz del monorepo
pnpm install
pnpm --filter @portfolio/web dev          # http://localhost:3001

# producción
pnpm --filter @portfolio/web build
pnpm --filter @portfolio/web start        # http://localhost:3001

# comprobaciones
pnpm --filter @portfolio/web typecheck    # tsc --noEmit
pnpm --filter @portfolio/web lint         # eslint
```

Si se modifican los paquetes compartidos, recompílalos antes (`node_modules/.bin/tsc -p packages/<paquete>/tsconfig.json`). La web los consume desde `dist/` y además los declara en `transpilePackages`.

### Variables de entorno

Copia `.env.example` a `.env.local` si necesitas cambiarlas.

| Variable | Por defecto | Uso |
| --- | --- | --- |
| `API_URL` | `http://localhost:3000/api/v1` | API vista desde el servidor de Next (SSR, Server Actions, proxy). |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000/api/v1` | API vista desde el navegador (solo el registro de visitas al perfil). |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3001` | Base de las URL canónicas, Open Graph, JSON-LD y `sitemap.xml`. |
| `COOKIE_SECURE` | `true` en producción | Atributo `Secure` de las cookies de sesión. `false` solo para probar `next start` por http fuera de `localhost`. |

### Cuentas de demostración

| Cuenta | Contraseña | Qué ve |
| --- | --- | --- |
| `alcana@portfol.io` (Galería Alcaná) | `portfolio123` | Panel completo: «Nuevos realismos» (7 candidaturas), «Pequeño formato · invierno» y un borrador. |
| `elena@portfol.io` (comisaria de Alcaná) | `portfolio123` | Panel; ver «Limitaciones conocidas». |
| `nora@portfol.io` (artista) | `portfolio123` | Mensaje explicando que el panel es solo para organizaciones. |

Portfolios públicos de ejemplo: `/noravidal`, `/luciamontero`, `/galeriaalcana`.

## Rutas

| Ruta | Render | Descripción |
| --- | --- | --- |
| `/` | estático + ISR (5 min) | Portada: qué es Portfol.io, para artistas / para galerías, portfolios de ejemplo y convocatorias abiertas. |
| `/[alias]` | ISR (1 min) | **W1** · Portfolio público. Variante de artista (héroe, cifras, «El cuaderno» con filtro por series, trayectoria, técnicas validadas, contacto) y variante de organización (descripción, dirección y horario, convocatorias abiertas, exposición actual, artistas representados). |
| `/[alias]/obra/[id]` | ISR (1 min) | Ficha técnica de una obra. Desde la rejilla se abre como **modal** (ruta interceptada `@modal/(.)obra/[id]`); al recargar o compartir el enlace se ve la página completa. |
| `/convocatorias` | dinámico (datos cacheados 1 min) | Convocatorias abiertas con filtro por tipo (`?tipo=premio`…). |
| `/convocatorias/[id]` | ISR (1 min) | Detalle público de una convocatoria (los borradores devuelven 404). |
| `/acceder` | dinámico | Inicio de sesión del panel (Server Action). |
| `/panel` | dinámico, privado | Resumen: cifras y convocatorias con su reparto de candidaturas por estado. |
| `/panel/convocatorias` | dinámico, privado | Todas las convocatorias, filtrables por estado. |
| `/panel/convocatorias/nueva` | dinámico, privado | Crear convocatoria. |
| `/panel/convocatorias/[id]` | dinámico, privado | **W2** · Candidaturas: cifras, filtros por estado, búsqueda por artista, orden (encaje / recientes / nombre), miniaturas, encaje, estado y acciones. |
| `/panel/convocatorias/[id]/editar` | dinámico, privado | Editar convocatoria (incluido su estado). |
| `/panel/convocatorias/[id]/solicitudes/[aid]` | dinámico, privado | Solicitud completa: carta, obras, documentos, historial, decisión y «Escribir a la artista». |
| `/panel/convocatorias/[id]/exportar` | Route Handler | CSV (Excel) de la selección (preseleccionadas y aceptadas; `?todas=1` para todas). |
| `/robots.txt`, `/sitemap.xml`, `/icon.svg` | estáticos | SEO e icono. |

Los alias inexistentes devuelven un **404 real** con la página de error del sistema visual.

## Autenticación (cookies HttpOnly + rotación del refresh token)

La especificación (Sección 5) pide que en la web el token de renovación viva en una cookie `HttpOnly`. El diseño es:

1. **Login** (`/acceder`, Server Action `login`): valida con `loginSchema`, llama a `POST /auth/login` desde el servidor y guarda `pf_at` (token de acceso, 15 min) y `pf_rt` (refresh, 30 días) como cookies `HttpOnly; SameSite=Lax; Path=/` y `Secure` en producción. El JavaScript del navegador nunca ve los tokens.
2. **Proxy** (`src/proxy.ts`, antes «middleware», solo en `/panel/*` y `/acceder`):
   - sin cookies → redirige a `/acceder?next=<ruta>`;
   - token de acceso caducado o a menos de 30 s de caducar → `POST /auth/refresh`, **rota las dos cookies** en la respuesta y reescribe la cabecera `Cookie` de la petición para que los Server Components de esa misma petición usen ya el token nuevo;
   - refresh rechazado → borra las cookies y redirige a `/acceder?caducada=1`.
   La API revoca toda la familia de tokens si un refresh se usa dos veces; por eso las peticiones simultáneas (navegación y precargas) comparten una única renovación en curso durante 20 s.
3. **Servidor** (`src/lib/session.ts`):
   - `getRenderApi()` para renderizar: solo lleva el token de acceso (un Server Component no puede escribir cookies, así que no intenta renovar). Un 401 inesperado redirige al login.
   - `getActionApi()` para Server Actions y Route Handlers: lleva ambos tokens y, ante un 401, renueva y rota las cookies de forma transparente con el propio `api-client`.
   - `getMe()` y `getDashboard()` se memorizan por petición con `cache()` de React.
4. **Autorización**: cada Server Action comprueba la sesión y la API valida que la persona gestiona la convocatoria. Las cuentas que no son de organización ven un mensaje claro en lugar del panel.
5. **Logout**: Server Action que llama a `POST /auth/logout` (revoca el refresh) y borra las cookies.

## Decisiones

- **Sin Cache Components.** El andamiaje de `create-next-app` activaba `cacheComponents`; se ha desactivado porque con él la respuesta empieza a emitirse antes de comprobar el alias y un perfil inexistente devolvería `200` + `noindex` en lugar de `404`, y el panel tendría que redirigir ya en streaming. Se usa el modelo clásico: ISR (`revalidate`) en lo público y renderizado dinámico (cookies) en el panel.
- **Visitas al perfil** (`POST /users/:id/view`): se registran desde el navegador (una vez por pestaña) porque la página pública se sirve cacheada.
- **Imágenes** (RNF-13): se usan siempre las variantes `thumb`/`medium`/`large` que sirve la API (nunca el original) con `next/image` sin optimizador; el menú contextual y el arrastre están desactivados como cortesía.
- **SEO** (RF-12): `generateMetadata` con título, descripción, canónica, Open Graph (primera obra en tamaño `medium`) y Twitter; JSON-LD `Person` + `VisualArtwork` para artistas, `ArtGallery`/`Organization` (+ `ExhibitionEvent`) para organizaciones, `VisualArtwork` en la ficha de obra y `Event` en las convocatorias; `robots.txt` excluye `/panel`.
- **Formularios**: el de convocatoria se valida en el navegador y en la Server Action con el **mismo** esquema compartido (`createCallSchema` / `updateCallSchema`) a través de `src/lib/call-form.ts`.
- **Accesibilidad**: HTML semántico, enlace «Saltar al contenido», foco visible, etiquetas en todos los campos, errores enlazados con `aria-describedby`, diálogos nativos (`<dialog>`), filtros como enlaces o botones `aria-pressed`, contraste AA (verde `#1B7A50` y coral de texto `#C23D17` de los tokens), `prefers-reduced-motion`.

## Requisitos cubiertos

| Requisito | Dónde |
| --- | --- |
| RF-12 Portfolio público compartible e indexable | `/[alias]`, `/[alias]/obra/[id]`, metadatos, JSON-LD, sitemap |
| RF-26 Publicar y editar convocatorias desde la web | `/panel/convocatorias/nueva`, `/panel/convocatorias/[id]/editar` |
| RF-27 Revisar, filtrar, preseleccionar y descartar candidaturas | `/panel/convocatorias/[id]` y detalle de solicitud |
| RF-28 Comunicar el resultado | Cambio de estado con nota (la API avisa a la artista) y «Escribir a la artista» |
| RNF-13 Protección de obra | Variantes reducidas, sin descarga directa |
| RNF-05 / accesibilidad | Ver «Decisiones» |

## Estructura

```
src/
  proxy.ts                  sesión del panel (redirecciones y rotación de tokens)
  lib/                      config, cliente público, sesión, cookies, formato, formulario de convocatoria
  components/               piezas del sistema «Recortes» (recortes, cinta, formas, tarjetas, modal…)
  app/
    (site)/                 zona pública con cabecera y pie
      [handle]/             portfolio + @modal (ficha de obra interceptada) + obra/[id]
      convocatorias/        listado y detalle públicos
      acceder/              login (Server Action)
    panel/                  panel privado (layout con barra lateral, Server Actions, CSV)
```

## Limitaciones conocidas

- La cuenta `elena@portfol.io` tiene rol `galeria` y la API la trata como su propia organización (`orgId` = su id), así que su resumen sale vacío aunque sea miembro de Galería Alcaná. Es un problema de la API (`orgOf()` / `GET /me`), no de la web.
- Los documentos sembrados en la demo (`perfil/cv`, …) no tienen URL firmada; la web muestra «enlace no disponible» hasta que la API devuelva `documents[].url`.
- Los botones de descarga de la app son informativos: todavía no hay fichas publicadas en las tiendas.
