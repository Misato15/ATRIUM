# Informe de avance tecnico - Atrium

## Datos generales

**Proyecto:** Atrium  
**Tipo de proyecto:** Plataforma multimedia para artistas y creativos  
**Estado del desarrollo:** Semana 7  
**Avance estimado del producto final lanzable:** 37%  
**Avance estimado del MVP base:** 63%  

## Objetivo del informe

Presentar el avance tecnico inicial de Atrium, evidenciando el analisis del problema, la planificacion de la solucion, el diseno tecnico, las primeras evidencias de implementacion y la justificacion de las tecnologias seleccionadas.

## 1. Identificacion del problema u oportunidad

Atrium surge como respuesta a la poca visibilidad y centralizacion del trabajo artistico en Honduras. Actualmente, muchos artistas utilizan redes sociales generales como Instagram para mostrar sus obras, pero estas plataformas no estan disenadas especificamente como portafolios profesionales ni como espacios de contratacion o descubrimiento artistico.

El problema principal es que el contenido artistico suele quedar disperso, mezclado con publicaciones personales o contenido no relacionado. Esto dificulta que un visitante, cliente, reclutador o colaborador pueda encontrar artistas por categoria, revisar sus obras principales, conocer su perfil profesional o contactarlos de forma ordenada.

Aunque existen plataformas internacionales como Behance, estas suelen estar mas orientadas a portafolios visuales o digitales y no necesariamente responden a un ecosistema artistico local o multidisciplinario. Atrium busca cubrir esta oportunidad mediante una plataforma especializada donde artistas puedan crear una presencia profesional, publicar obras multimedia y ser descubiertos por otras personas interesadas en talento creativo.

## 2. Analisis y definicion de requerimientos

### Requerimientos funcionales implementados

Hasta el avance actual, Atrium ya cuenta con las siguientes funcionalidades:

- Registro de usuarios artistas.
- Inicio de sesion mediante correo y contrasena.
- Autenticacion con JWT.
- Dashboard privado para el artista.
- Edicion del perfil publico del artista.
- Subida de foto de perfil y portada usando Cloudinary.
- Publicacion de obras con imagenes reales.
- Home con listado de artistas y obras.
- Filtro por categorias artisticas.
- Pagina publica individual para cada artista.
- Pagina de detalle para cada obra.
- Conteo de vistas por obra.
- Sistema de me gusta limitado por usuario.
- Dashboard con metricas basicas del portafolio.
- Vista previa del perfil publico desde el dashboard.
- Creacion de obra mediante ventana emergente.

### Requerimientos funcionales pendientes

Para completar el MVP y acercarlo a una plataforma mas robusta, quedan pendientes:

- Solicitudes de comision tipo marketplace.
- Eventos promocionados por artistas.
- Seguimiento de artistas.
- Edicion y eliminacion de obras.
- Busqueda avanzada por categoria, ubicacion, nombre y tipo de obra.
- Integracion de IA ligera para asistencia de busqueda o categorizacion.
- Chat o mensajeria basica.
- Suscripciones o soporte a artistas como modulo futuro.

### Requerimientos no funcionales considerados

- Seguridad mediante contrasenas hasheadas con bcrypt.
- Rutas privadas protegidas con JWT.
- Separacion entre frontend, backend, base de datos y almacenamiento de imagenes.
- Uso de Cloudinary para evitar guardar imagenes pesadas en la base de datos.
- Arquitectura modular en backend.
- Uso de variables de entorno para credenciales sensibles.
- Documentacion tecnica para explicar decisiones y estructura.

## 3. Diseno tecnico de la solucion

### Arquitectura general

Atrium esta organizado como un monorepo:

```text
atrium/
  backend/
  frontend/
  docs/
```

Esta organizacion facilita el desarrollo durante el proyecto de graduacion, ya que permite mantener frontend, backend y documentacion en un mismo espacio de trabajo.

### Componentes principales

```text
Usuario
  -> Frontend React + Tailwind CSS
  -> Backend NestJS
  -> Prisma ORM
  -> MySQL
  -> Cloudinary
```

