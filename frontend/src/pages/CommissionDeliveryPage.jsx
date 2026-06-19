import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { API_URL } from '../config/api'

function getArtistDisplayName(profile) {
  return profile?.artistName || profile?.fullName || 'Artista'
}

function formatDate(dateValue) {
  if (!dateValue) {
    return ''
  }

  return new Intl.DateTimeFormat('es-HN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateValue))
}

function CommissionDeliveryPage() {
  const { id } = useParams()
  const [delivery, setDelivery] = useState(null)
  const [revisionRequest, setRevisionRequest] = useState('')
  const [reviewFormData, setReviewFormData] = useState({
    rating: '5',
    comment: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isResponding, setIsResponding] = useState(false)
  const [isSendingReview, setIsSendingReview] = useState(false)
  const [reviewStatus, setReviewStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDelivery() {
      try {
        const response = await fetch(`${API_URL}/commissions/deliveries/${id}`)

        if (!response.ok) {
          throw new Error('No se pudo cargar la entrega')
        }

        setDelivery(await response.json())
      } catch (currentError) {
        setError(currentError.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadDelivery()
  }, [id])

  async function handleRespond(decision) {
    setIsResponding(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/commissions/deliveries/${id}/response`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            decision,
            revisionRequest:
              decision === 'REQUEST_REVISION' ? revisionRequest : undefined,
          }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'No se pudo responder la entrega')
      }

      setDelivery(await response.json())
      setRevisionRequest('')
    } catch (currentError) {
      setError(currentError.message)
    } finally {
      setIsResponding(false)
    }
  }

  function handleReviewChange(event) {
    setReviewFormData({
      ...reviewFormData,
      [event.target.name]: event.target.value,
    })
  }

  async function handleReviewSubmit(event) {
    event.preventDefault()
    setReviewStatus('')
    setIsSendingReview(true)

    try {
      const response = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commissionRequestId: Number(id),
          rating: Number(reviewFormData.rating),
          comment: reviewFormData.comment,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'No se pudo enviar la review')
      }

      setReviewStatus('Review enviada correctamente')
      setReviewFormData({
        rating: '5',
        comment: '',
      })
    } catch (currentError) {
      setReviewStatus(currentError.message)
    } finally {
      setIsSendingReview(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <p className="text-zinc-300">Cargando entrega...</p>
      </main>
    )
  }

  if (!delivery) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <section className="mx-auto max-w-3xl">
          <Link to="/" className="text-sm font-bold text-violet-400">
            Volver al inicio
          </Link>
          <h1 className="mt-8 text-3xl font-bold">Entrega no encontrada</h1>
          {error && <p className="mt-3 text-zinc-400">{error}</p>}
        </section>
      </main>
    )
  }

  const artistName = getArtistDisplayName(delivery.artistProfile)
  const canRespond = delivery.status === 'DELIVERED'

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-4xl">
        <Link to="/" className="text-sm font-bold text-violet-400">
          Atrium
        </Link>

        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
            Revision de entrega
          </p>
          <h1 className="mt-3 text-3xl font-bold">{artistName}</h1>
          <p className="mt-2 text-zinc-400">
            Estado actual: {delivery.status}
          </p>

          <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Mensaje del artista
            </p>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-300">
              {delivery.deliveryMessage || 'Sin mensaje de entrega.'}
            </p>

            {delivery.clientResponseDeadline && delivery.status === 'DELIVERED' && (
              <div className="mt-4 rounded-md border border-blue-400/30 bg-blue-400/10 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
                  Plazo para responder
                </p>
                <p className="mt-2 text-sm text-zinc-300">
                  {formatDate(delivery.clientResponseDeadline)}
                </p>
              </div>
            )}

            {(delivery.deliveryPreviewUrl || delivery.deliveryUrl) && (
              <a
                href={delivery.deliveryPreviewUrl || delivery.deliveryUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block break-all text-sm font-semibold text-violet-300 hover:text-violet-200"
              >
                Abrir preview con watermark
              </a>
            )}

            {delivery.attachments?.some(
              (attachment) => attachment.type === 'ARTIST_PREVIEW',
            ) && (
              <div className="mt-4 grid gap-2">
                {delivery.attachments
                  .filter((attachment) => attachment.type === 'ARTIST_PREVIEW')
                  .map((attachment) => (
                    <a
                      key={attachment.id || attachment.url}
                      href={attachment.previewUrl || attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 hover:border-violet-400"
                    >
                      Preview: {attachment.name || attachment.url}
                    </a>
                  ))}
              </div>
            )}

            <p className="mt-3 text-sm text-zinc-500">
              El archivo final limpio se desbloquea desde el dashboard del cliente
              cuando la entrega queda aprobada.
            </p>
          </div>

          {canRespond && (
            <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <textarea
                value={revisionRequest}
                onChange={(event) => setRevisionRequest(event.target.value)}
                rows="4"
                placeholder="Si necesitas cambios, escribe aqui que debe corregirse."
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isResponding}
                  onClick={() => handleRespond('ACCEPT')}
                  className="rounded-md bg-violet-400 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-violet-300 disabled:opacity-60"
                >
                  Aprobar entrega
                </button>

                <button
                  type="button"
                  disabled={isResponding}
                  onClick={() => handleRespond('REQUEST_REVISION')}
                  className="rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-400 hover:text-fuchsia-200 disabled:opacity-60"
                >
                  Pedir cambios
                </button>
              </div>
            </div>
          )}

          {delivery.status === 'COMPLETED' && (
            <form
              className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4"
              onSubmit={handleReviewSubmit}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
                Review del artista
              </p>
              <h2 className="mt-2 text-xl font-bold">
                Califica tu experiencia
              </h2>

              {reviewStatus && (
                <p className="mt-3 text-sm text-violet-300">{reviewStatus}</p>
              )}

              <label className="mt-4 block text-sm font-medium text-zinc-300">
                Calificacion
              </label>
              <select
                name="rating"
                value={reviewFormData.rating}
                onChange={handleReviewChange}
                className="mt-2 rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              >
                <option value="5">5 - Excelente</option>
                <option value="4">4 - Muy buena</option>
                <option value="3">3 - Buena</option>
                <option value="2">2 - Regular</option>
                <option value="1">1 - Mala</option>
              </select>

              <label className="mt-4 block text-sm font-medium text-zinc-300">
                Comentario
              </label>
              <textarea
                name="comment"
                value={reviewFormData.comment}
                onChange={handleReviewChange}
                required
                rows="4"
                className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              />

              <button
                type="submit"
                disabled={isSendingReview}
                className="mt-4 rounded-md bg-violet-400 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-violet-300 disabled:opacity-60"
              >
                {isSendingReview ? 'Enviando...' : 'Enviar review'}
              </button>
            </form>
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

export default CommissionDeliveryPage
