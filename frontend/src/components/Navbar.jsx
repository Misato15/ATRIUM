import { Link, useNavigate } from 'react-router-dom'
import {
  getAuthUser,
  isAuthenticated,
  removeAuthToken,
} from '../utils/auth'
import Button from './Button'

function Navbar() {
  const navigate = useNavigate()
  const loggedIn = isAuthenticated()
  const authUser = getAuthUser()

  function handleLogout() {
    removeAuthToken()
    navigate('/login')
  }

  return (
    <header className="border-b border-zinc-900 bg-zinc-950 px-6 py-4 text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Link to="/" className="text-sm font-bold uppercase text-violet-400">
          Atrium
        </Link>

        <nav className="flex items-center gap-3">
          {loggedIn ? (
            <>
              <Link
                to="/"
                className="text-sm font-semibold text-zinc-300 hover:text-violet-400"
              >
                Explorar
              </Link>

              <Link
                to="/jobs"
                className="text-sm font-semibold text-zinc-300 hover:text-violet-400"
              >
                Ofertas
              </Link>

              <Link
                to="/marketplace"
                className="text-sm font-semibold text-zinc-300 hover:text-violet-400"
              >
                Marketplace
              </Link>

              <Link
                to="/client/dashboard"
                className="text-sm font-semibold text-zinc-300 hover:text-violet-400"
              >
                Mis solicitudes
              </Link>

              <Link
                to="/dashboard"
                className="text-sm font-semibold text-zinc-300 hover:text-violet-400"
              >
                {authUser?.profile ? 'Mi perfil' : 'Crear perfil'}
              </Link>

              {authUser?.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  className="text-sm font-semibold text-zinc-300 hover:text-violet-400"
                >
                  Admin
                </Link>
              )}

              <Button variant="secondary" onClick={handleLogout}>
                Cerrar sesion
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-semibold text-zinc-300 hover:text-violet-400"
              >
                Iniciar sesion
              </Link>

              <Link
                to="/jobs"
                className="text-sm font-semibold text-zinc-300 hover:text-violet-400"
              >
                Ofertas
              </Link>

              <Link
                to="/marketplace"
                className="text-sm font-semibold text-zinc-300 hover:text-violet-400"
              >
                Marketplace
              </Link>

              <Link
                to="/register"
                className="rounded-md bg-violet-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-violet-300"
              >
                Registro
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Navbar
