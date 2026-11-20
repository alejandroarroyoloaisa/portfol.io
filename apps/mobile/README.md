# Portfol.io · app móvil

App de **Portfol.io**, la red profesional de quienes pintan, hecha con **Expo (SDK 58) + React Native 0.88 + TypeScript**.
Sigue el sistema visual **«Recortes»** de las maquetas (`../../../diseno/recorte-*.dc.html`) y consume la API NestJS del
monorepo (`apps/api`) a través del cliente tipado `@portfolio/api-client`.

Todo el texto de la interfaz está en español de España y externalizado en `src/i18n/es.ts` (RNF-10).

---

## Cómo arrancarla

Requisitos: Node 20+, pnpm 11 y la API en marcha (`apps/api`, por defecto en `http://localhost:3000`).

```bash
# desde la raíz del monorepo
pnpm install
# (si los paquetes compartidos han cambiado) compilar sus tipos
node_modules/.bin/tsc -p packages/schemas/tsconfig.json
node_modules/.bin/tsc -p packages/api-client/tsconfig.json
node_modules/.bin/tsc -p packages/tokens/tsconfig.json

cd apps/mobile
npx expo start          # menú de Expo: «i» simulador iOS, «a» emulador Android, «w» web
npx expo start --web    # solo la versión web (http://localhost:8081)
```

- **Expo Go**: escanea el QR que muestra `npx expo start`. Funciona todo salvo las notificaciones *push* remotas
  (Expo Go en Android no las admite desde el SDK 53; la app lo detecta y no falla).
- **Development build** (recomendada para probar *push*): `npx expo run:ios` / `npx expo run:android`,
  o `npx eas-cli@latest build --profile development`.
- **Web**: `npx expo start --web` o `npx expo export --platform web` (genera `dist/`). La API ya permite CORS desde
  `http://localhost:8081`.

Usuaria de demostración: **nora@portfol.io / portfolio123** (Nora Vidal, pintora en Málaga).
Otras cuentas: `luciamontero@portfol.io`, `elena@portfol.io` (comisaria), `alcana@portfol.io` (galería), todas con `portfolio123`.

### URL de la API

El orden de prioridad es:

1. Variable de entorno **`EXPO_PUBLIC_API_URL`** (se incrusta al empaquetar):
   ```bash
   EXPO_PUBLIC_API_URL=http://192.168.1.20:3000/api/v1 npx expo start
   ```
2. `app.json` → `expo.extra.apiUrl`.
3. `http://localhost:3000/api/v1` por defecto.

> **En un móvil físico `localhost` es el propio móvil**: usa la IP de tu ordenador en la red local
> (`ipconfig getifaddr en0` en macOS, `hostname -I` en Linux) y asegúrate de que el móvil está en la misma wifi.
> En el emulador de Android, usa `http://10.0.2.2:3000/api/v1`.
>
> La API devuelve las imágenes con su URL pública (`http://localhost:3000/media/…`); la app reescribe ese origen al de
> `EXPO_PUBLIC_API_URL` para que también carguen en el móvil (`src/config.ts → mediaUrl`). El tiempo real usa el mismo
> host (`<origen>/ws`).

### Comprobaciones

```bash
cd apps/mobile
node_modules/.bin/tsc --noEmit          # tipos (TypeScript 6, modo estricto)
npx expo export --platform web          # empaquetado
npx expo-doctor                         # dependencias y configuración
```

---

## Estructura

