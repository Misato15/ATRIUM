# Explicacion General del Proyecto Atrium

## 1. Que es Atrium

Atrium es una plataforma multimedia para artistas y creativos. La idea principal es que un artista pueda crear un perfil publico, mostrar obras de portafolio, promocionar eventos, recibir solicitudes de comision y permitir interacciones como likes y vistas.

El proyecto se esta construyendo paso a paso para evitar crear muchas funciones sin entender la arquitectura. Primero se creo una base full-stack funcional:

```txt
MySQL
  -> Prisma
  -> NestJS
  -> React
```

Esto significa que los datos reales se guardan en la base de datos, el backend los consulta, y el frontend los muestra al usuario.

## 2. Objetivo del MVP

El MVP no busca tener toda la plataforma final terminada. El objetivo es tener una version casi funcional que demuestre el flujo principal:

- visitantes pueden ver artistas
- visitantes pueden abrir la pagina publica de un artista
- visitantes pueden ver obras del portafolio
- artistas pueden registrarse e iniciar sesion
- el backend puede proteger rutas privadas con JWT
- mas adelante, artistas podran administrar su perfil, portafolio y eventos desde un dashboard

## 3. Por que usamos esta estructura

El proyecto esta organizado como monorepo:

```txt
atrium/
  frontend/
  backend/
  docs/
```

Un monorepo significa que frontend, backend y documentacion viven en un solo repositorio. Esto es conveniente para un proyecto de graduacion porque:

- facilita presentar todo el sistema en un solo lugar
- mantiene el frontend y backend relacionados, pero separados
- simplifica la entrega del proyecto
- permite documentar arquitectura y decisiones junto al codigo

El backend se esta trabajando como monolito modular. Esto significa que existe una sola aplicacion backend de NestJS, pero organizada por modulos:

```txt
auth
artists
portfolio
prisma
```

Esta decision evita la complejidad de microservicios. Para Atrium, microservicios serian innecesarios en esta etapa porque agregarian mas infraestructura, comunicacion entre servicios y despliegue complejo sin aportar suficiente valor al MVP.

## 4. Por que se eligieron estas tecnologias

### React

React se eligio para el frontend porque permite construir interfaces usando componentes reutilizables. En Atrium esto es util porque muchos elementos se repiten:

- tarjetas de artistas
- tarjetas de portafolio
- botones
- paginas publicas
- futuras paginas privadas del dashboard

React tambien facilita manejar datos que vienen del backend usando `useState` y `useEffect`.

### Tailwind CSS

Tailwind CSS se usa para estilizar rapidamente sin crear muchos archivos CSS separados. Permite escribir clases directamente en JSX, por ejemplo:

```jsx
className="rounded-lg border border-zinc-800 bg-zinc-900"
```

Esto ayuda a avanzar rapido en el MVP manteniendo un estilo visual consistente.

### Vite

Vite se usa como herramienta de desarrollo para React. Es rapido, simple y adecuado para proyectos modernos. Permite correr el frontend localmente con:

```powershell
pnpm.cmd dev
```

### NestJS

NestJS se eligio para el backend porque da una arquitectura clara basada en:

- modules
- controllers
- services
- guards
- strategies

Esto es bueno para un proyecto de graduacion porque el codigo queda organizado y es facil explicar responsabilidades.

### MySQL

MySQL se eligio como base de datos relacional porque Atrium tiene relaciones claras entre entidades:

```txt
User
ArtistProfile
PortfolioItem
```

Por ejemplo, un `User` tiene un `ArtistProfile`, y un `ArtistProfile` tiene muchos `PortfolioItems`.

### Prisma

Prisma se usa como ORM. Su funcion es conectar el backend con MySQL usando TypeScript en lugar de escribir SQL manual para cada operacion.

Ejemplo conceptual:

```ts
this.prisma.artistProfile.findMany()
```

Esto es mas limpio que escribir consultas SQL manuales en cada servicio.

Prisma tambien permite:

- definir modelos en `schema.prisma`
- crear migraciones
- generar un cliente TypeScript para consultas
- trabajar con relaciones de forma mas segura

### pnpm

pnpm se usa como package manager porque es rapido y funciona bien en proyectos con varias partes, como este monorepo con `frontend` y `backend`.

### bcrypt

bcrypt se usa para hashear passwords. Esto es importante porque los passwords nunca deben guardarse como texto plano en la base de datos.

### JWT

