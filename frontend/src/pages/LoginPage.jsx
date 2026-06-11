import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { saveAuthToken } from '../utils/auth'
import Button from '../components/Button'
import { API_URL } from '../config/api'

function LoginPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'No se pudo iniciar sesion')
      }

      const data = await response.json()

     saveAuthToken(data.accessToken)

      navigate('/dashboard')
    } catch (error) {
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-md">
        <Link to="/" className="text-sm font-semibold text-violet-400">
          Volver al inicio
        </Link>

        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
            Login
          </p>

          <h1 className="mt-3 text-3xl font-bold">Entrar a tu cuenta</h1>

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-zinc-300">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              />
            </div>

            <Button>{isSubmitting ? 'Entrando...' : 'Entrar'}</Button>
          </form>

          <p className="mt-6 text-sm text-zinc-400">
            No tienes cuenta?{' '}
            <Link to="/register" className="font-semibold text-violet-400">
              Crea una cuenta
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
