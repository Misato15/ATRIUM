# Plan DevOps de Atrium

## Objetivo

Preparar Atrium para ejecutarse en dos ambientes: desarrollo local y producción.

## Ambientes

### Desarrollo local

Frontend:
- URL local: `http://localhost:5173`
- Comando: `pnpm run dev`
- Variable principal: `VITE_API_URL=http://localhost:3000`

Backend:
- URL local: `http://localhost:3000`
- Comando: `pnpm run start:dev`
- Variable principal: `FRONTEND_URL=http://localhost:5173`

Base de datos:
- MySQL local
- Prisma usa `DATABASE_URL`

### Producción

Frontend:
- Se desplegará en Vercel o Netlify.
- Usará `VITE_API_URL` apuntando al backend desplegado.

Backend:
- Se desplegará en Render o Railway.
- Usará `FRONTEND_URL` apuntando al frontend desplegado.
- Usará `DATABASE_URL` apuntando a una base de datos remota.

Base de datos:
- MySQL remota.
- Las migraciones se aplicarán con:

```bash
pnpm run db:migrate:deploy
```

Frontend
```bash
-pnpm run dev
-pnpm run build
```

Backend
```bash
pnpm run start:dev
pnpm run build
pnpm run start:prod
pnpm run db:generate
pnpm run db:migrate:deploy
```
#### Variables de entorno

Frontend 

VITE_API_URL=

Backend 

DATABASE_URL=
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
PORT=
FRONTEND_URL=

## Servicios propuestos para despliegue

### Frontend

Proveedor propuesto: Vercel.

Motivo:
- Buen soporte para proyectos React/Vite.
- Permite configurar variables de entorno.
- Genera una URL pública para la aplicación.

Variable necesaria:
- `VITE_API_URL`

### Backend

Proveedor propuesto: Render.

Motivo:
- Permite ejecutar aplicaciones Node.js/NestJS.
- Permite configurar variables de entorno.
- Soporta comandos de build y start personalizados.

Variables necesarias:
- `DATABASE_URL`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `FRONTEND_URL`
- `PORT`

### Base de datos

Proveedor propuesto: Railway o Aiven.

Motivo:
- Permiten crear una base de datos MySQL remota.
- Entregan una URL de conexión para producción.
- Separan la base de datos de la computadora local del desarrollador.

Variable necesaria:
- `DATABASE_URL`

### Archivos multimedia

Proveedor usado: Cloudinary.

Motivo:
- Evita guardar archivos pesados en la base de datos.
- Optimiza la entrega de imágenes.
- Permite almacenar imágenes de perfil, portada y obras.

### Correo

Proveedor propuesto: Brevo o Gmail App Password para demostración.

Motivo:
- Permite enviar correos de notificación.
- Puede integrarse mediante SMTP.
- No bloquea el funcionamiento del sistema si no está configurado.

## Configuración sugerida en Render

### Build Command

```bash
pnpm install && pnpm run build

pnpm run db:migrate:deploy && pnpm run start:prod


## Configuración sugerida en Vercel

### Framework

Vite.

### Build Command

```bash
pnpm run build
```

VITE_API_URL=https://url-del-backend-en-render


## Checklist antes del despliegue

### Frontend

- [ ] `frontend/.env.example` existe.
- [ ] `VITE_API_URL` está documentada.
- [ ] No hay URLs `localhost` hardcodeadas fuera de `src/config/api.js`.
- [ ] `pnpm run build` funciona.
- [ ] `frontend/.env` está ignorado por Git.

### Backend

- [ ] `backend/.env.example` existe.
- [ ] `FRONTEND_URL` está documentada.
- [ ] `DATABASE_URL` está documentada.
- [ ] `JWT_SECRET` está documentada.
- [ ] Variables de Cloudinary están documentadas.
- [ ] Variables SMTP están documentadas.
- [ ] `pnpm run build` funciona.
- [ ] `pnpm run db:generate` funciona.
- [ ] `pnpm run db:migrate:deploy` está definido.
- [ ] `backend/.env` está ignorado por Git.

### Base de datos

- [ ] Existe una base de datos MySQL remota.
- [ ] Se tiene una `DATABASE_URL` de producción.
- [ ] Las migraciones Prisma están listas.
- [ ] No se usa `prisma migrate dev` en producción.

### Seguridad

- [ ] Ningún archivo `.env` real aparece en `git status`.
- [ ] No se suben secretos a GitHub.
- [ ] `JWT_SECRET` en producción debe ser fuerte.
- [ ] CORS usa `FRONTEND_URL`.
- [ ] Cloudinary usa credenciales desde variables de entorno.

### Pruebas manuales

- [ ] Registro de artista.
- [ ] Login.
- [ ] Edición de perfil.
- [ ] Subida de imagen de perfil.
- [ ] Subida de portada.
- [ ] Creación de obra.
- [ ] Vista de obra.
- [ ] Likes.
- [ ] Notificaciones.
- [ ] Solicitudes de comisión.
- [ ] Gestión de comisión desde dashboard.