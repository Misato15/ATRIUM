# Guia de defensa tecnica de Atrium

## 1. Idea central del proyecto

Atrium es una plataforma multimedia y transaccional para artistas, creativos y clientes.

No es solo una galeria. El sistema combina:

- perfiles publicos de artistas;
- portafolio multimedia;
- solicitudes de comision;
- bolsa de trabajo;
- pagos PayPal;
- entregas protegidas;
- marketplace digital tipo Gumroad;
- reviews;
- notificaciones;
- panel admin;
- auditoria basica.

La idea tecnica que debes defender es esta:

> Atrium separa los modelos por dominio porque cada flujo tiene reglas, permisos y estados diferentes.

Eso significa que no mezclamos una oferta, una comision, un producto digital y una obra de portafolio en una sola tabla generica. Seria menos tablas, pero mas condicionales, mas campos nulos y mas riesgo.

## 2. Respuestas practicadas

### 2.1 Por que `User`, `ArtistProfile`, `CommissionRequest` y `JobPost` son modelos separados?

`User`, `ArtistProfile`, `JobPost` y `CommissionRequest` estan separados porque representan conceptos de negocio distintos y tienen ciclos de vida diferentes.

`User` representa la cuenta privada: email, password, rol, verificacion y suspension. `ArtistProfile` representa la identidad publica del artista: bio, categoria, portada, servicios y portafolio. Separarlos permite que una misma cuenta pueda actuar como cliente, artista, comprador y vendedor sin duplicar usuarios ni bloquear funciones por rol.

`JobPost` representa una oferta abierta donde varios artistas pueden aplicar. Todavia no hay acuerdo, pago ni entrega. `CommissionRequest` representa una comision ya dirigida o formalizada, con propuesta, pago, entrega, revisiones, cancelacion y disputa.

Cuando una aplicacion a una oferta se acepta, recien ahi se crea una `CommissionRequest`.

Si todo estuviera en una sola tabla o flujo, tendriamos muchos campos nulos, estados incompatibles y validaciones confusas. Tambien seria mas dificil controlar permisos, porque publicar una oferta, aplicar, entregar una comision y comprar un producto son acciones distintas.

Frase clave:

> Separar modelos no es sobrecomplicar; es respetar limites reales del dominio.

### 2.2 Flujo desde que un cliente publica una oferta hasta que se convierte en comision

Un cliente crea un `JobPost`. Ese `JobPost` queda con estado `OPEN` y contiene titulo, descripcion, categoria, presupuesto, fecha deseada, modalidad y ubicacion.

Los artistas aplican mediante `JobApplication`. Cada aplicacion pertenece a un `JobPost` y a un `ArtistProfile`. La aplicacion incluye mensaje, precio propuesto, tiempo estimado y links de portafolio. Al inicio queda en estado `PENDING`.

El cliente puede revisar aplicaciones y cambiar estados, por ejemplo `SHORTLISTED` para preseleccionar o `REJECTED` para rechazar. Cuando acepta una aplicacion, esa `JobApplication` pasa a `ACCEPTED`, el `JobPost` pasa a `ASSIGNED`, y el backend crea una `CommissionRequest`.

Desde ahi el trabajo deja de vivir principalmente en la bolsa de trabajo y pasa al flujo de comisiones. La `CommissionRequest` queda vinculada a la aplicacion aceptada y sigue el flujo normal: propuesta/aceptacion, pago pendiente, PayPal, `IN_PROGRESS`, entrega, revision o aprobacion, y finalmente `COMPLETED`.

Modelos principales:

- `JobPost`;
- `JobApplication`;
- `CommissionRequest`;
- `PaymentTransaction`.

### 2.3 Por que aceptar una aplicacion crea una `CommissionRequest` nueva?

Aceptar una aplicacion crea una `CommissionRequest` porque el `JobPost` representa seleccion, no ejecucion.

Mientras es oferta, el sistema necesita manejar varias aplicaciones, preseleccion, rechazo y asignacion. Cuando se elige un artista, el problema cambia: ahora hay una relacion uno a uno entre cliente y artista, con propuesta, pago, entrega, revisiones, cancelacion y disputa.

Si siguieramos usando `JobPost`, ese modelo tendria que cargar estados que no pertenecen a una oferta abierta: `PAYMENT_PENDING`, `IN_PROGRESS`, `DELIVERED`, `COMPLETED`, etc. Eso mezclaria seleccion con ejecucion y llenaria el modelo de campos que solo aplican despues de aceptar a un artista.

Por eso `JobApplication` queda vinculada a la `CommissionRequest`, pero el flujo operativo se mueve a comisiones.

Frase clave:

> `JobPost` selecciona; `CommissionRequest` ejecuta.

### 2.4 Por que existen `PaymentTransaction` y `DigitalProductPurchase` separados?

Usamos `PaymentTransaction` para comisiones y `DigitalProductPurchase` para marketplace porque representan reglas de negocio distintas.

En una comision, el pago esta ligado a un trabajo en proceso. El cliente paga, la comision pasa a `IN_PROGRESS`, el artista entrega, el cliente aprueba o pide cambios, y recien al aprobar se marca `releasedAt`. Por eso `PaymentTransaction` necesita relacion con `CommissionRequest`, estado, proposito como `COMMISSION` o `REVISION_EXTRA`, y liberacion logica.

En marketplace, la compra es inmediata. El cliente paga un producto digital, PayPal captura la orden, la compra pasa a `PAID` y se desbloquea la descarga firmada. No hay entrega, revision, disputa de trabajo ni liberacion posterior dentro del mismo flujo.

Si usaramos una sola tabla `Payment` para todo, terminariamos con muchos campos opcionales y condicionales: algunos pagos tendrian comision, otros producto, unos tendrian `releasedAt`, otros no, unos tendrian assets descargables y otros entrega final.

Frase clave:

> Comision es pago protegido por flujo; marketplace es compra digital directa.

### 2.5 Como se protegen archivos finales y productos digitales?

Los archivos finales de una comision se suben a Cloudinary como archivos privados o autenticados. El artista puede entregar previews con watermark para que el cliente revise sin recibir todavia el archivo final limpio.

El backend no entrega directamente la URL permanente del archivo final. Primero verifica que el usuario tenga permiso sobre esa comision y que la comision este en un estado donde el final ya puede verse, normalmente `COMPLETED` o despues de aprobacion de entrega.

Cuando la comision esta aprobada, el backend genera una URL firmada temporal usando Cloudinary. Esa URL permite descargar el archivo sin exponer una URL publica permanente.

Para productos digitales pasa algo parecido. El asset descargable no se expone publicamente. El backend verifica que exista un `DigitalProductPurchase` pagado (`PAID`) para ese usuario. Si el usuario compro el producto, se genera URL firmada temporal. Si no compro, no se entrega la descarga.

Frase clave:

> No protegemos el archivo escondiendo un link; lo protegemos haciendo que el backend autorice y genere acceso temporal.

### 2.6 Diferencia entre `deliveryPreviewUrl`, `finalFileUrl` y `CommissionAttachment`

`deliveryPreviewUrl` y `finalFileUrl` son campos antiguos del primer flujo de entrega.

`deliveryPreviewUrl` guarda una preview de entrega, normalmente con watermark.

`finalFileUrl` guarda el archivo final heredado del flujo inicial.

`CommissionAttachment` es el modelo nuevo y mas flexible. Permite multiples archivos por comision con tipo:

- `CLIENT_REFERENCE`;
- `ARTIST_PREVIEW`;
- `ARTIST_FINAL`;
- `DISPUTE_EVIDENCE`.

Tambien guarda metadata como URL, `publicId`, MIME, tamano, nombre y tipo de recurso.

Mantenemos `deliveryPreviewUrl` y `finalFileUrl` por compatibilidad. Si ya hay comisiones creadas con esos campos, eliminarlos romperia datos existentes y pantallas antiguas. El flujo nuevo debe usar `CommissionAttachment`, pero los campos viejos siguen sirviendo como fallback mientras migramos todo.

Frase clave:

> No los mantenemos porque sean la mejor solucion nueva; los mantenemos para no romper compatibilidad y permitir una migracion gradual.

### 2.7 Diferencia entre `JwtAuthGuard`, `JwtStrategy` y `RolesGuard`

`JwtAuthGuard` protege rutas privadas. Su trabajo es exigir que la request tenga un JWT valido antes de entrar al controller.

`JwtStrategy` define como se extrae y valida ese JWT. Lee el token del header `Authorization: Bearer ...`, verifica la firma con `JWT_SECRET`, extrae el payload y construye `request.user`. En Atrium tambien consulta la base de datos para bloquear usuarios suspendidos.

`RolesGuard` va un paso mas alla. No solo pregunta si el usuario esta autenticado, sino si tiene permiso para esta ruta. Por ejemplo, `/admin` requiere rol `ADMIN`.

No basta revisar el rol en frontend porque el frontend se puede manipular. Un usuario puede modificar localStorage o llamar directamente al endpoint con Postman.

Frase clave:

> El frontend mejora la experiencia, pero no es una frontera de seguridad. La seguridad vive en el backend.

### 2.8 Como ocultar un producto digital reportado desde admin?

Archivos principales:

- `backend/src/admin/admin.controller.ts`;
- `backend/src/admin/admin.service.ts`;
- opcionalmente `frontend/src/pages/AdminPage.jsx`.

En este proyecto `DigitalProduct` ya tiene `status`, asi que no hace falta crear campo nuevo. Se puede usar `ARCHIVED` para ocultarlo.

Endpoint:

```ts
@Patch('digital-products/:id')
updateDigitalProduct(
  @Param('id', ParseIntPipe) id: number,
  @Req() request: AdminRequest,
  @Body() body: { status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' },
) {
  return this.adminService.updateDigitalProduct(request.user.userId, id, body);
}
```

Service:

```ts
async updateDigitalProduct(adminUserId: number, productId: number, body: { status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' }) {
  if (!body.status) {
    throw new BadRequestException('Estado requerido');
  }

  const product = await this.prisma.digitalProduct.update({
    where: { id: productId },
    data: { status: body.status },
  });

  await this.log(adminUserId, 'UPDATE_DIGITAL_PRODUCT', 'DigitalProduct', productId, body);

  return product;
}
```

Para ocultar:

```json
{
  "status": "ARCHIVED"
}
```

Puntos de defensa:

- ruta protegida con `JwtAuthGuard`;
- ruta limitada con `RolesGuard`;
- solo `ADMIN`;
- no se borra porque puede haber compras;
- se registra en `AdminActionLog`.

### 2.9 Por que usar `isHidden` o `ARCHIVED` en vez de borrar?

Usamos `isHidden` o `ARCHIVED` en lugar de borrar porque esos registros pueden estar relacionados con pagos, compras, comisiones, reviews, likes o auditoria.

Si borramos un producto digital comprado, podemos romper la biblioteca del comprador. Si borramos una obra, podemos perder likes, vistas o evidencia de moderacion. Si borramos un artista, podemos romper comisiones historicas.

Ocultar conserva la integridad de datos: el contenido deja de aparecer publicamente, pero el historial sigue disponible para admin, pagos y soporte.

Frase clave:

> Moderacion no es eliminacion; moderacion es controlar visibilidad sin destruir trazabilidad.

### 2.10 Que pasa cuando el cliente pide cambios?

Cuando el cliente pide cambios, el backend cambia la comision a `REVISION_REQUESTED` y guarda el mensaje de revision en `revisionRequest`.

Tambien incrementa `usedRevisions`, porque cada solicitud de cambios consume una revision incluida. El sistema compara `usedRevisions` contra `includedRevisions`.