JWT se usa para autenticacion. Cuando un usuario inicia sesion, el backend genera un token. Ese token se puede enviar en rutas privadas para demostrar que el usuario esta autenticado.

## 5. Documentos creados y proposito

### `docs/database-plan.md`

Este documento explica el diseno de la base de datos. Contiene:

- modelos principales
- campos de cada modelo
- relaciones entre modelos
- modelos futuros como `Event`, `CommissionRequest`, `Like` y `View`

Sirve para justificar la estructura de datos antes y durante la implementacion.

### `docs/auth-plan.md`

Este documento explica el plan de autenticacion. Contiene:

- que partes son publicas
- que partes requieren login
- flujo de registro
- flujo de login
- endpoints planeados
- progreso implementado
- limitaciones actuales

Sirve para explicar como se manejaran usuarios, login y rutas privadas.

### `docs/week-5-progress.md`

Este documento resume el progreso de la semana 5. Contiene:

- estructura del proyecto
- progreso del frontend
- progreso del backend
- progreso de base de datos
- flujo de datos actual
- diagrama de arquitectura
- checklist para la presentacion
- siguientes pasos del MVP

Sirve como documento de presentacion y evidencia del avance.

### `docs/project-explanation.md`

Este documento es una explicacion general del proyecto. Resume las decisiones tecnicas, la arquitectura y el proposito de los archivos principales.

Sirve para estudiar, defender decisiones y explicar el sistema completo.

## 6. Base de datos actual

La base de datos actual se llama:

```txt
atrium_db
```

Los modelos actuales son:

```txt
User
ArtistProfile
PortfolioItem
```

### User

Representa una cuenta registrada. Tiene campos como:

- email
- passwordHash
- role

Este modelo no representa directamente el perfil publico. Representa la identidad del usuario y su informacion de autenticacion.

### ArtistProfile

Representa el perfil publico del artista. Tiene campos como:

- displayName
- bio
- category
- location
- profileImageUrl

Se separo de `User` porque no toda la informacion de una cuenta debe ser publica. Ademas, en el futuro pueden existir usuarios con diferentes roles.

Relacion actual:

```txt
User -> ArtistProfile
```

### PortfolioItem

Representa una obra publicada por un artista. Tiene campos como:

- title
- description
- mediaType
- mediaUrl
- thumbnailUrl

Relacion actual:

```txt
ArtistProfile -> PortfolioItem
```

Esto permite que un artista tenga muchas obras en su portafolio.

## 7. Backend: como esta organizado

### `backend/src/main.ts`

Este archivo inicia la aplicacion NestJS.

Responsabilidades principales:

- crear la app con `NestFactory`
- habilitar CORS para que React pueda llamar al backend
- escuchar en el puerto `3000`

CORS es necesario porque el frontend corre en:

```txt
http://localhost:5173
```

y el backend corre en:

```txt
http://localhost:3000
```

Sin CORS, el navegador bloquearia las solicitudes entre diferentes puertos.

### `backend/src/app.module.ts`

Este es el modulo raiz del backend. Registra los modulos principales:

```txt
ArtistsModule
PortfolioModule
AuthModule
```

Si un modulo no esta importado aqui, sus rutas no quedan disponibles en la aplicacion.

### `backend/src/app.controller.ts` y `backend/src/app.service.ts`

Estos archivos manejan la ruta basica:

```txt
GET /
```

Actualmente devuelve un mensaje de salud de la API:

```txt
La API de Atrium esta funcionando!
```

Sirve para verificar rapidamente que el backend esta encendido.

## 8. Prisma en el backend

### `backend/prisma/schema.prisma`

Este archivo define los modelos de base de datos:

```txt
User
ArtistProfile
PortfolioItem
```

Tambien define enums:

```txt
UserRole
MediaType
```

Cada vez que se cambia este archivo, se debe crear una migracion o regenerar el cliente Prisma segun el caso.

Comandos importantes:

```powershell
pnpm.cmd prisma format
pnpm.cmd prisma migrate dev --name nombre_de_migracion
pnpm.cmd prisma generate
```

### `backend/src/prisma/prisma.module.ts`

Este modulo registra y exporta `PrismaService`.

Esto permite que otros modulos, como `artists`, `portfolio` y `auth`, puedan usar Prisma sin crear conexiones nuevas en cada archivo.

### `backend/src/prisma/prisma.service.ts`

Este servicio crea el cliente Prisma que se conecta a MySQL.

