# Plan de Autenticación de Atrium

## Objetivo

Atrium necesita autenticación para que los artistas puedan administrar su contenido privado, mientras los visitantes públicos pueden seguir explorando perfiles de artistas y elementos de portafolio.

## Acceso público

Los visitantes no necesitan iniciar sesión para:
- ver la página de inicio
- explorar artistas
- abrir páginas de detalle de artistas
- ver elementos de portafolio
- ver eventos públicos
- enviar solicitudes de comisión

## Acceso privado

Los artistas deben iniciar sesión para:
- editar su perfil de artista
- crear elementos de portafolio
- editar elementos de portafolio
- eliminar elementos de portafolio
- crear eventos
- editar eventos
- ver las solicitudes de comisión enviadas a ellos

## Flujo de Auth para el MVP

1. El usuario se registra con email y password.
2. El backend hashea el password antes de guardarlo.
3. El backend crea un registro User.
4. El backend crea o permite crear un ArtistProfile.
5. El usuario inicia sesión con email y password.
6. El backend verifica el password.
7. El backend devuelve un JWT access token.
8. El frontend guarda el token temporalmente.
9. El frontend envía el token cuando accede a rutas privadas del dashboard.

## Endpoints backend planeados

```txt
POST /auth/register
POST /auth/login
GET /auth/me
```

## Páginas frontend planeadas

```txt
/register
/login
/dashboard
```

## Notas de seguridad

- Los passwords nunca deben guardarse como texto plano.
- Los passwords se hashearán usando bcrypt.
- Los JWT tokens se usarán para proteger rutas privadas del backend.
- Las páginas públicas no deben requerir login.
- Las rutas privadas del dashboard deben requerir un usuario autenticado.

## Progreso de Auth implementado

Endpoints backend completados:
- POST /auth/register
- POST /auth/login
- GET /auth/me

Comportamiento de auth implementado en el backend:
- Los passwords se hashean con bcrypt antes de guardarse.
- Los emails duplicados en registro devuelven un error.
- El login verifica el password usando bcrypt.
- El login devuelve un JWT access token.
- Las rutas protegidas usan un JWT auth guard.
- GET /auth/me devuelve el usuario autenticado actual desde el token.

Limitaciones actuales:
- JWT_SECRET todavía usa un valor de desarrollo si no existe en `.env`.
- Las páginas frontend de login/register todavía no están implementadas.
- Las rutas del dashboard todavía no están protegidas en el frontend.
