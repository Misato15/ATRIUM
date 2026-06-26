#!/usr/bin/env node

const baseUrl = process.env.ATRIUM_API_URL || 'http://127.0.0.1:3000';
const results = [];

class SkipTest extends Error {}

function skip(message) {
  throw new SkipTest(message);
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    skip(`falta ${name}`);
  }
  return value;
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function expectStatus(response, expectedStatuses, label) {
  const statuses = Array.isArray(expectedStatuses)
    ? expectedStatuses
    : [expectedStatuses];

  expect(
    statuses.includes(response.status),
    `${label}: esperado ${statuses.join(' o ')}, recibido ${response.status}. ${response.text}`,
  );
}

function asArray(value, label) {
  expect(Array.isArray(value), `${label}: la respuesta debe ser un arreglo`);
  return value;
}

async function request(path, options = {}) {
  const headers = {
    ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
    ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    ...options.headers,
  };

  let response;

  try {
    response = await fetch(new URL(path, baseUrl), {
      method: options.method || 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    throw new Error(
      `no se pudo conectar a ${baseUrl}. Levanta el backend con "pnpm.cmd run start:dev". ${error.message}`,
    );
  }

  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return {
    status: response.status,
    ok: response.ok,
    body,
    text,
  };
}

async function login(emailEnv, passwordEnv) {
  const email = requiredEnv(emailEnv);
  const password = requiredEnv(passwordEnv);
  const response = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  expectStatus(response, 201, `login ${emailEnv}`);

  const token =
    response.body?.accessToken ||
    response.body?.access_token ||
    response.body?.token;

  expect(token, `login ${emailEnv}: no devolvio accessToken`);
  return token;
}

function assertHiddenDownloadAssets(products, label) {
  for (const product of products) {
    for (const asset of product.assets || []) {
      if (asset.kind === 'DOWNLOAD') {
        expect(!asset.url, `${label}: asset descargable expone URL publica`);
      }
    }
  }
}

function assertPrivateReviewComments(reviews, label) {
  for (const review of reviews || []) {
    expect(
      Number(review.rating) >= 1 && Number(review.rating) <= 5,
      `${label}: review ${review.id} tiene rating invalido`,
    );

    if (review.isPublic === false) {
      expect(
        !review.comment,
        `${label}: review privada ${review.id} expone comentario`,
      );
    }
  }
}

async function run(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
    console.log(`PASS ${name}`);
  } catch (error) {
    if (error instanceof SkipTest) {
      results.push({ name, status: 'SKIP', message: error.message });
      console.log(`SKIP ${name} (${error.message})`);
      return;
    }

    results.push({ name, status: 'FAIL', message: error.message });
    console.error(`FAIL ${name}`);
    console.error(`     ${error.message}`);
  }
}

await run('WB-01 categorias publicas responden', async () => {
  const response = await request('/artist-categories');
  expectStatus(response, 200, 'GET /artist-categories');
  asArray(response.body, 'categorias');
});

await run('WB-02 artistas publicos responden', async () => {
  const response = await request('/artists');
  expectStatus(response, 200, 'GET /artists');
  asArray(response.body, 'artistas');
});

await run('WB-03 marketplace publico no expone descargables', async () => {
  const response = await request('/digital-products');
  expectStatus(response, 200, 'GET /digital-products');
  const products = asArray(response.body, 'productos digitales');
  assertHiddenDownloadAssets(products, 'GET /digital-products');
});

await run('WB-04 rutas privadas rechazan anonimos', async () => {
  const paths = [
    '/auth/me',
    '/commissions/client/me',
    '/digital-products/purchases/me',
    '/admin/summary',
  ];

  for (const path of paths) {
    const response = await request(path);
    expectStatus(response, [401, 403], `GET ${path}`);
  }
});

await run('WB-05 login cliente y /auth/me', async () => {
  const token = await login('ATRIUM_CLIENT_EMAIL', 'ATRIUM_CLIENT_PASSWORD');
  const response = await request('/auth/me', { token });
  expectStatus(response, 200, 'GET /auth/me cliente');
  expect(response.body?.email, '/auth/me cliente no devolvio email');
});

await run('WB-06 login artista y /auth/me', async () => {
  const token = await login('ATRIUM_ARTIST_EMAIL', 'ATRIUM_ARTIST_PASSWORD');
  const response = await request('/auth/me', { token });
  expectStatus(response, 200, 'GET /auth/me artista');
  expect(response.body?.email, '/auth/me artista no devolvio email');
});

await run('WB-07 cliente no puede entrar al admin', async () => {
  const token = await login('ATRIUM_CLIENT_EMAIL', 'ATRIUM_CLIENT_PASSWORD');
  const response = await request('/admin/summary', { token });
  expectStatus(response, [401, 403], 'GET /admin/summary con cliente');
});

await run('WB-08 admin puede ver summary', async () => {
  const token = await login('ATRIUM_ADMIN_EMAIL', 'ATRIUM_ADMIN_PASSWORD');
  const response = await request('/admin/summary', { token });
  expectStatus(response, 200, 'GET /admin/summary con admin');
  expect(response.body && typeof response.body === 'object', 'summary admin invalido');
});

await run('WB-09 perfil publico oculta comentarios privados', async () => {
  const artistProfileId = requiredEnv('ATRIUM_ARTIST_PROFILE_ID');
  const response = await request(`/artists/${artistProfileId}`);
  expectStatus(response, 200, `GET /artists/${artistProfileId}`);
  assertPrivateReviewComments(response.body?.reviews, 'perfil publico');
});

await run('WB-10 endpoint de reviews oculta comentarios privados', async () => {
  const artistProfileId = requiredEnv('ATRIUM_ARTIST_PROFILE_ID');
  const response = await request(`/reviews/artists/${artistProfileId}`);
  expectStatus(response, 200, `GET /reviews/artists/${artistProfileId}`);
  assertPrivateReviewComments(asArray(response.body, 'reviews'), 'reviews publicas');
});

await run('WB-11 detalle de producto no expone descargables', async () => {
  const productId = requiredEnv('ATRIUM_DIGITAL_PRODUCT_ID');
  const response = await request(`/digital-products/products/${productId}`);
  expectStatus(response, 200, `GET /digital-products/products/${productId}`);
  assertHiddenDownloadAssets([response.body], 'detalle producto');
});

await run('WB-12 biblioteca del comprador oculta URLs descargables', async () => {
  const token = await login('ATRIUM_CLIENT_EMAIL', 'ATRIUM_CLIENT_PASSWORD');
  const response = await request('/digital-products/purchases/me', { token });
  expectStatus(response, 200, 'GET /digital-products/purchases/me');

  const purchases = asArray(response.body, 'compras');
  assertHiddenDownloadAssets(
    purchases.map((purchase) => purchase.digitalProduct).filter(Boolean),
    'biblioteca del comprador',
  );
});

await run('WB-13 comprador puede pedir URL de descarga firmada', async () => {
  const token = await login('ATRIUM_CLIENT_EMAIL', 'ATRIUM_CLIENT_PASSWORD');
  const purchaseId = requiredEnv('ATRIUM_DIGITAL_PURCHASE_ID');
  const response = await request(`/digital-products/purchases/${purchaseId}/download`, {
    token,
  });

  expectStatus(response, 200, `GET /digital-products/purchases/${purchaseId}/download`);
  expect(
    typeof response.body?.downloadUrl === 'string' && response.body.downloadUrl,
    'descarga no devolvio downloadUrl',
  );
});

await run('WB-14 artista puede cambiar visibilidad de review', async () => {
  if (process.env.ATRIUM_ALLOW_MUTATION !== '1') {
    skip('requiere ATRIUM_ALLOW_MUTATION=1');
  }

  const token = await login('ATRIUM_ARTIST_EMAIL', 'ATRIUM_ARTIST_PASSWORD');
  const reviewId = requiredEnv('ATRIUM_REVIEW_ID');
  const isPublic = process.env.ATRIUM_REVIEW_IS_PUBLIC === '1';
  const response = await request(`/reviews/${reviewId}/visibility`, {
    method: 'PATCH',
    token,
    body: { isPublic },
  });

  expectStatus(response, 200, `PATCH /reviews/${reviewId}/visibility`);
  expect(response.body?.isPublic === isPublic, 'la visibilidad no cambio como se pidio');
});

const failed = results.filter((result) => result.status === 'FAIL');
const passed = results.filter((result) => result.status === 'PASS');
const skipped = results.filter((result) => result.status === 'SKIP');

console.log('');
console.log(`Resultado: ${passed.length} pass, ${skipped.length} skip, ${failed.length} fail`);
console.log(`API: ${baseUrl}`);

if (failed.length > 0) {
  process.exitCode = 1;
}
