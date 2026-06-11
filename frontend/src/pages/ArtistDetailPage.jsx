import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PortfolioItemCard from '../components/PortfolioItemCard'
import { API_URL } from '../config/api'

function getArtistDisplayName(artist) {
  return artist.artistName || artist.fullName || 'Artista sin nombre'
}

function ArtistDetailPage() {
  const { id } = useParams()
  const [artist, setArtist] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [commissionFormData, setCommissionFormData] = useState({
  clientName: '',
  clientEmail: '',
  message: '',
  budget: '',
})
const [commissionStatus, setCommissionStatus] = useState('')
const [isSendingCommission, setIsSendingCommission] = useState(false)

function handleCommissionChange(event) {
  setCommissionFormData({
    ...commissionFormData,
    [event.target.name]: event.target.value,
  })
}

async function handleCommissionSubmit(event) {
  event.preventDefault()
  setCommissionStatus('')
  setIsSendingCommission(true)

  try {
    const response = await fetch(
      `${API_URL}/commissions/artists/${artist.id}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commissionFormData),
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'No se pudo enviar la solicitud')
    }

    setCommissionFormData({
      clientName: '',
      clientEmail: '',
      message: '',
      budget: '',
    })
    setCommissionStatus('Solicitud enviada correctamente')
  } catch (error) {
    setCommissionStatus(error.message)
  } finally {
    setIsSendingCommission(false)
  }
}
  useEffect(() => {
    async function loadArtist() {
      try {
        const response = await fetch(`${API_URL}/artists/${id}`)

        if (!response.ok) {
          throw new Error('Artista no encontrado')
        }

        const data = await response.json()
        setArtist(data)
      } catch (error) {
        setError(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadArtist()
  }, [id])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <section className="mx-auto max-w-5xl">
          <p className="text-zinc-400">Cargando artista...</p>
        </section>
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

          <h1 className="mt-6 text-4xl font-bold">Artista no encontrado</h1>

          <p className="mt-4 text-zinc-300">{error}</p>
        </section>
      </main>
    )
  }

  const displayName = getArtistDisplayName(artist)
  const categoryName = artist.category?.name || 'Sin categoria'
  const profileImageUrl = artist.profileImageUrl
  const coverImageUrl = artist.coverImageUrl

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-5xl">
        <Link to="/" className="text-sm font-semibold text-violet-400">
          Volver al inicio
        </Link>

        <div className="mt-8 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
  {coverImageUrl ? (
    <img
      src={coverImageUrl}
      alt={`${displayName} portada`}
      className="h-56 w-full object-cover"
    />
  ) : (
    <div className="h-56 w-full bg-zinc-800" />
  )}

  <div className="px-6 pb-6">
    <div className="-mt-14 flex flex-col gap-4 sm:flex-row sm:items-end">
      {profileImageUrl ? (
        <img
          src={profileImageUrl}
          alt={displayName}
          className="h-28 w-28 rounded-full border-4 border-zinc-900 object-cover"
        />
      ) : (
        <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-zinc-900 bg-zinc-800 text-3xl font-bold text-violet-400">
          {displayName.charAt(0)}
        </div>
      )}

      <div className="pb-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
          {categoryName}
        </p>

        <h1 className="mt-2 text-4xl font-bold">{displayName}</h1>

        {artist.artistName && artist.fullName && (
          <p className="mt-1 text-zinc-400">{artist.fullName}</p>
        )}

        {artist.location && (
          <p className="mt-1 text-zinc-400">{artist.location}</p>
        )}
      </div>
    </div>

    {artist.bio && (
      <p className="mt-6 max-w-3xl leading-8 text-zinc-300">{artist.bio}</p>
    )}
  </div>
</div>

        <div className="mt-12">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
              Portafolio
            </p>
            <h2 className="mt-2 text-2xl font-bold">Obras destacadas</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {artist.portfolioItems.map((item) => (
              <PortfolioItemCard
                key={item.id}
                id={item.id}
                title={item.title}
                description={item.description}
                mediaType={item.mediaType}
                mediaUrl={item.mediaUrl}
                thumbnailUrl={item.thumbnailUrl}
                artistName={displayName}
                viewCount={item.viewCount}
                likeCount={item.likeCount}
              />
            ))}
          </div>
          <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
  <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
    Comisiones
  </p>
  <h2 className="mt-2 text-2xl font-bold">Solicitar un trabajo</h2>
  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
    Envia una solicitud al artista para iniciar una conversacion sobre una obra,
    colaboracion o servicio creativo.
  </p>

  <form className="mt-6 grid gap-4" onSubmit={handleCommissionSubmit}>
    {commissionStatus && (
      <p className="text-sm text-violet-300">{commissionStatus}</p>
    )}

    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="text-sm font-medium text-zinc-300">Tu nombre</label>
        <input
          type="text"
          name="clientName"
          value={commissionFormData.clientName}
          onChange={handleCommissionChange}
          required
          className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-zinc-300">Tu correo</label>
        <input
          type="email"
          name="clientEmail"
          value={commissionFormData.clientEmail}
          onChange={handleCommissionChange}
          required
          className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
        />
      </div>
    </div>

    <div>
      <label className="text-sm font-medium text-zinc-300">
        Presupuesto estimado
      </label>
      <input
        type="text"
        name="budget"
        value={commissionFormData.budget}
        onChange={handleCommissionChange}
        placeholder="Ej. L 2,500 o negociable"
        className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
      />
    </div>

    <div>
      <label className="text-sm font-medium text-zinc-300">Mensaje</label>
      <textarea
        name="message"
        value={commissionFormData.message}
        onChange={handleCommissionChange}
        required
        rows="4"
        className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
      />
    </div>

    <button
      type="submit"
      disabled={isSendingCommission}
      className="rounded-md bg-violet-400 px-5 py-3 font-semibold text-zinc-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isSendingCommission ? 'Enviando...' : 'Enviar solicitud'}
    </button>
  </form>
</section>
        </div>
      </section>
    </main>
  )
}

export default ArtistDetailPage
