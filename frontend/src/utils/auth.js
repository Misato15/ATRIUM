const AUTH_TOKEN_KEY = 'atrium_token'
const AUTH_USER_KEY = 'atrium_user'

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function saveAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function getAuthUser() {
  const storedUser = localStorage.getItem(AUTH_USER_KEY)

  if (!storedUser) {
    return null
  }

  try {
    return JSON.parse(storedUser)
  } catch {
    localStorage.removeItem(AUTH_USER_KEY)
    return null
  }
}

export function saveAuthUser(user) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function saveAuthSession(token, user) {
  saveAuthToken(token)
  saveAuthUser(user)
}

export function removeAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}

export function isAuthenticated() {
  return Boolean(getAuthToken())
}

export function getDashboardPathForUser(user) {
  return user?.profile ? '/dashboard' : '/client/dashboard'
}

export function getPostLoginPathForUser(user) {
  return user?.profile ? '/dashboard' : '/'
}
