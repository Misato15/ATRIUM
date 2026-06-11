const AUTH_TOKEN_KEY = 'atrium_token'

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function saveAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function removeAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

export function isAuthenticated() {
  return Boolean(getAuthToken())
}
