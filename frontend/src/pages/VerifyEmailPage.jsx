import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { API_URL } from '../config/api'

function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const initialEmail = searchParams.get('email') || ''
  const [email, setEmail] = useState(initialEmail)
  const [message, setMessage] = useState(
    initialEmail
      ? `Correo de verificacion enviado a ${initialEmail}. Revisa tu bandeja.`
      : 'Ingresa tu correo para reenviar el enlace de verificacion.',
  )
  const [error, setError] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const token = searchParams.get('token')

  useEffect(() => {
    async function verifyEmail() {
      if (!token) {
        return
      }

      setMessage('Verificando correo...')
      setError('')

      try {
        const response = await fetch(
          `${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`,
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'No se pudo verificar el correo')
        }

        setMessage(data.message || 'Correo verificado correctamente')
        setIsVerified(true)
      } catch (error) {
        setError(error.message)
      }
    }

    verifyEmail()
  }, [searchParams])

  async function handleResend(event) {
    event.preventDefault()
    setError('')
    setIsResending(true)

    try {
      const response = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo reenviar el correo')
      }

      setMessage(data.message)
    } catch (error) {
      setError(error.message)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
          Atrium
        </p>
        <h1 className="mt-3 text-3xl font-bold">Verificacion de correo</h1>

        <p
          className={`mt-4 rounded-md border p-3 text-sm ${
            error
              ? 'border-red-400/30 bg-red-400/10 text-red-300'
              : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
          }`}
        >
          {error || message}
        </p>

        {!isVerified && (
          <form className="mt-8 space-y-5" onSubmit={handleResend}>
            <p className="text-sm text-zinc-300">
              {token
                ? 'Este enlace ya no es valido. Si la cuenta todavia existe, escribe tu email para enviar un enlace nuevo.'
                : 'Si no recibiste el correo, escribe tu email para enviarlo otra vez.'}
            </p>

            <div>
              <label className="text-sm font-medium text-zinc-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                placeholder="tu@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={isResending}
              className="w-full rounded-md bg-violet-400 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResending ? 'Enviando...' : 'Reenviar correo'}
            </button>
          </form>
        )}

        <Link
          to="/login"
          className="mt-6 inline-flex rounded-md bg-violet-400 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-violet-300"
        >
          Volver a login
        </Link>

        {error && (
          <Link
            to="/register"
            className="ml-3 mt-6 inline-flex rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-violet-400"
          >
            Crear cuenta nueva
          </Link>
        )}
      </section>
    </main>
  )
}

export default VerifyEmailPage