Responsabilidades:

- leer `DATABASE_URL` desde `.env`
- configurar la conexion a MySQL
- crear el adapter de Prisma
- conectar Prisma cuando inicia el modulo

Este archivo centraliza el acceso a la base de datos. Por eso otros servicios usan:

```ts
constructor(private readonly prisma: PrismaService) {}
```

## 9. Modulo artists

### `backend/src/artists/artists.module.ts`

Agrupa el controlador y servicio de artistas. Tambien importa `PrismaModule` para permitir consultas a la base de datos.

### `backend/src/artists/artists.controller.ts`

Define las rutas publicas de artistas:

```txt
GET /artists
GET /artists/:id
```

El controller no debe tener mucha logica. Su trabajo es recibir la solicitud y llamar al service.

### `backend/src/artists/artists.service.ts`

Contiene la logica de consulta de artistas.

`findAll()`:

- consulta todos los perfiles de artistas
- los ordena por `createdAt`

`findOne(id)`:

- busca un artista por `id`
- incluye sus `portfolioItems`
- si no existe, lanza `NotFoundException`

Esto permite que:

```txt
GET /artists/1
```

devuelva un artista especifico con su portafolio.

## 10. Modulo portfolio

### `backend/src/portfolio/portfolio.module.ts`

Agrupa el controlador y servicio de portafolio. Importa `PrismaModule`.

### `backend/src/portfolio/portfolio.controller.ts`

Define la ruta:

```txt
GET /portfolio
```

### `backend/src/portfolio/portfolio.service.ts`

Consulta todos los `PortfolioItems`.

Usa:

```ts
include: {
  artistProfile: true,
}
```

Esto es importante porque el frontend necesita mostrar la obra junto al nombre del artista.

## 11. Modulo auth

### `backend/src/auth/auth.module.ts`

Registra:

- `AuthController`
- `AuthService`
- `JwtStrategy`
- `JwtModule`
- `PrismaModule`

Este modulo contiene la logica de autenticacion.

### `backend/src/auth/dto/register.dto.ts`

Define la forma de los datos que se reciben al registrar un usuario:

```txt
email
password
displayName
category
location
```

DTO significa Data Transfer Object. Sirve para describir la informacion que entra a un endpoint.

### `backend/src/auth/dto/login.dto.ts`

Define la forma de los datos que se reciben al iniciar sesion:

```txt
email
password
```

### `backend/src/auth/auth.controller.ts`

Define las rutas:

```txt
POST /auth/register
POST /auth/login
GET /auth/me
```

`POST /auth/register` crea una cuenta.

`POST /auth/login` verifica credenciales y devuelve un token.

`GET /auth/me` usa JWT para devolver el usuario autenticado actual.

### `backend/src/auth/auth.service.ts`

Contiene la logica principal de auth.

`register(registerDto)`:

- revisa si el email ya existe
- hashea el password con bcrypt
- crea un User
- crea un ArtistProfile conectado al User
- devuelve datos seguros sin `passwordHash`

`login(loginDto)`:

- busca el usuario por email
- compara el password con `bcrypt.compare`
- si es valido, crea un JWT
- devuelve `accessToken` y datos seguros del usuario

### `backend/src/auth/jwt.strategy.ts`

Define como se valida un JWT.

Lee el token desde:

```txt
Authorization: Bearer TOKEN
```

Si el token es valido, devuelve datos como:

```txt
userId
email
role
```

### `backend/src/auth/jwt-auth.guard.ts`

Protege rutas privadas usando la estrategia JWT.

Se usa asi:

```ts
@UseGuards(JwtAuthGuard)
```

Actualmente protege:

```txt
GET /auth/me
```

## 12. Frontend: como esta organizado

### `frontend/src/main.jsx`

Es el punto de entrada del frontend. Renderiza `App` dentro del elemento `root` del HTML.

### `frontend/src/App.jsx`

Configura las rutas del frontend con `react-router-dom`:

```txt
/             -> HomePage
/artists/:id  -> ArtistDetailPage
```

### `frontend/src/pages/HomePage.jsx`

Es la pagina de inicio.

Responsabilidades:

- cargar artistas desde `GET /artists`
- cargar portafolio desde `GET /portfolio`
- manejar estado de carga
- manejar errores
- renderizar `ArtistCard`
- renderizar `PortfolioItemCard`

Usa:

```txt
useState
useEffect
fetch
```

