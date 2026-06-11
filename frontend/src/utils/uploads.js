import { getAuthToken } from './auth'
import { API_URL } from '../config/api'

export async function uploadImage(file) {
  const token = getAuthToken()

  if (!token) {
    throw new Error('Debes iniciar sesion para subir imagenes')
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_URL}/uploads/image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo subir la imagen')
  }

  return data
}