El frontend consume la API del backend mediante peticiones HTTP. El backend procesa la logica de negocio, valida autenticacion, consulta la base de datos con Prisma y se comunica con Cloudinary para la subida de imagenes.

### Flujo de autenticacion

```text
1. El usuario ingresa correo y contrasena.
2. React envia la solicitud a POST /auth/login.
3. NestJS valida las credenciales.
4. bcrypt compara la contrasena ingresada con el hash guardado.
5. Si es valida, el backend genera un JWT.
6. El frontend guarda el token.
7. Las rutas protegidas usan Authorization: Bearer token.
```

### Flujo de subida de imagenes

```text
1. El artista selecciona una imagen en el dashboard.
2. React crea un FormData con el archivo.
3. El frontend envia el archivo a POST /uploads/image.
4. El backend valida el JWT.
5. El backend sube la imagen a Cloudinary.
6. Cloudinary devuelve una URL segura.
7. El backend retorna la URL al frontend.
8. La URL se guarda en MySQL mediante Prisma.
```

### Modelo de datos principal

Los modelos implementados actualmente son:

- `User`
- `ArtistProfile`
- `ArtistCategory`
- `PortfolioItem`
- `PortfolioLike`

`User` representa la cuenta privada del sistema.  
`ArtistProfile` representa el perfil publico del artista.  
`ArtistCategory` controla categorias artisticas para mejorar filtros.  
`PortfolioItem` representa cada obra publicada.  
`PortfolioLike` registra los me gusta y evita duplicados por usuario.

La separacion entre `User` y `ArtistProfile` permite mantener datos privados de autenticacion separados de la identidad publica del artista. Tambien permite que en el futuro existan usuarios que no sean artistas, como clientes, reclutadores o administradores.

## 4. Evidencia de desarrollo o avance realizado

El avance actual demuestra que Atrium ya cuenta con un flujo funcional para artistas:

```text
registrarse -> iniciar sesion -> editar perfil -> subir imagenes -> publicar obras -> ver perfil publico -> interactuar con obras
```

### Evidencias disponibles

Se pueden demostrar las siguientes pantallas o flujos:

- Pantalla principal con artistas y obras.
- Registro e inicio de sesion.
- Dashboard privado del artista.
- Vista previa del perfil publico.
- Subida de foto de perfil y portada.
- Creacion de obra desde ventana emergente.
- Perfil publico con portada, avatar y portafolio.
- Detalle de obra con imagen grande, vistas y me gusta.
- Metricas del portafolio dentro del dashboard.
- Respuesta del endpoint de Cloudinary con URL y metadata.
- Base de datos MySQL con tablas relacionadas.

### Endpoints principales implementados

```text
POST /auth/register
POST /auth/login
GET /auth/me
GET /artists
GET /artists/:id
PATCH /artists/me
GET /artists/me/metrics
GET /artist-categories
GET /portfolio
GET /portfolio/:id
POST /portfolio
POST /portfolio/:id/view
GET /portfolio/:id/like-status
POST /portfolio/:id/like
POST /uploads/image
```

## 5. Justificacion tecnica de la propuesta

### React + Tailwind CSS

React fue elegido porque permite construir una interfaz modular basada en componentes reutilizables. Tailwind CSS permite crear una interfaz consistente sin depender de muchas hojas CSS separadas, acelerando el desarrollo visual.

### NestJS

NestJS fue elegido porque permite organizar el backend mediante modulos, controladores y servicios. Esto ayuda a mantener una arquitectura clara y defendible tecnicamente.

### MySQL

MySQL fue elegido porque Atrium tiene entidades con relaciones claras: usuarios, perfiles, categorias, obras y likes. Una base de datos relacional se adapta bien a este tipo de estructura.

### Prisma ORM

Prisma permite definir modelos, generar migraciones y realizar consultas tipadas sin escribir SQL manual en cada operacion. Esto mejora la productividad y reduce errores en el acceso a datos.

### Cloudinary