Si todavia quedan revisiones incluidas, el cliente puede pedir cambios dentro del precio acordado. Si ya supero el numero incluido, entra la logica de cobro extra usando `extraRevisionPrice`.

En v1, ese cobro extra puede quedar como un `PaymentTransaction` separado con proposito `REVISION_EXTRA`.

Frase clave:

> Las revisiones dejan de ser una discusion subjetiva y se vuelven una regla explicita del contrato.

### 2.11 Que pasa si el cliente cancela antes o despues de una entrega?

Si el cliente cancela antes de que exista una entrega, el pago no se libera al artista. La comision queda cancelada por cliente, pero no hay retencion porque todavia no hay evidencia de entrega.

Si el cliente cancela despues de una entrega, el artista puede retener un porcentaje definido en la propuesta mediante `cancellationRetentionPercent`. Ese porcentaje existe porque el artista ya hizo trabajo y entrego algo verificable.

Si el cliente no esta de acuerdo con esa retencion, puede abrirse una disputa. Admin puede revisar evidencia, entrega, mensajes y decidir.

Si cancela el artista, la regla es distinta: el artista no retiene pago porque fue quien abandono la comision.

Frase clave:

> La retencion solo tiene sentido despues de una entrega, porque antes de eso no hay base clara para justificar avance entregado.

### 2.12 Como funciona el marketplace digital?

El marketplace usa tres modelos principales:

- `DigitalProduct`: producto que vende el artista.
- `DigitalProductAsset`: archivos del producto, separados en preview y descarga.
- `DigitalProductPurchase`: compra de un usuario.

El artista crea un `DigitalProduct` con precio, descripcion, estado y assets. Los assets de tipo `PREVIEW` se pueden mostrar publicamente. Los assets de tipo `DOWNLOAD` no deben exponerse como URL publica permanente.

Cuando un cliente compra, el backend crea o reutiliza un `DigitalProductPurchase` en estado `PENDING` y crea una orden con PayPal. Cuando PayPal captura correctamente, la compra pasa a `PAID`.

Para descargar, el backend verifica que el usuario sea el comprador y que la compra este en `PAID`. Solo entonces genera una URL firmada temporal de Cloudinary para el archivo descargable.

Frase clave:

> El frontend nunca decide si alguien puede descargar. El backend lo verifica contra `DigitalProductPurchase`.

### 2.13 Por que `PortfolioItem` conserva `mediaUrl`, `thumbnailUrl` y `mediaType` si existe `PortfolioAsset`?

Si, es duplicacion controlada, pero intencional.

`PortfolioAsset` es el modelo nuevo para multiples imagenes, videos y PDFs. Pero `PortfolioItem` conserva `mediaUrl`, `thumbnailUrl` y `mediaType` como portada tecnica y compatibilidad.

Eso evita romper obras antiguas, tarjetas del home, perfil publico y dashboards que todavia esperan una imagen principal. El primer asset funciona como portada, y esos campos permiten listar obras rapido sin hacer toda la logica de assets en cada tarjeta.

A largo plazo, cuando todo el frontend use `PortfolioAsset`, podriamos eliminar esos campos o calcularlos desde el primer asset. Por ahora se mantienen para una migracion gradual y segura.

Frase clave:

> Es una duplicacion temporal para compatibilidad y rendimiento de listados, no el modelo final ideal.

### 2.14 Como implementar rate limiting?

Rate limiting significa limitar cuantas requests puede hacer un usuario o IP en cierto tiempo para evitar spam, fuerza bruta o abuso.

En NestJS instalaria:

```bash
pnpm.cmd add @nestjs/throttler
```

En `app.module.ts` configuraria `ThrottlerModule`:

```ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 20,
      },
    ]),
  ],
})
export class AppModule {}
```

Luego agregaria el guard global:

```ts
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

providers: [
  {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
  },
]
```

Rutas que protegeria primero:

- `POST /auth/login`;
- `POST /auth/register`;
- `POST /auth/resend-verification`;
- `/uploads/*`;
- creacion de comisiones;
- creacion de ofertas;
- checkout/pagos.

Frase clave:

> Lo aplicaria primero en auth y uploads porque son los puntos mas faciles de abusar: fuerza bruta, spam de cuentas y consumo de recursos por archivos.

### 2.15 Como funciona la verificacion de correo?

En `User` tenemos:

- `emailVerifiedAt`;
- `emailVerificationToken`;
- `emailVerificationExpiresAt`.

Cuando un usuario se registra, el backend genera un token aleatorio de verificacion y una fecha de expiracion. Guarda ambos en el usuario y manda un correo con un link al frontend:

```text
/verify-email?token=...
```

Cuando el usuario abre el link, el frontend llama al backend con ese token. El backend busca un usuario que tenga ese `emailVerificationToken`.

Si no existe, el token es invalido. Si existe pero `emailVerificationExpiresAt` ya paso, el token expiro.

Si es valido, el backend actualiza:

```ts
emailVerifiedAt = new Date()
emailVerificationToken = null
emailVerificationExpiresAt = null
```

Eso marca la cuenta como verificada y limpia el token para que no se pueda reutilizar.

Frase clave:

> El token de verificacion es temporal y de un solo uso; al verificar, se limpia de la base de datos.

### 2.16 Por que usamos DTOs y que falta con `class-validator`?

Los DTOs definen la forma esperada del body que entra a un endpoint. Sirven para separar el contrato de entrada del controller y del service.

Por ejemplo, crear una comision, publicar una oferta o crear un producto digital tienen datos distintos. Tener DTOs hace mas claro que campos espera cada flujo y evita que el controller reciba objetos sin estructura.

Lo que falta mejorar es validacion fuerte con `class-validator` y `ValidationPipe`. Ahora varios DTOs existen como clases TypeScript, pero muchas validaciones todavia se hacen manualmente en los services.

