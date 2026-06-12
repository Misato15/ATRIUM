import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { API_URL } from '../config/api'

function getArtistDisplayName(profile) {
  return profile?.artistName || profile?.fullName || 'Artista'
}

function getStatusMessage(status) {
  const messages = {
    PROPOSED: 'Revisa la propuesta y responde al artista.',
    CLIENT_ACCEPTED: 'Aceptaste esta propuesta. El artista debe confirmar la comision.',
    CLIENT_REJECTED: 'Rechazaste esta propuesta.',
    ACCEPTED: 'La comision fue confirmada. Revisa tu correo para el enlace de pago.',
    REJECTED: 'La solicitud fue rechazada por el artista.',
  }

  return messages[status] || 'Estado de propuesta actualizado.'
}

function CommissionProposalPage() {
  const { id } = useParams()
  const [proposal, setProposal] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isResponding, setIsResponding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProposal() {
      try {
        const response = await fetch(`${API_URL}/commissions/proposals/${id}`)

        if (!response.ok) {
          throw new Error('No se pudo cargar la propuesta')
        }

        setProposal(await response.json())
      } catch (currentError) {
        setError(currentError.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadProposal()
  }, [id])

  async function handleRespond(decision) {
    setIsResponding(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/commissions/proposals/${id}/response`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ decision }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'No se pudo responder la propuesta')
      }

      setProposal(await response.json())
    } catch (currentError) {
      setError(currentError.message)
    } finally {
      setIsResponding(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <p className="text-zinc-300">Cargando propuesta...</p>
      </main>
    )
  }

  if (!proposal) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <section className="mx-auto max-w-3xl">
          <Link to="/" className="text-sm font-bold text-violet-400">
            Volver al inicio
          </Link>
          <h1 className="mt-8 text-3xl font-bold">Propuesta no encontrada</h1>
          {error && <p className="mt-3 text-zinc-400">{error}</p>}
        </section>
      </main>
    )
  }

  const artistName = getArtistDisplayName(proposal.artistProfile)
  const canRespond = proposal.status === 'PROPOSED'

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-4xl">
        <Link to="/" className="text-sm font-bold text-violet-400">
          Atrium
        </Link>

        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
            Propuesta de comision
          </p>
          <h1 className="mt-3 text-3xl font-bold">{artistName}</h1>
          <p className="mt-2 text-zinc-400">{getStatusMessage(proposal.status)}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs font-semibold uppercase text-zinc-500">
                Cotizacion
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {proposal.quotedPrice || 'No especificada'}
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs font-semibold uppercase text-zinc-500">
                Solicitud original
              </p>
              <p className="mt-2 text-sm text-zinc-300">
                {proposal.budget || 'Presupuesto no especificado'}
              </p>
            </div>
          </div>

          {proposal.artistResponse && (
            <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs font-semibold uppercase text-zinc-500">
                Mensaje del artista
              </p>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-300">
                {proposal.artistResponse}
              </p>
            </div>
          )}

          {proposal.message && (
            <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs font-semibold uppercase text-zinc-500">
                Tu solicitud
              </p>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-300">
                {proposal.message}
              </p>
            </div>
          )}

          {canRespond && (
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isResponding}
                onClick={() => handleRespond('ACCEPT')}
                className="rounded-md bg-violet-400 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Aceptar propuesta
              </button>

              <button
                type="button"
                disabled={isResponding}
                onClick={() => handleRespond('REJECT')}
                className="rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Rechazar propuesta
              </button>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-md border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}
        </div>
      </section>
    </main>
  )
}

export default CommissionProposalPage