Cloudinary fue elegido para almacenar imagenes fuera del servidor y de la base de datos. MySQL guarda solamente las URLs, mientras Cloudinary se encarga del archivo pesado y de entregar imagenes optimizadas.

### JWT y bcrypt

JWT permite proteger rutas privadas sin mantener sesiones tradicionales en el servidor. bcrypt protege las contrasenas mediante hashing, evitando guardarlas en texto plano.

## 6. Calidad de la presentacion tecnica

Para la presentacion se explicara el proyecto en el siguiente orden:

1. Problema y oportunidad.
2. Vision de Atrium como plataforma para artistas.
3. Arquitectura general.
4. Modelo de datos.
5. Flujo de autenticacion.
6. Flujo de subida de imagenes.
7. Demostracion del dashboard.
8. Demostracion del perfil publico y portafolio.
9. Metricas e interacciones.
10. Pendientes y plan de trabajo.

Este orden permite mostrar primero la necesidad del proyecto, luego la solucion tecnica y finalmente la evidencia funcional.

## 7. Estado actual y porcentaje de avance

### MVP base

El MVP base se encuentra aproximadamente en **63%**.

Este porcentaje considera que ya existen autenticacion, perfil, portafolio, subida de imagenes, vistas, likes y dashboard con metricas.

### Producto final lanzable

El producto final lanzable se encuentra aproximadamente en **37%**.

Este porcentaje considera una vision mas amplia que incluye comisiones, eventos, seguimiento, chat, IA, suscripciones, escalabilidad, seguridad avanzada, DevOps y pulido completo.

## 8. Plan de trabajo restante

### Semana 8

- Implementar solicitudes de comision.
- Agregar edicion y eliminacion de obras.
- Mejorar validaciones del backend.
- Mejorar dashboard de artista.
- Documentar pruebas manuales.

### Semana 9

- Implementar eventos de artistas.
- Agregar seguimiento de artistas.
- Mejorar busqueda y filtros.
- Agregar una primera version de IA ligera para descubrimiento o categorias.
- Pulir perfil publico.

### Semana 10

- Pulido visual responsive.
- Correccion de errores.
- Preparacion de demo final.
- Documentacion final.
- Pruebas de flujo completo.
- Preparacion para defensa tecnica.

## 9. Riesgos identificados

- El alcance del producto crecio hacia una plataforma tipo marketplace creativo, por lo que se debe priorizar cuidadosamente.
- Funcionalidades como pagos, chat en tiempo real y suscripciones reales requieren mas tiempo y seguridad.
- Se deben mejorar validaciones para archivos, formularios y datos de entrada.
- La base de datos actualmente es local; para lanzamiento se necesitara migrar a una base gestionada o servidor de produccion.
- Se debe fortalecer la estrategia DevOps para despliegue, backups, monitoreo y seguridad.

## 10. Conclusion

Atrium ya cuenta con una base tecnica funcional que permite a un artista registrarse, iniciar sesion, editar su perfil, subir imagenes reales, publicar obras, visualizar su portafolio y recibir interacciones mediante vistas y me gusta. Ademas, el dashboard ya muestra metricas basicas que aportan valor profesional al artista.

El proyecto todavia no esta listo para lanzamiento, pero la arquitectura actual permite continuar agregando funcionalidades de forma ordenada. Las siguientes etapas se enfocaran en convertir Atrium en una plataforma mas completa, incorporando solicitudes de comision, eventos, seguimiento, busqueda avanzada, IA ligera y mejoras de seguridad y despliegue.

## Resumen oral breve

Atrium es una plataforma multimedia para artistas y creativos que busca centralizar la visibilidad del talento artistico. Actualmente permite registro, login, perfil publico, portafolio, subida de imagenes, vistas, likes y metricas. La arquitectura usa React, Tailwind, NestJS, Prisma, MySQL y Cloudinary. El avance actual representa un 63% del MVP base y un 37% del producto final lanzable. En las siguientes semanas se implementaran comisiones, eventos, seguimiento, busqueda avanzada y mejoras de seguridad para acercar el proyecto a una version lista para presentacion final.
