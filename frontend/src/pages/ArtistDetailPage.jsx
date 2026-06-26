import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PortfolioItemCard from '../components/PortfolioItemCard'
import { API_URL } from '../config/api'
import { getAuthToken } from '../utils/auth'
import { uploadAttachments } from '../utils/uploads'

function getArtistDisplayName(artist) {
  return artist.artistName || artist.fullName || 'Artista sin nombre'
}

function getServiceModeLabel(serviceMode) {
  const labels = {
    ONLINE: 'Online',
    IN_PERSON: 'Presencial',
    BOTH: 'Online y presencial',
  }

  return labels[serviceMode] || 'Online'
}

function formatDateForDisplay(dateValue) {
  if (!dateValue) {
    return ''
  }

  const [year, month, day] = dateValue.split('-')

  if (!year || !month || !day) {
    return ''
  }

  return `${day}/${month}/${year.slice(-2)}`
}

function ArtistDetailPage() {
  const { id } = useParams()
  const deadlineDateInputRef = useRef(null)
  const [artist, setArtist] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [commissionFormData, setCommissionFormData] = useState({
  projectTitle: '',
  serviceMode: 'ONLINE',
  budgetMin: '',
  budgetMax: '',
  desiredDeadline: '',
  isFlexibleDeadline: false,
  message: '',
  referenceAttachments: [],
})
const [commissionStatus, setCommissionStatus] = useState('')
const [commissionUploadStatus, setCommissionUploadStatus] = useState('')
const [isSendingCommission, setIsSendingCommission] = useState(false)
const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false)

function openDeadlinePicker() {
  const dateInput = deadlineDateInputRef.current

  if (!dateInput) {
    return
  }

  if (typeof dateInput.showPicker === 'function') {
    dateInput.showPicker()
    return
  }

  dateInput.click()
}

function handleCommissionChange(event) {
  const { name, value, type, checked } = event.target

  setCommissionFormData({
    ...commissionFormData,
    [name]: type === 'checkbox' ? checked : value,
  })
}

async function handleCommissionReferenceUpload(event) {
  const files = Array.from(event.target.files || [])

  if (files.length === 0) {
    return
  }

  setCommissionUploadStatus('Subiendo referencias...')

  try {
    const uploadedAttachments = await uploadAttachments(files)

    setCommissionFormData((currentData) => ({
      ...currentData,
      referenceAttachments: [
        ...currentData.referenceAttachments,
        ...uploadedAttachments,
      ],
    }))
    setCommissionUploadStatus('Referencias adjuntadas')
  } catch (error) {
    setCommissionUploadStatus(error.message)
  } finally {
    event.target.value = ''
  }
}

