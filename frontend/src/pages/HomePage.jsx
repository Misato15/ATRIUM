import { useEffect, useState } from 'react'
import ArtistCard from '../components/ArtistCard'
import Button from '../components/Button'
import PortfolioItemCard from '../components/PortfolioItemCard'
import { Link } from 'react-router-dom'
import { API_URL } from '../config/api'
import { isAuthenticated } from '../utils/auth'


function getArtistDisplayName(artist) {
  return artist.artistName || artist.fullName || 'Artista sin nombre'
}

function HomePage() {
  const [artists, setArtists] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [portfolioItems, setPortfolioItems] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const profileLink = isAuthenticated() ? '/dashboard' : '/register'

  useEffect(() => {
    async function loadHomePageData() {
      try {
        const [artistsResponse, portfolioResponse, categoriesResponse] =
    await Promise.all([
    fetch(`${API_URL}/artists`),
    fetch(`${API_URL}/portfolio`),
    fetch(`${API_URL}/artist-categories`),
  ])

        if (!artistsResponse.ok || !portfolioResponse.ok || !categoriesResponse.ok) {
          throw new Error('No se pudieron cargar los datos de inicio')
        }

        const artistsData = await artistsResponse.json()
        const portfolioData = await portfolioResponse.json()
        const categoriesData = await categoriesResponse.json()
        setCategories(categoriesData)

        setArtists(artistsData)
        setPortfolioItems(portfolioData)
      } catch (error) {
        setError(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadHomePageData()
  }, [])
  const filteredArtists =
  selectedCategory === 'all'
    ? artists
    : artists.filter((artist) => artist.category?.slug === selectedCategory)
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-violet-400">
          Atrium
        </p>

        <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
          Una plataforma de portafolios para artistas y creativos.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
          Crea un perfil, muestra obras multimedia, promociona eventos y recibe solicitudes de comision.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#artists">
            <Button>Explorar artistas</Button>
          </a>

          <Link to={profileLink}>
            <Button variant="secondary">Crear perfil</Button>
          </Link>
        </div>
        {!isLoading && !error && (
  <div className="mt-10 flex flex-wrap gap-2">
    <button
      type="button"
      onClick={() => setSelectedCategory('all')}
      className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
        selectedCategory === 'all'
          ? 'border-violet-400 bg-violet-400 text-zinc-950'
          : 'border-zinc-700 text-zinc-300 hover:border-violet-400'
      }`}
    >
      Todos
    </button>

    {categories.map((category) => (
      <button
        key={category.id}
        type="button"
        onClick={() => setSelectedCategory(category.slug)}
        className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
          selectedCategory === category.slug
            ? 'border-violet-400 bg-violet-400 text-zinc-950'
            : 'border-zinc-700 text-zinc-300 hover:border-violet-400'
        }`}
      >
        {category.name}
      </button>
    ))}
  </div>
)}
        <div id="artists" className="mt-12 grid gap-4 sm:grid-cols-3">
          {isLoading && <p className="text-zinc-400">Cargando artistas...</p>}

          {error && <p className="text-red-400">{error}</p>}

          {!isLoading &&
            !error &&
            filteredArtists.map((artist) => (
              <ArtistCard
                key={artist.id}
                id={artist.id}
                name={getArtistDisplayName(artist)}
                category={artist.category?.name || 'Sin categoria'}
                location={artist.location}
                imageUrl={artist.coverImageUrl || artist.profileImageUrl}
              />
            ))}

            {!isLoading && !error && filteredArtists.length === 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 text-zinc-400 sm:col-span-3">
                No hay artistas registrados en esta categoria todavia.
              </div>
            )}
            
        </div>

        {!isLoading && !error && (
          <div className="mt-16">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
                Obras destacadas
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Portafolio destacado
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {portfolioItems.map((item) => (
                <PortfolioItemCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  description={item.description}
                  mediaType={item.mediaType}
                  mediaUrl={item.mediaUrl}
                  thumbnailUrl={item.thumbnailUrl}
                  artistName={getArtistDisplayName(item.artistProfile)}
                  viewCount={item.viewCount}
                  likeCount={item.likeCount}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default HomePage
