import { getAuthToken } from './auth'
import { API_URL } from '../config/api'

async function uploadTo(endpoint, file, authMessage, fallbackMessage) {
  const token = getAuthToken()

  if (!token) {
    throw new Error(authMessage)
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || fallbackMessage)
  }

  return data
}

export function uploadImage(file) {
  return uploadTo(
    '/uploads/image',
    file,
    'Debes iniciar sesion para subir imagenes',
    'No se pudo subir la imagen',
  )
}

export async function uploadFile(file) {
  return uploadTo(
    '/uploads/file',
    file,
    'Debes iniciar sesion para subir archivos',
    'No se pudo subir el archivo',
  )
}

export async function uploadPortfolioFile(file) {
  return uploadTo(
    '/uploads/portfolio',
    file,
    'Debes iniciar sesion para subir archivos de portafolio',
    'No se pudo subir el archivo de portafolio',
  )
}

export async function uploadCommissionFinalFile(file) {
  return uploadTo(
    '/uploads/commission-final',
    file,
    'Debes iniciar sesion para subir archivos finales',
    'No se pudo subir el archivo final',
  )
}

export async function uploadDigitalProductFile(file) {
  return uploadTo(
    '/uploads/digital-product',
    file,
    'Debes iniciar sesion para subir productos digitales',
    'No se pudo subir el archivo digital',
  )
}

export async function getCommissionFinalDownloadUrl(commissionId, attachmentId) {
  const token = getAuthToken()

  if (!token) {
    throw new Error('Debes iniciar sesion para descargar archivos finales')
  }

  const query = attachmentId ? `?attachmentId=${attachmentId}` : ''
  const response = await fetch(
    `${API_URL}/commissions/${commissionId}/final-download${query}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo preparar la descarga')
  }

  return data.downloadUrl
}

export async function uploadAttachments(files, upload = uploadFile) {
  const uploadedFiles = await Promise.all(Array.from(files).map(upload))

  return uploadedFiles.map((file) => ({
    url: file.url,
    publicId: file.publicId,
    resourceType: file.resourceType,
    deliveryType: file.deliveryType,
    previewUrl: file.previewUrl,
    name: file.name,
    mimeType: file.mimeType,
    size: file.bytes,
  }))
}

export async function getDigitalProductDownloadUrl(purchaseId, assetId) {
  const token = getAuthToken()

  if (!token) {
    throw new Error('Debes iniciar sesion para descargar este producto')
  }

  const query = assetId ? `?assetId=${assetId}` : ''
  const response = await fetch(
    `${API_URL}/digital-products/purchases/${purchaseId}/download${query}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo preparar la descarga')
  }

  return data.downloadUrl
}