Ejemplo:

```ts
@IsString()
@IsNotEmpty()
title: string;

@IsOptional()
@IsNumberString()
budgetMin?: string;
```

En `main.ts`:

```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

Frase clave:

> DTO define contrato; `class-validator` hace cumplir ese contrato en runtime.

### 2.17 Que hace `AdminActionLog`?

`AdminActionLog` es una tabla de auditoria para acciones administrativas sensibles.

Guarda:

- que admin hizo la accion;
- que accion hizo;
- sobre que tipo de entidad;
- que ID fue afectado;
- metadata de la accion;
- fecha.

Ejemplos:

- suspender usuario;
- activar usuario;
- ocultar artista;
- ocultar obra;
- cambiar estado de producto digital;
- cerrar oferta;
- resolver disputa.

No basta con logs de consola porque los logs pueden perderse, rotarse o no estar disponibles despues. Ademas, un log de consola no esta relacionado formalmente con los datos del sistema.

Frase clave:

> `AdminActionLog` convierte acciones administrativas en trazabilidad persistente.

### 2.18 Ciclo principal de una comision

El flujo normal inicia con una `CommissionRequest` en `PENDING`.

El artista puede revisarla, rechazarla o enviar una propuesta. Si envia propuesta, pasa a `PROPOSED`.

El cliente puede aceptar o rechazar esa propuesta. Si acepta, pasa a `CLIENT_ACCEPTED` y luego el artista confirma la comision, quedando en `ACCEPTED`.

Despues el artista genera el pago. La comision pasa a `PAYMENT_PENDING`. Cuando PayPal captura el pago correctamente, pasa a `IN_PROGRESS`.

Cuando el artista entrega, pasa a `DELIVERED`. El cliente puede pedir cambios, entonces pasa a `REVISION_REQUESTED`, o aprobar la entrega. Si aprueba, pasa a `COMPLETED`.

Frase clave:

> Cada estado existe para permitir o bloquear acciones concretas del flujo.

### 2.19 Como agregar un nuevo estado `PAUSED` a comisiones?

Primero tocaria `backend/prisma/schema.prisma`, agregando `PAUSED` al enum `CommissionStatus`.

Luego crearia una migracion Prisma para actualizar el enum en MySQL.

Despues revisaria:

- `CommissionsService`, porque ahi estan las reglas de transicion de estados.
- `CommissionsController`, si se necesita un endpoint especifico.
- Frontend artista y cliente, porque hay que mostrar el nuevo estado.
- Filtros de dashboard.
- Emails/notificaciones, si pausar debe avisar.
- Admin, si admin puede ver o cambiar ese estado.
- QA manual.

Riesgo principal:

No basta con agregar el valor al enum. Si no actualizas las reglas de transicion, podrias permitir acciones invalidas en estado `PAUSED`.

Frase clave:

> Agregar un estado no es solo tocar Prisma; es revisar toda la maquina de estados.

### 2.20 Que es una URL firmada de Cloudinary?

Una URL firmada de Cloudinary es una URL temporal generada por el backend usando el `publicId`, tipo de recurso y credenciales de Cloudinary. Esa URL permite acceder a un archivo privado durante un tiempo limitado.

Es mejor que una URL publica permanente porque el archivo final o producto digital no queda expuesto para cualquiera que tenga el link.

Antes de generar la URL, el backend verifica permisos: por ejemplo, que la comision este completada o que el usuario haya comprado el producto.

Si alguien intenta acceder sin haber aprobado o comprado, el backend no genera la URL. Y aunque alguien comparta una URL firmada, esa URL expira.

Frase clave:

> No protegemos el archivo escondiendo un link; lo protegemos haciendo que el backend autorice y genere acceso temporal.

### 2.21 Como permitimos que un artista publique ofertas como cliente?

La bolsa de trabajo permite que un artista tambien publique ofertas porque `JobPost` pertenece a `User`, no a un rol `CLIENT` rigido.

Ademas, `ArtistProfile` esta separado de `User`. Entonces una cuenta puede tener perfil artistico para aplicar a ofertas y vender servicios, pero tambien puede usar su `User` para publicar ofertas como cliente.

La regla importante es: publicar una oferta no depende de tener rol `CLIENT`; cualquier usuario autenticado puede crear un `JobPost`.

Frase clave:

> El rol no debe limitar todos los casos de uso; la propiedad del recurso y las reglas del endpoint importan mas.

### 2.22 Como evitamos que un artista aplique a su propia oferta?

El backend debe comparar:

- `clientUserId` del `JobPost`;
- `userId` del `ArtistProfile` que aplica.

Si son el mismo usuario, se rechaza.

Ejemplo:

```ts
if (jobPost.clientUserId === artistProfile.userId) {
  throw new ForbiddenException('No puedes aplicar a tu propia oferta');
}
```

Esto debe estar en `JobPostsService`, normalmente en el metodo que crea una `JobApplication`.

No basta con ocultar el boton en frontend porque el usuario puede llamar directamente al endpoint.

Frase clave:

> Las restricciones de negocio siempre se validan en backend, porque el frontend no es confiable.

### 2.23 Que hace `PrismaService`?

`PrismaService` es el wrapper central del cliente Prisma dentro de NestJS.

Prisma es el ORM que usamos para consultar MySQL. En vez de crear un `new PrismaClient()` en cada service, creamos un solo `PrismaService` injectable y lo reutilizamos con inyeccion de dependencias.

Ventajas:

- una sola configuracion de conexion;
- se lee `DATABASE_URL` en un solo lugar;
- se usa el adapter MariaDB/MySQL en un solo lugar;
- evita abrir conexiones innecesarias;
- permite usarlo igual en todos los modulos;
- encaja con el ciclo de vida de NestJS usando `OnModuleInit`.

Frase clave:

> `PrismaService` centraliza la conexion a base de datos y evita que cada modulo maneje su propio cliente.

### 2.24 Por que usamos transacciones Prisma?

Una transaccion Prisma sirve para ejecutar varias operaciones de base de datos como una sola unidad. Si una falla, se revierte todo.

Ejemplo en Atrium:

Cuando se acepta una aplicacion de oferta, el backend puede necesitar:

- cambiar `JobApplication` a `ACCEPTED`;
- cambiar el `JobPost` a `ASSIGNED`;
- rechazar otras aplicaciones pendientes;
- crear una `CommissionRequest`;
- vincular la comision a la aplicacion.

Si no usamos transaccion y falla en medio, podriamos dejar una aplicacion aceptada pero sin comision creada, o una oferta asignada sin artista real.

Otro ejemplo:

Cuando se captura un pago PayPal:

- actualizar `PaymentTransaction` a `PAID`;
- cambiar `CommissionRequest` a `IN_PROGRESS`.

Si solo se actualiza el pago pero falla el cambio de comision, el cliente habria pagado pero la comision seguiria en `PAYMENT_PENDING`.

Frase clave:

> Uso transacciones cuando varias escrituras deben quedar consistentes o no ocurrir.

### 2.25 Que significa que backend sea la fuente de verdad?

El backend es la fuente de verdad porque el frontend solo representa la interfaz. El frontend puede ocultar botones o mostrar estados, pero puede ser manipulado, tener bugs o recibir requests manuales desde herramientas externas.

Por eso las reglas importantes viven en backend:

- permisos;
- ownership;
- estados permitidos;
- pagos;
- descarga de archivos;
- aprobacion de entregas;
- roles admin;
- cancelaciones;
- disputas.

El backend valida el JWT, identifica al usuario, revisa si es dueno del recurso, verifica el estado actual en base de datos y decide si la accion es valida.

Frase clave:

> El frontend guia al usuario; el backend protege el sistema.

### 2.26 Autoaprobacion de entregas por deadline

La autoaprobacion existe despues de que el artista entrega una comision. Cuando se entrega, el backend puede definir un `clientResponseDeadline`, por ejemplo varios dias para que el cliente revise.

Si el cliente no aprueba ni pide cambios antes de esa fecha, el backend puede aprobar automaticamente la entrega. Entonces la comision pasa a `COMPLETED`, se guarda `autoApprovedAt` y el pago se marca como liberado con `releasedAt`.

Existe para proteger al artista. Si el artista ya entrego y el cliente desaparece, el trabajo no queda bloqueado indefinidamente.

Campos importantes:

- `clientResponseDeadline`;
- `autoApprovedAt`;
- `completedAt`;
- `PaymentTransaction.releasedAt`;
- estado `DELIVERED` -> `COMPLETED`.

Frase clave:

> La autoaprobacion no ocurre por aceptar propuesta; ocurre por falta de respuesta despues de una entrega.

### 2.27 Preview con watermark vs archivo final privado

La preview con watermark es una version de revision. El cliente puede verla para validar avance, composicion o resultado, pero no recibe el archivo final limpio. La marca de agua reduce el riesgo de que use el trabajo sin aprobar.

El archivo final privado es el entregable real. Se sube como archivo protegido y no se muestra como URL publica permanente.

Antes de aprobar, el cliente ve previews o archivos de tipo `ARTIST_PREVIEW`, normalmente con watermark si aplica. No puede descargar el final limpio.

Despues de aprobar, la comision pasa a `COMPLETED`, el pago se marca liberado y el backend permite descargar archivos `ARTIST_FINAL` mediante URL firmada temporal.

Frase clave:

> El preview permite revisar; el archivo final permite usar. Por eso tienen permisos distintos.

### 2.28 Reviews en ambos sentidos

El sistema tiene reviews en ambos sentidos porque Atrium busca proteger tanto al cliente como al artista.

`Review` permite que el cliente califique al artista despues de una comision completada. Eso ayuda a otros clientes a evaluar calidad, comunicacion y cumplimiento.

`ClientReview` permite que el artista califique al cliente. Eso ayuda a otros artistas a saber si el cliente responde, respeta el alcance, paga correctamente y no genera conflictos injustificados.

No basta con calificar solo al artista porque la relacion de comision depende de ambas partes. Un mal cliente tambien puede afectar el resultado del trabajo.

Regla importante:

Las reviews deben estar ligadas a una comision completada, para evitar opiniones falsas o sin relacion real de trabajo.

### 2.29 Como agregar reportes de abuso a productos digitales?

Modelo minimo:

```prisma
model DigitalProductReport {
  id               Int      @id @default(autoincrement())
  digitalProductId Int
  reportedByUserId Int
  reason           String   @db.Text
  status           String   @default("OPEN")
  adminNote        String?  @db.Text
  resolvedByUserId Int?
  resolvedAt       DateTime?
  createdAt        DateTime @default(now())
}
```

Endpoints:

```text
POST /digital-products/:id/reports
GET /admin/digital-product-reports
PATCH /admin/digital-product-reports/:id
```

Comportamiento:

- usuario autenticado reporta;
- admin revisa;
- si procede, producto pasa a `ARCHIVED`;
- si no procede, reporte pasa a `DISMISSED`;
- accion queda en `AdminActionLog`.

Frase clave:

> Reportar crea evidencia; admin decide visibilidad; no borramos porque puede haber compras y trazabilidad.

### 2.30 Como agregar `termsAcceptedAt` a `User`?

1. Prisma:

```prisma
termsAcceptedAt DateTime?
```

2. Migracion:

```bash
pnpm.cmd prisma migrate dev --name add_user_terms_accepted_at
```

Si falla shadow DB local:

```bash
pnpm.cmd prisma db execute --file prisma/migrations/<migration>/migration.sql
pnpm.cmd prisma migrate resolve --applied <migration>
pnpm.cmd prisma generate
```

3. Registro:

En `RegisterDto`:

```ts
termsAccepted?: boolean;
```

En `AuthService.register`:

```ts
if (!registerDto.termsAccepted) {
  throw new BadRequestException('Debes aceptar los terminos');
}
```

Al crear usuario:

```ts
termsAcceptedAt: new Date()
```

4. Respuesta:

Incluir `termsAcceptedAt` en `getMe` o `buildAuthResponse`.

5. Frontend:

Agregar checkbox en `RegisterPage.jsx` y enviarlo en el body.

6. Verificacion:

```bash
pnpm.cmd run build
```

backend y frontend.

Frase clave:

> Un campo nuevo no es solo Prisma; hay que migrar DB, generar cliente, validar entrada, guardar dato, devolverlo y reflejarlo en UI si aplica.

### 2.31 Por que no confiar en `role` de localStorage?

No debemos confiar en el `role` guardado en `localStorage` porque cualquier usuario puede abrir DevTools y modificarlo manualmente.

Eso podria hacer que el frontend muestre el link `/admin`, pero no debe darle acceso real.

La seguridad real esta en backend:

- `JwtAuthGuard` valida que el token sea valido;
- `JwtStrategy` construye `request.user`;
- `RolesGuard` verifica que `request.user.role` sea `ADMIN`;
- el endpoint `/admin` rechaza usuarios sin ese rol.

Frase clave:

> `localStorage` sirve para UI, no para seguridad.

### 2.32 Que resuelven `includedRevisions` y `extraRevisionPrice`?

`includedRevisions` y `extraRevisionPrice` resuelven el problema de alcance abierto.

Sin esos campos, el cliente podria pedir cambios ilimitados despues de pagar, y el artista quedaria atrapado trabajando mas de lo acordado.

`includedRevisions` define cuantas rondas de cambios estan incluidas en el precio inicial. `usedRevisions` cuenta cuantas ya se consumieron. `extraRevisionPrice` define cuanto costara cada revision adicional.

Cuando el cliente pide cambios, el backend incrementa `usedRevisions`. Si supera `includedRevisions`, el sistema puede exigir o generar un pago extra antes de permitir mas cambios.

Frase clave:

> Convierte las revisiones en una regla explicita de contrato, no en una discusion subjetiva.

### 2.33 Por que `PayPalService` fue refactor y no feature nueva?

`PayPalService` es una simplificacion tecnica porque no cambia el comportamiento del producto. Antes el sistema ya podia crear y capturar pagos PayPal en comisiones y marketplace. Lo que hicimos fue mover codigo repetido a un servicio compartido.

Beneficio interno:

- menos duplicacion;
- menos riesgo de errores inconsistentes;
- un solo lugar para configurar PayPal;
- un solo lugar para manejar errores del SDK;
- mas facil cambiar PayPal despues.

Pero para el usuario final no aparecio una nueva funcion. Ya podia pagar antes y puede pagar despues.

Frase clave:

> Refactor no siempre aumenta funcionalidad; aumenta calidad y reduce deuda.

### 2.34 Que hacer si falla el build durante la defensa?

Primero identifico cual build fallo: backend o frontend.

Backend:

```bash
cd backend
pnpm.cmd run build
```

Leo el primer error real de TypeScript, no todos los errores en cascada. Normalmente indica archivo, linea y tipo: import faltante, enum invalido, propiedad que no existe, DTO mal escrito o Prisma Client desactualizado.

Si el error es de Prisma:

```bash
pnpm.cmd prisma generate
```

Frontend:

```bash
cd frontend
pnpm.cmd run build
```

Busco errores de JSX, imports, variables no definidas o props mal pasadas.

Regla:

- leer el primer error;
- arreglar lo minimo;
- volver a correr build;
- no hacer cambios grandes mientras diagnostico.

Frase clave:

> Un build roto se resuelve desde el primer error concreto, no adivinando.

### 2.35 Que es ownership check?

Ownership check significa verificar que el usuario que intenta hacer una accion sea dueno o participante legitimo del recurso.

No basta con estar autenticado. El backend debe validar:

> Este usuario puede modificar o ver este recurso especifico?

Ejemplos:

1. Editar obra:

```ts
portfolioItem.artistProfile.userId === userId
```

2. Gestionar comision como artista:

```ts
commissionRequest.artistProfile.userId === userId
```

3. Responder como cliente:

```ts
commissionRequest.clientUserId === userId
```

4. Descargar producto digital:

```ts
purchase.buyerUserId === userId
```

Frase clave:

> Auth responde quien eres; ownership responde si ese recurso es tuyo o te corresponde.

### 2.36 Por que rechazamos otras aplicaciones al aceptar una?

Cuando el cliente acepta una aplicacion, esa oferta queda asignada a un artista y se crea una `CommissionRequest`.

Por eso las demas aplicaciones pendientes se rechazan automaticamente: la oferta ya no esta abierta para seleccion.

Si no las rechazamos, otros artistas podrian seguir viendo su aplicacion como pendiente aunque el trabajo ya fue asignado. Eso genera confusion, falsas expectativas y estados inconsistentes.

Flujo correcto:

- `JobApplication` aceptada -> `ACCEPTED`;
- `JobPost` -> `ASSIGNED`;
- otras aplicaciones pendientes -> `REJECTED`;
- se crea `CommissionRequest`.

Frase clave:

> Una oferta asignada ya no compite; cerrar las pendientes mantiene el estado honesto para todos.

### 2.37 Diferencia entre `isHidden` y `delete`

`isHidden` oculta la obra de vistas publicas, pero conserva el registro en base de datos. Se usa para moderacion o contenido reportado, porque mantiene historial, likes, auditoria y relacion con el artista.

`delete` elimina la obra de la base de datos. Se usa cuando el propio artista decide borrar su obra y no necesitamos conservarla para moderacion o historial administrativo.

Diferencia clave:

- `isHidden`: accion administrativa reversible;
- `delete`: accion del dueno, destructiva.

Frase clave:

> Moderacion oculta; propiedad puede eliminar.

### 2.38 Riesgo de mostrar `finalFileUrl` directamente

Si el frontend muestra directamente `finalFileUrl`, estaria exponiendo el archivo final sin que el backend valide el estado de la comision.

Eso permitiria que un cliente acceda al archivo limpio antes de aprobar la entrega o antes de que el pago se libere logicamente. Tambien podria compartir la URL con terceros si fuera permanente.

Por eso el frontend no debe usar `finalFileUrl` directamente. Debe pedir al backend una descarga final. El backend verifica:

- usuario autorizado;
- comision correcta;
- estado completado/aprobado;
- archivo final existente.

Luego genera una URL firmada temporal de Cloudinary.

Frase clave:

> El final no se protege en frontend; se protege porque el backend decide cuando generar acceso.

### 2.39 Por que no usar una tabla generica para todo?

No usamos una tabla generica porque los modelos representan reglas de negocio diferentes.

Una comision, una oferta, un producto digital y una obra de portafolio no tienen el mismo ciclo de vida. Una comision tiene propuesta, pago, entrega, revisiones y disputa. Una oferta tiene aplicaciones y asignacion. Un producto digital tiene compra y descarga. Una obra tiene likes, vistas y assets.

Si metemos todo en una tabla generica, terminariamos con:

- muchos campos nulos;
- estados que solo aplican a algunos tipos;
- validaciones llenas de `if type === ...`;
- permisos mas dificiles;
- consultas menos claras;
- mas riesgo de errores al cambiar un flujo.

Frase clave:

> Generico habria reducido tablas, pero habria aumentado condicionales y riesgo.

### 2.40 Que es una migracion Prisma?

Una migracion Prisma es un cambio versionado de estructura de base de datos. No manda datos necesariamente; manda cambios de esquema: crear tablas, agregar columnas, modificar enums, indices o relaciones.

`schema.prisma` es la definicion deseada del modelo, pero la base MySQL no cambia solo porque edites ese archivo. Necesitas una migracion para aplicar ese cambio fisicamente a la base.

Flujo normal:

```bash
pnpm.cmd prisma migrate dev --name nombre
pnpm.cmd prisma generate
```

En este proyecto, por problemas de shadow DB local, a veces usamos:

```bash
pnpm.cmd prisma db execute --file prisma/migrations/.../migration.sql
pnpm.cmd prisma migrate resolve --applied nombre_migracion
pnpm.cmd prisma generate
```

Frase clave:

> `schema.prisma` describe el modelo; la migracion cambia la base; `prisma generate` actualiza el cliente tipado.

## 3. Preguntas extra probables con respuesta

### 3.1 Como se relacionan `PortfolioItem`, `PortfolioAsset` y `PortfolioLike`?

`PortfolioItem` es la publicacion principal del portafolio. Guarda titulo, descripcion, contador de vistas, contador de likes y una portada tecnica con `mediaUrl`, `thumbnailUrl` y `mediaType`.

`PortfolioAsset` guarda los archivos reales de la publicacion. Un `PortfolioItem` puede tener muchos assets: varias imagenes, videos o PDFs. Se ordenan con `sortOrder`.

`PortfolioLike` guarda que usuario dio like a que obra. Tiene un unique por `[userId, portfolioItemId]` para evitar likes duplicados.

Frase clave:

> `PortfolioItem` es la obra; `PortfolioAsset` son sus archivos; `PortfolioLike` guarda interacciones de usuarios.

### 3.2 Por que los contadores `viewCount` y `likeCount` estan guardados en `PortfolioItem`?

Estan denormalizados para listar obras rapido sin contar relaciones en cada request.

`PortfolioLike` conserva la verdad relacional de quien dio like, pero `likeCount` permite renderizar tarjetas sin hacer un count por cada obra.

Riesgo:

Si no se actualiza bien, puede desincronizarse. Por eso cuando se da o quita like, el service recalcula o actualiza el contador.

### 3.3 Que diferencia hay entre autenticacion y autorizacion?

Autenticacion responde:

> Quien eres?

Autorizacion responde:

> Que puedes hacer?

En Atrium:

- `JwtAuthGuard` autentica.
- `RolesGuard` autoriza por rol.
- ownership checks autorizan por propiedad del recurso.

### 3.4 Por que no guardar contrasenas en texto plano?

Porque si la base se filtra, las cuentas quedan comprometidas inmediatamente.

Se usa bcrypt para guardar `passwordHash`. En login no se compara texto plano; se compara la contrasena ingresada contra el hash.

Frase clave:

> Nunca guardamos contrasenas, guardamos hashes.

### 3.5 Que pasa si un usuario suspendido tiene un JWT valido?

`JwtStrategy` consulta la base de datos y revisa `isSuspended`.

Aunque el JWT no haya expirado, si el usuario fue suspendido, el backend rechaza la request.

Frase clave:

> La suspension no depende de esperar a que expire el token.

### 3.6 Por que `AdminModule` importa `CommissionsModule`?

Porque admin reutiliza logica de comisiones, por ejemplo resolver disputas.

No duplicamos la regla de resolver disputa en `AdminService`; llamamos al service que ya conoce el dominio.

Frase clave:

> Admin opera sobre dominios existentes; no duplica reglas de negocio.

### 3.7 Que pasa si PayPal captura una orden pero falla la actualizacion local?

Ese es un riesgo critico. Por eso el codigo debe mantener la actualizacion local dentro de un flujo controlado y registrar estado.

En una mejora futura, se podrian agregar webhooks de PayPal para reconciliar pagos y evitar depender solo del redirect/callback.

Respuesta defensiva:

> Para MVP usamos captura directa desde backend; para produccion real agregaria webhooks y auditoria de pagos.

### 3.8 Por que el marketplace usa assets `PREVIEW` y `DOWNLOAD`?

Porque no todos los archivos de un producto deben tener la misma visibilidad.

`PREVIEW` se puede mostrar antes de comprar: portada, imagen promocional, muestra.

`DOWNLOAD` es el archivo privado que solo debe recibir el comprador despues de pagar.

Frase clave:

> Preview vende; download se protege.

### 3.9 Por que la bolsa de trabajo tiene filtros y estados?

Porque una oferta puede estar abierta, pausada, asignada o cerrada.

Los filtros evitan que el usuario vea todo mezclado. Los estados permiten controlar acciones:

- `OPEN`: se puede aplicar;
- `PAUSED`: no se reciben aplicaciones;
- `ASSIGNED`: ya se eligio artista;
- `CLOSED`: cerrada.

### 3.10 Que harias si te piden agregar chat?

Respuesta recomendada:

Para MVP no lo meteria dentro de `CommissionRequest` directamente. Crearia modelos separados:

- `Conversation`;
- `Message`;
- relacion opcional a `CommissionRequest` o `JobPost`.

Primero haria chat basico persistente con polling o REST. Si luego se requiere tiempo real, agregaria WebSockets.

Frase clave:

> Chat es otro dominio; no debe mezclarse con la tabla de comisiones.

## 4. Situaciones de cambio en codigo

### 4.1 Agregar campo nuevo a un modelo

Pasos:

1. editar `schema.prisma`;
2. crear migracion;
3. `pnpm.cmd prisma generate`;
4. actualizar DTO si entra desde frontend;
5. actualizar service;
6. actualizar respuesta si frontend lo necesita;
7. actualizar UI;
8. correr builds.

### 4.2 Agregar endpoint protegido

Pasos:

1. definir metodo en controller;
2. agregar `@UseGuards(JwtAuthGuard)`;
3. leer `request.user.userId`;
4. implementar logica en service;
5. validar ownership;
6. manejar errores con exceptions de Nest;
7. probar con build.

### 4.3 Agregar endpoint solo admin

Pasos:

1. controller dentro de `AdminController`;
2. clase ya protegida con `JwtAuthGuard` y `RolesGuard`;
3. usar `@Roles('ADMIN')`;
4. implementar en `AdminService`;
5. escribir `AdminActionLog`;
6. no borrar datos sensibles, preferir ocultar/archivar.

### 4.4 Agregar nuevo tipo de archivo

Preguntas antes de tocar codigo:

- se sube publico o privado?
- que MIME acepta?
- que limite de tamano?
- como se renderiza en frontend?
- necesita descarga firmada?
- que tabla guarda metadata?

Archivos probables:

- `UploadsController`;
- `CloudinaryService`;
- DTO/modelo correspondiente;
- frontend upload;
- frontend preview/render.

### 4.5 Agregar nuevo estado

No basta con Prisma.

Tambien revisar:

- service de dominio;
- transiciones permitidas;
- frontend labels;
- filtros;
- admin;
- notificaciones;
- emails;
- tests manuales.

## 5. Comandos que debes tener listos

Backend:

```bash
cd C:\Users\PC\Desktop\Atrium\atrium\backend
pnpm.cmd run build
pnpm.cmd run start:dev
pnpm.cmd prisma generate
pnpm.cmd prisma migrate dev --name nombre_migracion
```

Migracion manual usada en este proyecto:

```bash
pnpm.cmd prisma db execute --file prisma/migrations/<migration>/migration.sql
pnpm.cmd prisma migrate resolve --applied <migration>
pnpm.cmd prisma generate
```

Frontend:

```bash
cd C:\Users\PC\Desktop\Atrium\atrium\frontend
pnpm.cmd run build
pnpm.cmd run dev
```

## 6. Respuestas cortas para momentos de presion

Si preguntan por seguridad:

> La UI no es seguridad. Todo permiso importante se valida en backend con JWT, roles y ownership.

Si preguntan por tantos modelos:

> Cada modelo representa un ciclo de vida distinto. Menos tablas habria significado mas condicionales y mas riesgo.

Si preguntan por Cloudinary:

> MySQL guarda metadata; Cloudinary guarda archivos. Para privados usamos URL firmada temporal.

Si preguntan por PayPal:

> Centralizamos la integracion en `PayPalService` para no duplicar creacion/captura de ordenes.

Si preguntan por admin:

> Admin no borra primero; modera visibilidad y deja auditoria.

Si preguntan por comisiones:

> La comision es una maquina de estados. Cada estado habilita o bloquea acciones.

Si preguntan por marketplace:

> Compra digital es flujo directo: pago `PAID`, descarga firmada.

Si preguntan por oferta:

> Oferta selecciona artista; comision ejecuta el trabajo.

## 7. Preguntas para seguir practicando

1. Explica exactamente que pasa en `JobPostsService` cuando se acepta una aplicacion.
2. Que campos revisarias para saber si una comision puede mostrar archivo final?
3. Como impedirias que un usuario compre su propio producto digital?
4. Como agregarias una seccion de favoritos de productos?
5. Que pasa si un admin suspende a un usuario que tiene productos publicados?
6. Que diferencia hay entre `isHidden`, `ARCHIVED` y `DELETED`?
7. Como migrarias `PortfolioItem.mediaUrl` para eliminarlo en el futuro?
8. Como agregarias webhooks de PayPal?
9. Que endpoints deberian tener rate limiting mas estricto?
10. Como validarias MIME real de archivos mas alla del mimetype enviado por el navegador?
11. Como impedirias spam de reportes?
12. Como harias backups de MySQL antes de produccion?
13. Como manejarias refresh tokens?
14. Como agregarias una membresia mensual de artista?
15. Como demostrarias que el backend, no el frontend, protege las descargas?