```
apps/mobile
├── index.ts                  registerRootComponent → src/App
├── app.json                  configuración Expo (plugins, extra.apiUrl, esquema portfolio://)
└── src
    ├── App.tsx               fuentes, sesión, caché sin conexión, tiempo real, navegación, push
    ├── config.ts             URL de la API, origen del socket y reescritura de URL de imágenes
    ├── api/
    │   ├── client.ts         instancia de createApiClient enlazada al almacén de tokens
    │   ├── keys.ts           claves de caché de TanStack Query
    │   ├── queryClient.ts    QueryClient, foco por AppState y caché persistente (RNF-12)
    │   ├── socket.tsx        Socket.IO: message:new, message:read, typing, notification:new
    │   └── hooks/            hooks por dominio: auth, me, artworks, discovery, users, calls, messaging, uploads
    ├── store/                Zustand: sesión (tokens en SecureStore / localStorage), filtros de Explorar,
    │                         convocatorias guardadas (AsyncStorage)
    ├── navigation/           pila raíz (acceso / onboarding / app), pestañas con TabBar propia,
    │                         modales (Filtros, Publicar), enlaces profundos y enlaces de avisos
    ├── screens/              auth, feed, explore, artwork, profile, calls, network, messages, notifications, me
    ├── components/           sistema de diseño: Txt/Headline/HandNote, Button/IconButton/HandLink, Chip/Tag/
    │                         ToggleRow/Segmented, CutoutCard/Polaroid, Blob/Leaf/Tape, Avatar, ArtworkImage,
    │                         StatusChip/MatchBadge/MatchBox/ProgressBar, Loading/Empty/ErrorState, TextField,
    │                         CityPicker, Sheet/ConfirmSheet, Slider, Toast, ReportSheet…
    ├── theme/                tokens «Recortes» (@portfolio/tokens) + sombras, giros y formas orgánicas
    ├── i18n/                 es.ts (todos los textos) + etiquetas de catálogos compartidos
    └── utils/                fechas y cifras en es-ES, ciudades con coordenadas, compresión y subida de
                              imágenes y PDF, almacenamiento, errores, push
```

Decisiones principales:

- **React Navigation directamente** (pila nativa + pestañas), como fija la especificación; no se usa Expo Router.
- **TanStack Query** para todo el estado del servidor; las acciones rápidas (me gusta, guardar, ajustes, seguir)
  son **optimistas** y se revierten si la API falla. Una misma obra se actualiza en todas las cachés a la vez.
- **Zustand** solo para estado de cliente (sesión, filtros, convocatorias guardadas, «escribiendo…», avisos).
- **react-hook-form + Zod** con los esquemas compartidos de `@portfolio/schemas` (registro, acceso, recuperar
  contraseña, solicitud, publicar obra, editar perfil). Los errores de validación de la API se muestran en su campo.
- Confirmaciones con hoja propia (`ConfirmSheet`), porque `Alert.alert` no existe en la web.
- **Accesibilidad (RNF-07)**: todos los elementos táctiles tienen rol y etiqueta, mínimo 44 × 44 pt (o `hitSlop`),
  las imágenes de obra se anuncian con su título, los interruptores son `switch`, los selectores `radio`/`tab`,
  los gráficos tienen descripción textual, se respeta el tamaño de letra del sistema y los colores salen de los
  tokens con contraste AA.
- **Sin conexión (RNF-12)**: el perfil propio, el cuaderno, las series y las solicitudes se guardan en AsyncStorage y
  se muestran sin red; los borradores de obra y de solicitud se autoguardan en el móvil.
- **Imágenes (RNF-02, RNF-13)**: compresión en el cliente (lado mayor ≤ 2000 px, JPEG 82 %) antes de subir; carga
  progresiva con el color dominante y la miniatura como marcador; nunca se pide el original.

---

## Pantallas y requisitos

