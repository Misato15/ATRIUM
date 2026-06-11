import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { API_URL } from '../config/api'

function RegisterPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    artistName: '',
    category: '',
    location: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch(`${API_URL}/artist-categories`)
        const data = await response.json()
        setCategories(data)
      } catch {
        setError('No se pudieron cargar las categorias')
      } finally {
        setIsLoadingCategories(false)
      }
    }

    loadCategories()
  }, [])

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
      artistName: formData.artistName,
      category: formData.category,
      location: formData.location,
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

      navigate('/login')
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

          <h1 className="mt-3 text-3xl font-bold">Crear cuenta de artista</h1>

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
                Nombre artistico
              </label>
              <input
                type="text"
                name="artistName"
                value={formData.artistName}
                onChange={handleChange}
                className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300">
                Categoria artistica
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                disabled={isLoadingCategories}
                className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              >
                <option value="">
                  {isLoadingCategories
                    ? 'Cargando categorias...'
                    : 'Selecciona una categoria'}
                </option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300">
                Ubicacion
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              />
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
