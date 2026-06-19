import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { API_URL } from '../config/api'

const INTEREST_OPTIONS = [
  'Ilustracion',
  'Musica',
  'Fotografia',
  'Danza',
  'Pintura',
  'Diseno grafico',
  'Moda',
  'Audiovisual',
  'Escritura',
  'Artes escenicas',
]

function RegisterPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    interests: '',
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

    if (formData.password !== formData.confirmPassword) {
      setError('Los passwords no coinciden')
      setIsSubmitting(false)
      return
    }

    const registerData = {
      email: formData.email,
      password: formData.password,
      fullName: formData.fullName,
      interests: formData.interests,
    }

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'No se pudo crear la cuenta')
      }

      const data = await response.json()

      if (data.requiresEmailVerification) {
        navigate(
          `/verify-email?email=${encodeURIComponent(data.email || formData.email.trim())}`,
        )
        return
      }

      navigate(
        `/verify-email?email=${encodeURIComponent(formData.email.trim())}`,
      )
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
            Registro
          </p>

          <h1 className="mt-3 text-3xl font-bold">Crear cuenta</h1>

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
            <div>
              <label className="text-sm font-medium text-zinc-300">
                Confirmar password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300">
                Nombre completo
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-300">
                Intereses creativos
              </label>
              <select
                name="interests"
                value={formData.interests}
                onChange={handleChange}
                className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              >
                <option value="">Selecciona un interes principal</option>
                {INTEREST_OPTIONS.map((interest) => (
                  <option key={interest} value={interest}>
                    {interest}
                  </option>
                ))}
              </select>
            </div>

            <Button>{isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}</Button>
          </form>

          <p className="mt-6 text-sm text-zinc-400">
            Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-violet-400">
              Inicia sesion
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}

export default RegisterPage
