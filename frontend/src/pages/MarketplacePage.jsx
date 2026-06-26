import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { API_URL } from '../config/api'
import { getAuthToken, getAuthUser, isAuthenticated } from '../utils/auth'
import {
  getDigitalProductDownloadUrl,
  uploadAttachments,
  uploadDigitalProductFile,
  uploadImage,
} from '../utils/uploads'

const initialProductFormData = {
  title: '',
  description: '',
  price: '',
  currency: 'USD',
  coverImageUrl: '',
  previewVideoUrl: '',
  status: 'DRAFT',
  previewAssets: [],
  downloadAssets: [],
}

function getArtistDisplayName(profile) {
  return profile?.artistName || profile?.fullName || 'Artista'
}

function getProductStatusLabel(status) {
  const labels = {
    DRAFT: 'Borrador',
    PUBLISHED: 'Publicado',
    ARCHIVED: 'Archivado',
  }

  return labels[status] || status
}

function getProductPreview(product) {
  return (
    product.assets?.find((asset) => asset.kind === 'PREVIEW')?.url ||
    product.coverImageUrl ||
    getYoutubeThumbnailUrl(product.previewVideoUrl) ||
    ''
  )
}

function getYoutubeId(url) {
  return String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&/]+)/)?.[1] || ''
}

function getYoutubeThumbnailUrl(url) {
  const id = getYoutubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : ''
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.message || 'No se pudo completar la accion')
  }

  return data
}

