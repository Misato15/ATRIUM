# Copia este archivo como whitebox-env.local.ps1 y rellena tus datos reales.
# Luego ejecuta:
# . .\scripts\whitebox-env.local.ps1
# pnpm.cmd run test:whitebox

$env:ATRIUM_API_URL = "http://127.0.0.1:3000"

$env:ATRIUM_CLIENT_EMAIL = "cliente@atrium.local"
$env:ATRIUM_CLIENT_PASSWORD = "password_cliente"

$env:ATRIUM_ARTIST_EMAIL = "artista@atrium.local"
$env:ATRIUM_ARTIST_PASSWORD = "password_artista"

$env:ATRIUM_ADMIN_EMAIL = "admin@atrium.local"
$env:ATRIUM_ADMIN_PASSWORD = "password_admin"

# IDs existentes en tu base local.
$env:ATRIUM_ARTIST_PROFILE_ID = "1"
$env:ATRIUM_DIGITAL_PRODUCT_ID = "1"
$env:ATRIUM_DIGITAL_PURCHASE_ID = "1"
$env:ATRIUM_REVIEW_ID = "1"

# Mantener apagado salvo que quieras que el test modifique la visibilidad de una review.
$env:ATRIUM_ALLOW_MUTATION = "0"
$env:ATRIUM_REVIEW_IS_PUBLIC = "1"
