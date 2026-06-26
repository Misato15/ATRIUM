import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import { API_URL } from '../config/api'
import { getAuthToken } from '../utils/auth'
import { getDigitalProductDownloadUrl } from '../utils/uploads'

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.message || 'No se pudo completar la accion')
  }

  return data
}

function getArtistDisplayName(profile) {
  return profile?.artistName || profile?.fullName || 'Artista'
}

function getProductPreview(product) {
  return (
    product?.assets?.find((asset) => asset.kind === 'PREVIEW')?.url ||
    product?.coverImageUrl ||
    getYoutubeThumbnailUrl(product?.previewVideoUrl) ||
    ''
  )
}

function getYoutubeId(url) {
  return String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&/]+)/)?.[1] || ''
}

function getYoutubeEmbedUrl(url) {
  const id = getYoutubeId(url)
  return id ? `https://www.youtube.com/embed/${id}` : ''
}

function getYoutubeThumbnailUrl(url) {
  const id = getYoutubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : ''
}

function formatBytes(bytes) {
  const size = Number(bytes)

  if (!Number.isFinite(size) || size <= 0) {
    return 'No indicado'
  }

  if (size < 1024 * 1024) {
    return `${Math.ceil(size / 1024)} KB`
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function DigitalProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const token = getAuthToken()
  const [product, setProduct] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isBuying, setIsBuying] = useState(false)
  const [downloadingAssetId, setDownloadingAssetId] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')

  const purchase = useMemo(
    () =>
      purchases.find(
        (currentPurchase) =>
          currentPurchase.digitalProductId === Number(product?.id),
      ),
    [product?.id, purchases],
  )

  const downloadAssets = useMemo(
    () =>
      purchase?.digitalProduct?.assets?.filter(
        (asset) => asset.kind === 'DOWNLOAD',
      ) || [],
    [purchase],
  )

  const preview = getProductPreview(product)
  const youtubeEmbedUrl = getYoutubeEmbedUrl(product?.previewVideoUrl)
  const totalSize = downloadAssets.reduce(
    (sum, asset) => sum + (Number(asset.size) || 0),
    0,
  )

  useEffect(() => {
    loadProduct()
  }, [id])

  async function loadProduct() {
    setIsLoading(true)
    setStatusMessage('')

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const [publishedProduct, ownedPurchases] = await Promise.all([
        fetchJson(`${API_URL}/digital-products/products/${id}`),
        token
          ? fetchJson(`${API_URL}/digital-products/purchases/me`, {
              headers,
            }).catch(() => [])
          : Promise.resolve([]),
      ])

      setProduct(publishedProduct)
      setPurchases(ownedPurchases)
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleBuyProduct() {
    setIsBuying(true)
    setStatusMessage('')

    try {
      if (!token) {
        navigate('/login')
        return
      }

      const currentPurchase = await fetchJson(
        `${API_URL}/digital-products/${product.id}/checkout`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (currentPurchase.status === 'PAID') {
        setStatusMessage('Ya tienes este producto en tu biblioteca')
        await loadProduct()
        return
      }

      if (!currentPurchase.providerOrderId) {
        throw new Error('No se pudo generar la orden de PayPal')
      }

      navigate(`/marketplace/checkout/${currentPurchase.providerOrderId}`)
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setIsBuying(false)
    }
  }

  async function handleDownload(asset) {
    setDownloadingAssetId(asset.id)
    setStatusMessage('')

    try {
      const downloadUrl = await getDigitalProductDownloadUrl(
        purchase.id,
        asset.id,
      )
      window.open(downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setDownloadingAssetId(null)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
        <section className="mx-auto max-w-6xl text-zinc-400">
          Cargando producto...
        </section>
      </main>
    )
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
        <section className="mx-auto max-w-6xl">
          <Link to="/marketplace" className="text-sm font-semibold text-violet-400">
            Volver al marketplace
          </Link>
          <p className="mt-6 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {statusMessage || 'Producto no disponible'}
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <Link to="/marketplace" className="text-sm font-semibold text-violet-400">
          Volver al marketplace
        </Link>

        {statusMessage && (
          <p className="mt-6 rounded-md border border-violet-400/30 bg-violet-400/10 p-3 text-sm text-violet-200">
            {statusMessage}
          </p>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <article className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
            {youtubeEmbedUrl ? (
              <iframe
                src={youtubeEmbedUrl}
                title={product.title}
                className="h-80 w-full md:h-[460px]"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : preview ? (
              <img
                src={preview}
                alt={product.title}
                className="h-80 w-full object-cover md:h-[460px]"
              />
            ) : (
              <div className="flex h-80 items-center justify-center bg-zinc-800 text-zinc-500 md:h-[460px]">
                Sin preview
              </div>
            )}

            <div className="border-t border-zinc-800 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
                {getArtistDisplayName(product.artistProfile)}
              </p>
              <h1 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
                {product.title}
              </h1>
              <p className="mt-5 whitespace-pre-line text-sm leading-7 text-zinc-300">
                {product.description}
              </p>
            </div>
          </article>

          <aside className="h-fit rounded-lg border border-zinc-800 bg-zinc-900 p-5 lg:sticky lg:top-6">
            <p className="text-sm font-semibold uppercase text-zinc-500">
              Producto digital
            </p>
            <p className="mt-3 text-3xl font-bold">
              {product.price} {product.currency}
            </p>

            {purchase ? (
              <div className="mt-5">
                <p className="rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-200">
                  Comprado. Descargas disponibles.
                </p>
                <div className="mt-3 grid gap-2">
                  {downloadAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      disabled={downloadingAssetId === asset.id}
                      onClick={() => handleDownload(asset)}
                      className="truncate rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-3 text-left text-sm font-semibold text-emerald-200 disabled:opacity-60"
                    >
                      {downloadingAssetId === asset.id
                        ? 'Preparando...'
                        : `Descargar ${asset.name || 'archivo'}`}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <Button
                className="mt-5 w-full"
                disabled={isBuying}
                onClick={handleBuyProduct}
              >
                {isBuying ? 'Creando orden...' : 'Comprar'}
              </Button>
            )}

            <div className="mt-6 divide-y divide-zinc-800 rounded-md border border-zinc-800">
              <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="font-semibold text-zinc-400">Archivos</span>
                <span>{downloadAssets.length || 'Privados'}</span>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="font-semibold text-zinc-400">Tamano</span>
                <span>{formatBytes(totalSize)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="font-semibold text-zinc-400">Acceso</span>
                <span>Descarga firmada</span>
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-zinc-500">
              Los archivos descargables se desbloquean despues del pago y el
              backend valida la compra antes de generar el enlace.
            </p>
          </aside>
        </div>
      </section>
    </main>
  )
}

export default DigitalProductDetailPage