function MarketplacePage() {
  const navigate = useNavigate()
  const authUser = getAuthUser()
  const token = getAuthToken()
  const loggedIn = isAuthenticated()
  const isArtist = Boolean(authUser?.profile)
  const [products, setProducts] = useState([])
  const [myProducts, setMyProducts] = useState([])
  const [purchases, setPurchases] = useState([])
  const [productFormData, setProductFormData] = useState(initialProductFormData)
  const [editingProductId, setEditingProductId] = useState(null)
  const [isProductFormOpen, setIsProductFormOpen] = useState(false)
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const [buyingProductId, setBuyingProductId] = useState(null)
  const [downloadingAssetId, setDownloadingAssetId] = useState(null)

  const paidProductIds = useMemo(
    () => new Set(purchases.map((purchase) => purchase.digitalProductId)),
    [purchases],
  )

  useEffect(() => {
    loadMarketplace()
  }, [])

  async function loadMarketplace() {
    setIsLoading(true)
    setStatusMessage('')

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const [publishedProducts, ownedProducts, ownedPurchases] =
        await Promise.all([
          fetchJson(`${API_URL}/digital-products`),
          token
            ? fetchJson(`${API_URL}/digital-products/me`, { headers }).catch(
                () => [],
              )
            : Promise.resolve([]),
          token
            ? fetchJson(`${API_URL}/digital-products/purchases/me`, {
                headers,
              }).catch(() => [])
            : Promise.resolve([]),
        ])

      setProducts(publishedProducts)
      setMyProducts(ownedProducts)
      setPurchases(ownedPurchases)
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleProductFormChange(event) {
    const { name, value } = event.target

    setProductFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }))
  }

  function openProductForm(product = null) {
    setEditingProductId(product?.id || null)
    setProductFormData(
      product
        ? {
            title: product.title || '',
            description: product.description || '',
            price: product.price || '',
            currency: product.currency || 'USD',
            coverImageUrl: product.coverImageUrl || '',
            previewVideoUrl: product.previewVideoUrl || '',
            status: product.status || 'DRAFT',
            previewAssets:
              product.assets?.filter((asset) => asset.kind === 'PREVIEW') || [],
            downloadAssets:
              product.assets?.filter((asset) => asset.kind === 'DOWNLOAD') || [],
          }
        : initialProductFormData,
    )
    setUploadStatus('')
    setIsProductFormOpen(true)
  }

  function removeProductAsset(field, url) {
    setProductFormData((currentData) => ({
      ...currentData,
      [field]: currentData[field].filter((asset) => asset.url !== url),
    }))
  }

  async function handlePreviewUpload(event) {
    const files = Array.from(event.target.files || [])

    if (files.length === 0) {
      return
    }

    setUploadStatus('Subiendo previews...')

    try {
      const uploadedAssets = await uploadAttachments(files, uploadImage)
      setProductFormData((currentData) => ({
        ...currentData,
        coverImageUrl: currentData.coverImageUrl || uploadedAssets[0]?.url || '',
        previewAssets: [...currentData.previewAssets, ...uploadedAssets],
      }))
      setUploadStatus('Previews adjuntados')
    } catch (error) {
      setUploadStatus(error.message)
    } finally {
      event.target.value = ''
    }
  }

  async function handleDownloadUpload(event) {
    const files = Array.from(event.target.files || [])

    if (files.length === 0) {
      return
    }

    setUploadStatus('Subiendo descargables privados...')

    try {
      const uploadedAssets = await uploadAttachments(
        files,
        uploadDigitalProductFile,
      )
      setProductFormData((currentData) => ({
        ...currentData,
        downloadAssets: [...currentData.downloadAssets, ...uploadedAssets],
      }))
      setUploadStatus('Descargables adjuntados')
    } catch (error) {
      setUploadStatus(error.message)
    } finally {
      event.target.value = ''
    }
  }

  async function handleCreateProduct(event) {
    event.preventDefault()
    setIsSavingProduct(true)
    setStatusMessage('')

    try {
      if (!token) {
        throw new Error('Debes iniciar sesion para crear productos')
      }

      const payload = {
        ...productFormData,
        coverImageUrl:
          productFormData.coverImageUrl ||
          productFormData.previewAssets[0]?.url ||
          '',
      }

      await fetchJson(`${API_URL}/digital-products${editingProductId ? `/${editingProductId}` : ''}`, {
        method: editingProductId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      setProductFormData(initialProductFormData)
      setEditingProductId(null)
      setIsProductFormOpen(false)
      setUploadStatus('')
      setStatusMessage('Producto guardado')
      await loadMarketplace()
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setIsSavingProduct(false)
    }
  }

  async function handleBuyProduct(product) {
    setBuyingProductId(product.id)
    setStatusMessage('')

    try {
      if (!token) {
        navigate('/login')
        return
      }

      const purchase = await fetchJson(
        `${API_URL}/digital-products/${product.id}/checkout`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (purchase.status === 'PAID') {
        setStatusMessage('Ya tienes este producto en tu biblioteca')
        await loadMarketplace()
        return
      }

      if (!purchase.providerOrderId) {
        throw new Error('No se pudo generar la orden de PayPal')
      }

      navigate(`/marketplace/checkout/${purchase.providerOrderId}`)
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setBuyingProductId(null)
    }
  }

  async function handleDownloadPurchase(purchase, asset) {
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

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-violet-400">
              Marketplace
            </p>
            <h1 className="mt-2 text-3xl font-bold">Recursos digitales</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Compra y vende pinceles, partituras, presets, PDFs, plantillas y
              packs descargables creados por artistas de Atrium.
            </p>
          </div>

          {isArtist && (
            <Button onClick={() => openProductForm()}>
              Crear producto
            </Button>
          )}
        </div>

        {statusMessage && (
          <p className="mt-6 rounded-md border border-violet-400/30 bg-violet-400/10 p-3 text-sm text-violet-200">
            {statusMessage}
          </p>
        )}

        {isProductFormOpen && (
          <form
            onSubmit={handleCreateProduct}
            className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">
                {editingProductId ? 'Editar producto digital' : 'Nuevo producto digital'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsProductFormOpen(false)
                  setEditingProductId(null)
                  setProductFormData(initialProductFormData)
                }}
                className="text-sm font-semibold text-zinc-400 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                name="title"
                value={productFormData.title}
                onChange={handleProductFormChange}
                placeholder="Titulo del producto"
                className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              />
              <input
                name="price"
                value={productFormData.price}
                onChange={handleProductFormChange}
                placeholder="Precio, ej. 12 USD"
                className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              />
              <select
                name="status"
                value={productFormData.status}
                onChange={handleProductFormChange}
                className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              >
                <option value="DRAFT">Borrador</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="ARCHIVED">Archivado</option>
              </select>
              <input
                name="coverImageUrl"
                value={productFormData.coverImageUrl}
                onChange={handleProductFormChange}
                placeholder="Cover URL opcional"
                className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              />
              <input
                name="previewVideoUrl"
                value={productFormData.previewVideoUrl}
                onChange={handleProductFormChange}
                placeholder="Link de YouTube opcional"
                className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              />
            </div>

            <textarea
              name="description"
              value={productFormData.description}
              onChange={handleProductFormChange}
              rows="4"
              placeholder="Describe que incluye, compatibilidad, licencia y uso permitido"
              className="mt-3 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <label className="cursor-pointer rounded-md border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-200 hover:border-violet-400">
                Subir previews
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePreviewUpload}
                  className="sr-only"
                />
              </label>
              <label className="cursor-pointer rounded-md border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-200 hover:border-violet-400">
                Subir descargables
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.zip,.rar,.7z,.abr,.psd,.ai,.eps,.svg,.mxl,.musicxml,.mid,.midi"
                  onChange={handleDownloadUpload}
                  className="sr-only"
                />
              </label>
            </div>

            {uploadStatus && (
              <p className="mt-3 text-sm text-violet-300">{uploadStatus}</p>
            )}

            {[
              ...productFormData.previewAssets,
              ...productFormData.downloadAssets,
            ].length > 0 && (
              <div className="mt-4 grid gap-2 text-sm text-zinc-300">
                {productFormData.previewAssets.map((asset) => (
                  <div
                    key={asset.url}
                    className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2"
                  >
                    <span className="truncate">Preview: {asset.name || asset.url}</span>
                    <button
                      type="button"
                      onClick={() => removeProductAsset('previewAssets', asset.url)}
                      className="shrink-0 text-xs font-semibold text-red-300"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
                {productFormData.downloadAssets.map((asset) => (
                  <div
                    key={asset.url}
                    className="flex items-center justify-between gap-3 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-emerald-200"
                  >
                    <span className="truncate">
                      Descargable privado: {asset.name || asset.url}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeProductAsset('downloadAssets', asset.url)}
                      className="shrink-0 text-xs font-semibold text-red-300"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button type="submit" disabled={isSavingProduct} className="mt-5">
              {isSavingProduct ? 'Guardando...' : 'Guardar producto'}
            </Button>
          </form>
        )}

        {isLoading ? (
          <p className="mt-8 text-zinc-400">Cargando marketplace...</p>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 text-zinc-400 md:col-span-2 lg:col-span-3">
                Todavia no hay productos publicados.
              </div>
            ) : (
              products.map((product) => {
                const preview = getProductPreview(product)
                const owned = paidProductIds.has(product.id)

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"
                  >
                    <Link to={`/marketplace/products/${product.id}`}>
                      {preview ? (
                        <img
                          src={preview}
                          alt={product.title}
                          className="h-44 w-full object-cover transition hover:opacity-80"
                        />
                      ) : (
                        <div className="h-44 bg-zinc-800" />
                      )}
                    </Link>
                    <div className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
                        {getArtistDisplayName(product.artistProfile)}
                      </p>
                      <Link
                        to={`/marketplace/products/${product.id}`}
                        className="mt-2 block text-xl font-bold hover:text-violet-300"
                      >
                        {product.title}
                      </Link>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">
                        {product.description}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-lg font-bold">
                          {product.price} {product.currency}
                        </p>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/marketplace/products/${product.id}`}
                            className="rounded-md border border-zinc-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                          >
                            Ver
                          </Link>
                          <Button
                            disabled={buyingProductId === product.id || owned}
                            onClick={() => handleBuyProduct(product)}
                          >
                            {owned
                              ? 'Comprado'
                              : buyingProductId === product.id
                                ? 'Creando orden...'
                                : 'Comprar'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        )}

        {loggedIn && (
          <section className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-xl font-bold">Mi biblioteca</h2>
              {purchases.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-400">
                  Tus compras digitales apareceran aqui.
                </p>
              ) : (
                <div className="mt-4 grid gap-4">
                  {purchases.map((purchase) => (
                    <div
                      key={purchase.id}
                      className="rounded-md border border-zinc-800 bg-zinc-950 p-4"
                    >
                      <h3 className="font-semibold">
                        {purchase.digitalProduct.title}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {purchase.amount} {purchase.currency}
                      </p>
                      <div className="mt-3 grid gap-2">
                        {purchase.digitalProduct.assets
                          ?.filter((asset) => asset.kind === 'DOWNLOAD')
                          .map((asset) => (
                            <button
                              key={asset.id}
                              type="button"
                              disabled={downloadingAssetId === asset.id}
                              onClick={() =>
                                handleDownloadPurchase(purchase, asset)
                              }
                              className="truncate rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-left text-sm font-semibold text-emerald-200 disabled:opacity-60"
                            >
                              {downloadingAssetId === asset.id
                                ? 'Preparando...'
                                : `Descargar ${asset.name || 'archivo'}`}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isArtist && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
                <h2 className="text-xl font-bold">Mis productos</h2>
                {myProducts.length === 0 ? (
                  <p className="mt-3 text-sm text-zinc-400">
                    Crea tu primer recurso descargable.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {myProducts.map((product) => (
                      <div
                        key={product.id}
                        className="rounded-md border border-zinc-800 bg-zinc-950 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold">{product.title}</h3>
                            <p className="mt-1 text-sm text-zinc-500">
                              {getProductStatusLabel(product.status)} ·{' '}
                              {product.purchases?.length || 0} ventas
                            </p>
                          </div>
                          <p className="font-bold">
                            {product.price} {product.currency}
                          </p>
                        </div>
                        <Button
                          className="mt-3"
                          variant="secondary"
                          onClick={() => openProductForm(product)}
                        >
                          Editar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {!loggedIn && (
          <p className="mt-8 text-sm text-zinc-500">
            <Link to="/login" className="font-semibold text-violet-400">
              Inicia sesion
            </Link>{' '}
            para comprar o vender productos digitales.
          </p>
        )}
      </section>
    </main>
  )
}

export default MarketplacePage