async function handleCommissionSubmit(event) {
  event.preventDefault()
  setCommissionStatus('')
  setIsSendingCommission(true)

  try {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Debes iniciar sesion para solicitar una comision')
    }

    const response = await fetch(
      `${API_URL}/commissions/artists/${artist.id}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(commissionFormData),
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'No se pudo enviar la solicitud')
    }

    setCommissionFormData({
      projectTitle: '',
      serviceMode: 'ONLINE',
      budgetMin: '',
      budgetMax: '',
      desiredDeadline: '',
      isFlexibleDeadline: false,
      message: '',
      referenceAttachments: [],
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
  const reviews = artist.reviews || []
  const publicReviews = reviews.filter((review) => review.isPublic && review.comment)
  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        ).toFixed(1)
      : null
  const hasAuthToken = Boolean(getAuthToken())

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

        {averageRating && (
          <p className="mt-3 text-sm font-semibold text-violet-300">
            {averageRating}/5 · {reviews.length} reviews
          </p>
        )}
      </div>

      <div className="pb-2 sm:ml-auto">
        <button
          type="button"
          onClick={() => {
            setCommissionStatus('')
            setIsCommissionModalOpen(true)
          }}
          className="rounded-md bg-violet-400 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-violet-300"
        >
          Solicitar comision
        </button>
      </div>
    </div>

    {artist.bio && (
      <p className="mt-6 max-w-3xl leading-8 text-zinc-300">{artist.bio}</p>
    )}

    {(artist.serviceDescription ||
      artist.commissionTypes ||
      artist.startingPrice ||
      artist.servicePriceRange ||
      artist.serviceArea) && (
      <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
          Servicios
        </p>

        {artist.serviceDescription && (
          <p className="mt-3 leading-7 text-zinc-300">
            {artist.serviceDescription}
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {artist.startingPrice && (
            <div>
              <p className="text-xs uppercase text-zinc-500">Desde</p>
              <p className="mt-1 font-semibold text-white">
                {artist.startingPrice}
              </p>
            </div>
          )}

          {artist.servicePriceRange && (
            <div>
              <p className="text-xs uppercase text-zinc-500">Rango</p>
              <p className="mt-1 font-semibold text-white">
                {artist.servicePriceRange}
              </p>
            </div>
          )}

          {/* ponytail: modality flow is parked until onsite/remote projects have their own rules.
          <div>
            <p className="text-xs uppercase text-zinc-500">Modalidad</p>
            <p className="mt-1 font-semibold text-white">
              {getServiceModeLabel(artist.serviceMode)}
            </p>
          </div> */}

          {artist.serviceArea && (
            <div>
              <p className="text-xs uppercase text-zinc-500">Zona</p>
              <p className="mt-1 font-semibold text-white">
                {artist.serviceArea}
              </p>
            </div>
          )}
        </div>

        {artist.commissionTypes && (
          <p className="mt-4 text-sm leading-6 text-zinc-400">
            {artist.commissionTypes}
          </p>
        )}
      </div>
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
                assets={item.assets}
                artistName={displayName}
                viewCount={item.viewCount}
                likeCount={item.likeCount}
              />
            ))}
          </div>
          <section className="mt-10">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
                Reviews
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Opiniones de clientes
              </h2>
            </div>

            {publicReviews.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {publicReviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 p-5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-bold text-white">
                        {review.clientName}
                      </h3>
                      <span className="rounded-md border border-violet-400/40 bg-violet-400/10 px-3 py-1 text-sm font-bold text-violet-200">
                        {review.rating}/5
                      </span>
                    </div>
                    <p className="mt-4 whitespace-pre-line text-sm leading-6 text-zinc-300">
                      {review.comment}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-700 p-6 text-sm text-zinc-400">
                Este artista aun no tiene comentarios publicos aprobados.
              </div>
            )}
          </section>
        </div>
      </section>

      {isCommissionModalOpen && (
        <div className="dialog-motion fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
                  Comisiones
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  Solicitar un trabajo
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  Envia una solicitud a {displayName} para iniciar una
                  conversacion sobre una obra, colaboracion o servicio creativo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCommissionModalOpen(false)}
                aria-label="Cerrar"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 transition hover:border-violet-400 hover:text-violet-300"
              >
                x
              </button>
            </div>

            {!hasAuthToken && (
              <div className="mt-6 rounded-lg border border-violet-400/30 bg-violet-400/10 p-4 text-sm text-violet-100">
                Para solicitar una comision debes iniciar sesion. Esto protege
                al artista y deja registro de quien crea la solicitud.
                <div className="mt-3 flex gap-3">
                  <Link to="/login" className="font-semibold text-violet-200">
                    Iniciar sesion
                  </Link>
                  <Link
                    to="/register"
                    className="font-semibold text-violet-200"
                  >
                    Crear cuenta
                  </Link>
                </div>
              </div>
            )}

            <form className="mt-6 grid gap-4" onSubmit={handleCommissionSubmit}>
              {commissionStatus && (
                <p className="rounded-md border border-violet-400/30 bg-violet-400/10 p-3 text-sm text-violet-200">
                  {commissionStatus}
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-zinc-300">
                    Titulo del proyecto
                  </label>
                  <input
                    type="text"
                    name="projectTitle"
                    value={commissionFormData.projectTitle}
                    onChange={handleCommissionChange}
                    placeholder="Ej. Ilustracion para portada"
                    className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                  />
                </div>

                {/* ponytail: keep backend default serviceMode, hide choice until this flow is defined.
                <div>
                  <label className="text-sm font-medium text-zinc-300">
                    Modalidad
                  </label>
                  <select
                    name="serviceMode"
                    value={commissionFormData.serviceMode}
                    onChange={handleCommissionChange}
                    className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                  >
                    <option value="ONLINE">Online</option>
                    <option value="IN_PERSON">Presencial</option>
                    <option value="BOTH">Online y presencial</option>
                  </select>
                </div> */}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-zinc-300">
                    Presupuesto minimo
                  </label>
                  <input
                    type="text"
                    name="budgetMin"
                    value={commissionFormData.budgetMin}
                    onChange={handleCommissionChange}
                    placeholder="Ej. 1500"
                    className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-300">
                    Presupuesto maximo
                  </label>
                  <input
                    type="text"
                    name="budgetMax"
                    value={commissionFormData.budgetMax}
                    onChange={handleCommissionChange}
                    placeholder="Ej. 3000"
                    className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-300">
                    Fecha deseada
                  </label>
                  <div className="relative mt-2">
                    <input
                      type="text"
                      value={formatDateForDisplay(
                        commissionFormData.desiredDeadline,
                      )}
                      onClick={openDeadlinePicker}
                      readOnly
                      placeholder="dd/mm/yy"
                      className="w-full cursor-pointer rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 pr-12 text-white outline-none focus:border-violet-400"
                    />

                    <button
                      type="button"
                      onClick={openDeadlinePicker}
                      title="Abrir calendario"
                      aria-label="Abrir calendario"
                      className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-violet-300"
                    >
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 2v4" />
                        <path d="M16 2v4" />
                        <rect width="18" height="18" x="3" y="4" rx="2" />
                        <path d="M3 10h18" />
                      </svg>
                    </button>

                    <input
                      ref={deadlineDateInputRef}
                      type="date"
                      name="desiredDeadline"
                      value={commissionFormData.desiredDeadline}
                      onChange={handleCommissionChange}
                      className="pointer-events-none absolute right-3 top-1/2 h-7 w-7 -translate-y-1/2 opacity-0"
                      tabIndex="-1"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  name="isFlexibleDeadline"
                  checked={commissionFormData.isFlexibleDeadline}
                  onChange={handleCommissionChange}
                  className="h-4 w-4 accent-violet-400"
                />
                Mi fecha de entrega es flexible
              </label>

              <div>
                <label className="text-sm font-medium text-zinc-300">
                  Mensaje
                </label>
                <textarea
                  name="message"
                  value={commissionFormData.message}
                  onChange={handleCommissionChange}
                  required
                  rows="4"
                  placeholder="Describe el trabajo, referencias, uso final y formato esperado."
                  className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                />
              </div>

              <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      Referencias
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Imagenes, PDF o archivos que ayuden al artista.
                    </p>
                  </div>
                  <label className="cursor-pointer rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-violet-400 hover:text-violet-200">
                    Adjuntar archivos
                    <input
                      type="file"
                      multiple
                      onChange={handleCommissionReferenceUpload}
                      className="sr-only"
                    />
                  </label>
                </div>
                {commissionUploadStatus && (
                  <p className="mt-3 text-sm text-violet-300">
                    {commissionUploadStatus}
                  </p>
                )}
                {commissionFormData.referenceAttachments.length > 0 && (
                  <div className="mt-3 grid gap-2 text-sm text-zinc-300">
                    {commissionFormData.referenceAttachments.map(
                      (attachment) => (
                        <a
                          key={attachment.url}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate rounded border border-zinc-800 bg-zinc-900 px-3 py-2 hover:border-violet-400"
                        >
                          {attachment.name || attachment.url}
                        </a>
                      ),
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCommissionModalOpen(false)}
                  className="rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-violet-400 hover:text-violet-200"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSendingCommission || !hasAuthToken}
                  className="rounded-md bg-violet-400 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSendingCommission ? 'Enviando...' : 'Enviar solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

export default ArtistDetailPage
