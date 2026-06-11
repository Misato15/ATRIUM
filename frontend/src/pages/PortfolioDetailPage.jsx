import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '../components/Button'
import { API_URL } from '../config/api'
import { getAuthToken, removeAuthToken } from '../utils/auth'

function getArtistDisplayName(artist) {
  return artist?.artistName || artist?.fullName || 'Artista sin nombre'
}

function PortfolioDetailPage() {
  const { id } = useParams()
  const [portfolioItem, setPortfolioItem] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLiking, setIsLiking] = useState(false)
  const [error, setError] = useState('')
  const [interactionError, setInteractionError] = useState('')

  useEffect(() => {
    async function loadPortfolioItem() {
      try {
        const response = await fetch(`${API_URL}/portfolio/${id}`)

        if (!response.ok) {
          throw new Error('Obra no encontrada')
        }

        const data = await response.json()
        let portfolioData = data

        const viewStorageKey = `atrium_portfolio_view_${id}`

        if (!sessionStorage.getItem(viewStorageKey)) {
          sessionStorage.setItem(viewStorageKey, 'true')

          const viewResponse = await fetch(
            `${API_URL}/portfolio/${id}/view`,
            {
              method: 'POST',
            },
          )

          if (viewResponse.ok) {
            const viewData = await viewResponse.json()

            portfolioData = {
              ...portfolioData,
              viewCount: viewData.viewCount,
            }
          } else {
            sessionStorage.removeItem(viewStorageKey)
          }
        }

       const token = getAuthToken()

        if (token) {
          const statusResponse = await fetch(
            `${API_URL}/portfolio/${id}/like-status`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          )

          if (statusResponse.ok) {
            const status = await statusResponse.json()

            portfolioData = {
              ...portfolioData,
              likedByCurrentUser: status.liked,
              likeCount: status.likeCount,
            }
          }
        }

        setPortfolioItem(portfolioData)
      } catch (error) {
        setError(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadPortfolioItem()
  }, [id])

  async function handleLike() {
    const token = getAuthToken()

    if (!token) {
      setInteractionError('Inicia sesion para dar me gusta')
      return
    }

    setInteractionError('')
    setIsLiking(true)

    try {
      const response = await fetch(`${API_URL}/portfolio/${id}/like`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          removeAuthToken()
          throw new Error('Tu sesion expiro. Inicia sesion para dar me gusta')
        }

        const errorData = await response.json()
        throw new Error(errorData.message || 'No se pudo registrar el me gusta')
      }

      const data = await response.json()
      setPortfolioItem(data)
    } catch (error) {
      setInteractionError(error.message)
    } finally {
      setIsLiking(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <p className="text-zinc-400">Cargando obra...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <section className="mx-auto max-w-5xl">
          <Link to="/" className="text-sm font-semibold text-violet-400">
            Volver al inicio
          </Link>

          <h1 className="mt-6 text-4xl font-bold">Obra no encontrada</h1>
          <p className="mt-4 text-zinc-300">{error}</p>
        </section>
      </main>
    )
  }

  const artist = portfolioItem.artistProfile
  const artistName = getArtistDisplayName(artist)
  const imageUrl = portfolioItem.thumbnailUrl || portfolioItem.mediaUrl

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <Link to="/" className="text-sm font-semibold text-violet-400">
          Volver al inicio
        </Link>

        <div className="mt-8 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
          {portfolioItem.mediaType === 'IMAGE' && imageUrl ? (
            <img
              src={imageUrl}
              alt={portfolioItem.title}
              className="max-h-[720px] w-full object-contain bg-zinc-950"
            />
          ) : (
            <div className="flex min-h-[360px] items-center justify-center bg-zinc-950 text-zinc-400">
              Vista previa no disponible para este tipo de medio.
            </div>
          )}

          <div className="grid gap-8 p-6 lg:grid-cols-[1fr_280px]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
                {portfolioItem.mediaType}
              </p>

              <h1 className="mt-3 text-4xl font-bold">
                {portfolioItem.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <p className="text-sm font-medium text-zinc-400">
                  {portfolioItem.viewCount} vistas
                </p>
                <p className="text-sm font-medium text-zinc-400">
                  {portfolioItem.likeCount} me gusta
                </p>
                <Button
                  variant={
                    portfolioItem.likedByCurrentUser ? 'secondary' : 'primary'
                  }
                  onClick={handleLike}
                  disabled={isLiking}
                >
                  {isLiking
                    ? 'Guardando...'
                    : portfolioItem.likedByCurrentUser
                      ? 'Quitar me gusta'
                      : 'Me gusta'}
                </Button>
              </div>

              {interactionError && (
                <p className="mt-3 text-sm text-red-400">
                  {interactionError}
                </p>
              )}

              {portfolioItem.description && (
                <p className="mt-5 max-w-3xl leading-8 text-zinc-300">
                  {portfolioItem.description}
                </p>
              )}
            </div>

            <aside className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">Artista</p>

              <Link
                to={`/artists/${artist.id}`}
                className="mt-2 block text-lg font-bold text-white hover:text-violet-400"
              >
                {artistName}
              </Link>

              <p className="mt-3 text-sm text-zinc-400">
                {artist.category?.name || 'Sin categoria'}
              </p>

              {artist.location && (
                <p className="mt-1 text-sm text-zinc-400">{artist.location}</p>
              )}
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}

export default PortfolioDetailPage