### `frontend/src/pages/ArtistDetailPage.jsx`

Es la pagina publica de un artista especifico.

Responsabilidades:

- leer el `id` de la URL con `useParams`
- llamar a `GET /artists/:id`
- mostrar informacion del artista
- mostrar obras del portafolio de ese artista
- mostrar una pantalla de error si el artista no existe

### `frontend/src/components/Button.jsx`

Componente reutilizable para botones.

Permite variantes:

```txt
primary
secondary
```

Esto evita repetir clases de Tailwind en cada boton.

### `frontend/src/components/ArtistCard.jsx`

Muestra una tarjeta de artista.

Tambien usa `Link` para navegar a:

```txt
/artists/:id
```

Esto permite abrir la pagina publica de cada artista.

### `frontend/src/components/PortfolioItemCard.jsx`

Muestra una obra de portafolio.

Recibe:

- title
- description
- mediaType
- thumbnailUrl
- artistName

No consulta datos directamente. Solo renderiza la informacion que recibe por props.

## 13. Flujo actual del sistema

### Flujo de artistas

```txt
React HomePage
  -> fetch http://localhost:3000/artists
  -> ArtistsController
  -> ArtistsService
  -> PrismaService
  -> MySQL ArtistProfile
  -> JSON
  -> ArtistCard
```

### Flujo de detalle de artista

```txt
React ArtistDetailPage
  -> fetch http://localhost:3000/artists/:id
  -> ArtistsController
  -> ArtistsService.findOne
  -> Prisma incluye portfolioItems
  -> JSON
  -> pagina publica del artista
```

### Flujo de portafolio

```txt
React HomePage
  -> fetch http://localhost:3000/portfolio
  -> PortfolioController
  -> PortfolioService
  -> Prisma incluye artistProfile
  -> JSON
  -> PortfolioItemCard
```

### Flujo de registro

```txt
POST /auth/register
  -> AuthController
  -> AuthService.register
  -> revisar email duplicado
  -> bcrypt.hash
  -> crear User
  -> crear ArtistProfile
  -> respuesta sin passwordHash
```

### Flujo de login

```txt
POST /auth/login
  -> AuthController
  -> AuthService.login
  -> buscar User por email
  -> bcrypt.compare
  -> JwtService.signAsync
  -> devolver accessToken
```

### Flujo de usuario autenticado

```txt
GET /auth/me
  -> JwtAuthGuard
  -> JwtStrategy
  -> validar token
  -> request.user
  -> respuesta con userId, email y role
```

## 14. Pruebas y verificacion

Comandos de backend:

```powershell
cd backend
pnpm.cmd build
pnpm.cmd exec jest --runInBand
```

Comando de frontend:

```powershell
cd frontend
pnpm.cmd build
```

Rutas manuales importantes:

```txt
http://localhost:3000/
http://localhost:3000/artists
http://localhost:3000/artists/1
http://localhost:3000/portfolio
http://localhost:5173/
http://localhost:5173/artists/1
http://localhost:5173/artists/999
```

## 15. Estado actual

Ya esta implementado:

- estructura monorepo
- frontend React con Tailwind
- rutas frontend con React Router
- pagina de inicio
- pagina publica de artista
- backend NestJS modular
- conexion MySQL con Prisma
- modelos User, ArtistProfile y PortfolioItem
- endpoints de artistas
- endpoints de portafolio
- registro de usuario
- login con JWT
- ruta protegida `GET /auth/me`
- documentacion del avance

## 16. Limitaciones actuales

Todavia falta:

- paginas frontend de login y register
- dashboard privado del artista
- formulario para crear PortfolioItem
- edicion de perfil
- eventos
- solicitudes de comision
- likes y vistas
- integracion con Cloudinary
- embeds mas pulidos para YouTube, Vimeo, Spotify y SoundCloud

## 17. Siguientes pasos recomendados

El siguiente paso logico es conectar la autenticacion al frontend:

```txt
/register
/login
/dashboard
```

Despues de eso, se debe crear un dashboard donde el artista pueda administrar su perfil y portafolio.

El orden recomendado es:

1. Crear pagina `/register`.
2. Crear pagina `/login`.
3. Guardar el JWT en el frontend.
4. Crear pagina `/dashboard`.
5. Proteger el dashboard.
6. Crear formulario para agregar PortfolioItem.
7. Crear modulo de eventos.
8. Crear modulo de CommissionRequest.