| Nº | Pantalla (maqueta) | Archivo | Requisitos |
|----|--------------------|---------|------------|
| 01 | Bienvenida (`splash`) | `screens/auth/SplashScreen.tsx` | RF-01 |
| 02 | Registro / acceso (`registro`) + recuperar contraseña | `screens/auth/AuthScreen.tsx`, `ForgotPasswordScreen.tsx` | RF-01, RF-02 |
| 03 | Elegir perfil (`rol`) | `screens/auth/RoleScreen.tsx` | RF-03 |
| 04 | Tu obra (`onboarding`): técnicas, temas, ciudad, disponibilidad | `screens/auth/OnboardingScreen.tsx` | RF-04 |
| 05 | Inicio (`feed`): muro infinito, me gusta, comentarios, guardar, convocatorias, sugerencias | `screens/feed/FeedScreen.tsx`, `artwork/CommentsScreen.tsx` | RF-17, RF-18, RF-15 |
| 06 | Explorar (`explorar`): búsqueda, obras / artistas / galerías | `screens/explore/ExploreScreen.tsx` | RF-19 |
| 07 | Filtros (`filtros`): técnica, formato, km, disponibilidad, contador en directo | `screens/explore/FiltersScreen.tsx` | RF-20 |
| 08 | Detalle de obra (`obra`): serie «n de N», ficha, sala virtual, contactar | `screens/artwork/ArtworkScreen.tsx` | RF-09, RF-10, RF-18, RF-35 |
| 09 | Perfil de artista (`perfil`): conectar, mensaje, seguir, validar técnicas, trayectoria, series, cuaderno | `screens/profile/ProfileScreen.tsx` | RF-06, RF-13, RF-14, RF-16 |
| 10 | Perfil de galería (`galeria`): convocatorias, exposición actual, artistas | `screens/profile/ProfileScreen.tsx` (variante organización) | RF-11, RF-14 |
| 11 | Exposición virtual (`expo`): deslizar por la serie, cartela, preguntar por la obra | `screens/artwork/ExhibitionScreen.tsx` | RF-21 |
| 12 | Convocatorias (`oportunidades`): ordenadas por encaje, «encaja con tu obra», filtros, guardadas | `screens/calls/CallsScreen.tsx` | RF-22 |
| 13 | Detalle de convocatoria (`convocatoria`) | `screens/calls/CallDetailScreen.tsx` | RF-23 |
| 14 | Enviar solicitud (`solicitud`): hasta N obras, carta ≤ 300 palabras, PDF, borrador, confirmación | `screens/calls/ApplyScreen.tsx` | RF-24, RF-25 |
| 15 | Mis solicitudes (`solicitudes`): todas / en curso / resueltas, progreso, historial, notas, retirar | `screens/calls/ApplicationsScreen.tsx` | RF-25, RF-28 |
| 16 | Mi red (`red`): aceptar / ignorar, sugerencias, conexiones | `screens/network/NetworkScreen.tsx` | RF-13, RF-15 |
| 17 | Bandeja (`bandeja`): no leídos y búsqueda | `screens/messages/InboxScreen.tsx` | RF-29 |
| 18 | Conversación (`mensajes`): tiempo real, «escribiendo…», adjuntar obra, respuestas rápidas, visto | `screens/messages/ChatScreen.tsx` | RF-30 |
| 19 | Avisos (`notificaciones`): hoy / esta semana / antes, enlazados a su destino | `screens/notifications/NotificationsScreen.tsx` | RF-31 |
| 20 | Mi perfil (`miperfil`): % completado, red, solicitudes, mensajes, visitas, cuaderno y borradores | `screens/me/MyProfileScreen.tsx`, `SavedScreen.tsx` | RF-07, RF-18 |
| 21 | Editar perfil (`editar`): foto, datos, ciudad, biografía, técnicas, disponibilidad, trayectoria | `screens/me/EditProfileScreen.tsx` | RF-07 |
| 22 | Estadísticas (`estadisticas`): 7/30/90 días, audiencia, obras más vistas | `screens/me/StatsScreen.tsx` | RF-32 |
| 23 | Publicar obra (`publicar`): fotos, ficha, estado, serie, nota, borrador, confirmación; editar/eliminar | `screens/me/PublishScreen.tsx` | RF-08, RF-10 |
| 24 | Ajustes (`ajustes`): avisos, push, privacidad, marca de agua, exportar datos, eliminar cuenta, cerrar sesión | `screens/me/SettingsScreen.tsx` | RF-02, RF-31, RF-33, RF-34 |

Los avisos (y las notificaciones *push*) navegan según su enlace: `call:<id>`, `user:<handle>`, `artwork:<id>`,
`application:<id>`, `conversation:<id>`, `series:<id>`, `exhibition:<id>`, `network` (`src/navigation/links.ts`).

En la web, cada pantalla tiene su URL (p. ej. `/obra/<id>`, `/perfil/luciamontero`, `/convocatoria/<id>`), útil para
depurar; el esquema nativo es `portfolio://`.

### Fuera de alcance o pendiente

- **RF-36** (compraventa) queda fuera de alcance por decisión del proyecto.
- **Acceso con Google / Apple** (parte de RF-01): los botones están, pero obtener el `idToken` necesita
  `expo-auth-session` / `expo-apple-authentication` y credenciales OAuth que no están configuradas; de momento
  muestran un aviso.
- Publicar y revisar convocatorias (RF-26, RF-27) es del panel web de organizaciones (`apps/web`).
