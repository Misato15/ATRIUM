import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import { API_URL } from '../config/api'
import { getAuthToken, getAuthUser, isAuthenticated } from '../utils/auth'

const initialJobFormData = {
  title: '',
  description: '',
  categoryId: '',
  budgetMin: '',
  budgetMax: '',
  desiredDeadline: '',
  isFlexibleDeadline: false,
  serviceMode: 'ONLINE',
  location: '',
}

const initialApplicationFormData = {
  message: '',
  proposedPrice: '',
  estimatedTimeline: '',
  portfolioLinks: '',
}

const initialFilters = {
  categoryId: '',
  serviceMode: '',
  location: '',
  budget: '',
}

function formatDate(value) {
  if (!value) {
    return 'Sin fecha definida'
  }

  const isoMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return `${day}/${month}/${year}`
  }

  const date = new Date(value)

  return `${String(date.getDate()).padStart(2, '0')}/${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}/${date.getFullYear()}`
}

function formatDateForInput(value) {
  if (!value) return ''

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : ''
}
function parseInputDate(value) {
  if (!value) {
    return null
  }

  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (!match) {
    return null
  }

  const [, day, month, year] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))

  if (
    date.getDate() !== Number(day) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getFullYear() !== Number(year)
  ) {
    return null
  }

  return date
}

function isPastDate(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return date < today
}

function toApiDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`
}

function getStatusLabel(status) {
  const labels = {
    OPEN: 'Abierta',
    IN_REVIEW: 'Recibiendo aplicaciones',
    PAUSED: 'Pausada',
    ASSIGNED: 'Asignada',
    CLOSED: 'Cerrada',
    PENDING: 'Pendiente',
    SHORTLISTED: 'Preseleccionada',
    ACCEPTED: 'Aceptada',
    REJECTED: 'Rechazada',
    WITHDRAWN: 'Retirada',
  }

  return labels[status] || status
}

function getServiceModeLabel(serviceMode) {
  const labels = {
    ONLINE: 'Online',
    IN_PERSON: 'Presencial',
    BOTH: 'Online o presencial',
  }

  return labels[serviceMode] || 'Modalidad abierta'
}

function parseBudgetNumber(value) {
  const normalizedValue = String(value || '').replace(/[^\d.]/g, '')

  if (!normalizedValue) {
    return null
  }

  const number = Number(normalizedValue)
  return Number.isNaN(number) ? null : number
}

function validateBudgetRange(budgetMin, budgetMax) {
  const min = parseBudgetNumber(budgetMin)
  const max = parseBudgetNumber(budgetMax)

  if (budgetMin.trim() && min === null) {
    throw new Error('El presupuesto minimo debe ser numerico')
  }

  if (budgetMax.trim() && max === null) {
    throw new Error('El presupuesto maximo debe ser numerico')
  }

  if (min !== null && max !== null && max < min) {
    throw new Error('El presupuesto maximo no puede ser menor que el minimo')
  }
}

function validateAmount(value, message) {
  if (parseBudgetNumber(value) === null) {
    throw new Error(message)
  }
}

function getJobBudgetLabel(jobPost) {
  if (!jobPost?.budgetMin && !jobPost?.budgetMax) {
    return 'Presupuesto abierto'
  }

  return `${jobPost.budgetMin || '0'} - ${jobPost.budgetMax || 'abierto'}`
}

function getClientProposedPrice(jobPost) {
  return jobPost?.budgetMax || jobPost?.budgetMin || ''
}

function JobsPage() {
  const loggedIn = isAuthenticated()
  const token = getAuthToken()
  const authUser = getAuthUser()
  const isArtist = Boolean(authUser?.profile)
  const canPublishJobs = loggedIn

  const [jobPosts, setJobPosts] = useState([])
  const [myJobPosts, setMyJobPosts] = useState([])
  const [myApplications, setMyApplications] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedJobPostId, setSelectedJobPostId] = useState(null)
  const [jobFormData, setJobFormData] = useState(initialJobFormData)
  const [isJobFormOpen, setIsJobFormOpen] = useState(false)
  const [editingJobPostId, setEditingJobPostId] = useState(null)
  const [filters, setFilters] = useState(initialFilters)
  const [applicationFormData, setApplicationFormData] = useState(
    initialApplicationFormData,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingJob, setIsSavingJob] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [updatingApplicationId, setUpdatingApplicationId] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')

  const selectedJobPost = jobPosts.find(
    (jobPost) => jobPost.id === selectedJobPostId,
  )
  const selectedJobPostBelongsToCurrentUser =
    selectedJobPost?.clientUser?.id === authUser?.id
  const canApplyToSelectedJobPost =
    isArtist && selectedJobPost && !selectedJobPostBelongsToCurrentUser
  const selectedJobApplication = selectedJobPost
    ? myApplications.find(
        (application) => application.jobPostId === selectedJobPost.id,
      )
    : null
  const selectedActiveJobApplication =
    selectedJobApplication?.status === 'WITHDRAWN'
      ? null
      : selectedJobApplication
  const filteredJobPosts = jobPosts.filter((jobPost) => {
    const wantedBudget = parseBudgetNumber(filters.budget)
    const minBudget = parseBudgetNumber(jobPost.budgetMin)
    const maxBudget = parseBudgetNumber(jobPost.budgetMax)

    return (
      (!filters.categoryId ||
        String(jobPost.categoryId || '') === filters.categoryId) &&
      (!filters.serviceMode || jobPost.serviceMode === filters.serviceMode) &&
      (!filters.location ||
        jobPost.location?.toLowerCase().includes(filters.location.toLowerCase())) &&
      (!wantedBudget ||
        ((!minBudget || wantedBudget >= minBudget) &&
          (!maxBudget || wantedBudget <= maxBudget)))
    )
  })

  useEffect(() => {
    loadJobsData()
  }, [])

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'No se pudo completar la accion')
    }

    return response.json()
  }

  async function loadJobsData() {
    setIsLoading(true)
    setError('')

    try {
      const [jobPostsData, categoriesData] = await Promise.all([
        fetchJson(`${API_URL}/job-posts`),
        fetchJson(`${API_URL}/artist-categories`),
      ])

      setJobPosts(jobPostsData)
      setCategories(categoriesData)
      setSelectedJobPostId((currentId) =>
        jobPostsData.some((jobPost) => jobPost.id === currentId)
          ? currentId
          : null,
      )

      if (loggedIn && token) {
        const headers = {
          Authorization: `Bearer ${token}`,
        }

        setMyJobPosts(await fetchJson(`${API_URL}/job-posts/me`, { headers }))

        if (isArtist) {
          setMyApplications(
            await fetchJson(`${API_URL}/job-posts/applications/me`, {
              headers,
            }),
          )
        }
      }
    } catch (currentError) {
      setError(currentError.message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleJobFormChange(event) {
    const { name, type, checked, value } = event.target

    setJobFormData((currentData) => ({
      ...currentData,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleApplicationFormChange(event) {
    const { name, value } = event.target

    setApplicationFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }))
  }

  function handleFilterChange(event) {
    const { name, value } = event.target

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }))
  }

  async function handleCreateJobPost(event) {
    event.preventDefault()
    setStatusMessage('')
    setError('')
    setIsSavingJob(true)

    try {
      const desiredDeadline = jobFormData.desiredDeadline
  ? new Date(`${jobFormData.desiredDeadline}T00:00:00`)
  : null

      if (jobFormData.desiredDeadline && !desiredDeadline) {
        throw new Error('Usa una fecha valida en formato dd/mm/yyyy')
      }

      if (desiredDeadline && isPastDate(desiredDeadline)) {
        throw new Error('La fecha de entrega no puede estar en el pasado')
      }

      validateBudgetRange(jobFormData.budgetMin, jobFormData.budgetMax)
      const categoryId = jobFormData.categoryId
        ? Number(jobFormData.categoryId)
        : editingJobPostId
          ? null
          : undefined
    const apiDesiredDeadline = jobFormData.desiredDeadline || (editingJobPostId ? null : undefined)
      await fetchJson(`${API_URL}/job-posts${editingJobPostId ? `/${editingJobPostId}` : ''}`, {
        method: editingJobPostId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...jobFormData,
          categoryId,
          desiredDeadline: apiDesiredDeadline,
        }),
      })

      setJobFormData(initialJobFormData)
      setEditingJobPostId(null)
      setIsJobFormOpen(false)
      setStatusMessage(
        editingJobPostId
          ? 'Oferta actualizada correctamente'
          : 'Oferta publicada correctamente',
      )
      await loadJobsData()
    } catch (currentError) {
      setError(currentError.message)
    } finally {
      setIsSavingJob(false)
    }
  }

  function handleEditJobPost(jobPost) {
    setEditingJobPostId(jobPost.id)
    setJobFormData({
      title: jobPost.title || '',
      description: jobPost.description || '',
      categoryId: jobPost.categoryId || '',
      budgetMin: jobPost.budgetMin || '',
      budgetMax: jobPost.budgetMax || '',
      desiredDeadline: formatDateForInput(jobPost.desiredDeadline),
      isFlexibleDeadline: Boolean(jobPost.isFlexibleDeadline),
      serviceMode: jobPost.serviceMode || 'ONLINE',
      location: jobPost.location || '',
    })
    setIsJobFormOpen(true)
  }

  function handleCancelEditJobPost() {
    setEditingJobPostId(null)
    setJobFormData(initialJobFormData)
    setIsJobFormOpen(false)
  }

  async function handleUpdateJobPostStatus(jobPostId, status) {
    setStatusMessage('')
    setError('')

    try {
      await fetchJson(`${API_URL}/job-posts/${jobPostId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })

      setStatusMessage('Oferta actualizada')
      await loadJobsData()
    } catch (currentError) {
      setError(currentError.message)
    }
  }

  async function handleApply(event) {
    event.preventDefault()

    if (!selectedJobPost) {
      return
    }

    setStatusMessage('')
    setError('')
    setIsApplying(true)

    try {
      validateAmount(
        applicationFormData.proposedPrice,
        'El precio propuesto debe ser numerico',
      )

      await fetchJson(`${API_URL}/job-posts/${selectedJobPost.id}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(applicationFormData),
      })

      setApplicationFormData(initialApplicationFormData)
      setStatusMessage('Aplicacion enviada al cliente')
      await loadJobsData()
      setSelectedJobPostId(null)
    } catch (currentError) {
      setError(currentError.message)
    } finally {
      setIsApplying(false)
    }
  }

  function handleCloseJobPostModal() {
    setSelectedJobPostId(null)
    setApplicationFormData(initialApplicationFormData)
  }

  async function handleUpdateApplicationStatus(applicationId, status) {
    setStatusMessage('')
    setError('')
    setUpdatingApplicationId(applicationId)

    try {
      const updatedApplication = await fetchJson(
        `${API_URL}/job-posts/applications/${applicationId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        },
      )

      setStatusMessage(
        status === 'ACCEPTED'
          ? `Aplicacion aceptada. Comision #${updatedApplication.commissionRequest?.id || updatedApplication.commissionRequestId} creada en tu dashboard.`
          : 'Aplicacion actualizada',
      )
      await loadJobsData()
    } catch (currentError) {
      setError(currentError.message)
    } finally {
      setUpdatingApplicationId(null)
    }
  }

  async function handleWithdrawApplication(applicationId) {
    setStatusMessage('')
    setError('')
    setUpdatingApplicationId(applicationId)

    try {
      await fetchJson(`${API_URL}/job-posts/applications/${applicationId}/withdraw`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      setStatusMessage('Aplicacion retirada')
      await loadJobsData()
    } catch (currentError) {
      setError(currentError.message)
    } finally {
      setUpdatingApplicationId(null)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-white">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <section>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-violet-300">
                Bolsa de trabajo
              </p>
              <h1 className="mt-2 text-3xl font-bold">Ofertas creativas</h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Clientes publican necesidades claras y artistas aplican con
                precio, alcance y tiempos antes de iniciar una comision formal.
              </p>
            </div>

            {loggedIn ? (
              <Link
                to={isArtist ? '/dashboard' : '/client/dashboard'}
                className="text-sm font-semibold text-violet-300 hover:text-violet-200"
              >
                Ir a mi dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-sm font-semibold text-violet-300 hover:text-violet-200"
              >
                Iniciar sesion para participar
              </Link>
            )}
          </div>

          {(statusMessage || error) && (
            <div
              className={`mb-5 rounded-md border px-4 py-3 text-sm ${
                error
                  ? 'border-red-500/40 bg-red-500/10 text-red-200'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              }`}
            >
              {error || statusMessage}
            </div>
          )}

          <div className="mb-5 grid gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4 sm:grid-cols-3">
            <select
              name="categoryId"
              value={filters.categoryId}
              onChange={handleFilterChange}
              className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-400"
            >
              <option value="">Todas las categorias</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {/* ponytail: modality filtering is hidden until onsite/remote jobs have a separate flow.
            <select
              name="serviceMode"
              value={filters.serviceMode}
              onChange={handleFilterChange}
              className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-400"
            >
              <option value="">Todas las modalidades</option>
              <option value="ONLINE">Online</option>
              <option value="IN_PERSON">Presencial</option>
              <option value="BOTH">Online o presencial</option>
            </select> */}
            <input
              name="budget"
              value={filters.budget}
              onChange={handleFilterChange}
              placeholder="Mi presupuesto"
              className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-400"
            />
            <input
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              placeholder="Ubicacion"
              className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-400"
            />
          </div>

          {isLoading ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
              Cargando ofertas...
            </div>
          ) : filteredJobPosts.length > 0 ? (
            <div className="grid gap-4">
              {filteredJobPosts.map((jobPost) => (
                <article
                  key={jobPost.id}
                  className={`rounded-lg border p-5 transition ${
                    selectedJobPostId === jobPost.id
                      ? 'border-violet-400 bg-zinc-900'
                      : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-600'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedJobPostId(jobPost.id)}
                    className="block w-full text-left"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          {jobPost.title}
                        </h2>
                        <p className="mt-2 line-clamp-3 text-sm text-zinc-300">
                          {jobPost.description}
                        </p>
                      </div>

                      <span className="w-fit rounded-full border border-violet-400/40 px-3 py-1 text-xs font-semibold text-violet-200">
                        {getStatusLabel(jobPost.status)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-zinc-400 sm:grid-cols-4">
                      <span>{jobPost.category?.name || 'Categoria abierta'}</span>
                      <span>{getJobBudgetLabel(jobPost)}</span>
                      <span>{formatDate(jobPost.desiredDeadline)}</span>
                      <span>{jobPost._count?.applications || 0} aplicaciones</span>
                    </div>
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
              No hay ofertas abiertas con esos filtros.
            </div>
          )}
        </section>

        <aside className="space-y-6">
          {canPublishJobs && (
            <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Mis ofertas</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Publica necesidades y revisa aplicaciones desde aqui.
                  </p>
                </div>
                <Button onClick={() => setIsJobFormOpen(true)}>
                  Crear oferta
                </Button>
              </div>
            </section>
          )}

          {canPublishJobs && isJobFormOpen && (
            <section className="dialog-motion fixed inset-0 z-50 overflow-y-auto bg-black/75 px-4 py-6">
              <div className="mx-auto max-w-xl rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">
                  {editingJobPostId ? 'Editar oferta' : 'Publicar oferta'}
                </h2>
                <button
                  type="button"
                  onClick={handleCancelEditJobPost}
                  className="text-sm font-semibold text-zinc-400 hover:text-white"
                >
                  Cerrar
                </button>
              </div>
              <form onSubmit={handleCreateJobPost} className="mt-4 space-y-3">
                <input
                  name="title"
                  value={jobFormData.title}
                  onChange={handleJobFormChange}
                  placeholder="Titulo del proyecto"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-400"
                />
                <textarea
                  name="description"
                  value={jobFormData.description}
                  onChange={handleJobFormChange}
                  rows={5}
                  placeholder="Describe objetivos, entregables, referencias y criterios de aprobacion"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-400"
                />
                <select
                  name="categoryId"
                  value={jobFormData.categoryId}
                  onChange={handleJobFormChange}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-400"
                >
                  <option value="">Categoria abierta</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    name="budgetMin"
                    value={jobFormData.budgetMin}
                    onChange={handleJobFormChange}
                    placeholder="Presupuesto minimo"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-400"
                  />
                  <input
                    name="budgetMax"
                    value={jobFormData.budgetMax}
                    onChange={handleJobFormChange}
                    placeholder="Presupuesto maximo"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-400"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                        type="date"
                        name="desiredDeadline"
                        value={jobFormData.desiredDeadline}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={handleJobFormChange}
                      />
                  
                  {/* ponytail: keep backend default serviceMode, hide choice until this flow is defined.
                  <select
                    name="serviceMode"
                    value={jobFormData.serviceMode}
                    onChange={handleJobFormChange}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-400"
                  >
                    <option value="ONLINE">Online</option>
                    <option value="IN_PERSON">Presencial</option>
                    <option value="BOTH">Online o presencial</option>
                  </select> */}
                </div>
                <input
                  name="location"
                  value={jobFormData.location}
                  onChange={handleJobFormChange}
                  placeholder="Ubicacion o zona"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-400"
                />
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    name="isFlexibleDeadline"
                    checked={jobFormData.isFlexibleDeadline}
                    onChange={handleJobFormChange}
                  />
                  Fecha flexible
                </label>
                <Button type="submit" disabled={isSavingJob}>
                  {isSavingJob
                    ? 'Guardando...'
                    : editingJobPostId
                      ? 'Guardar cambios'
                      : 'Publicar oferta'}
                </Button>
              </form>
              </div>
            </section>
          )}

          {canPublishJobs && myJobPosts.length > 0 && (
            <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-lg font-bold">Mis ofertas</h2>
              <div className="mt-4 space-y-4">
                {myJobPosts.map((jobPost) => (
                  <article key={jobPost.id} className="border-t border-zinc-800 pt-4 first:border-t-0 first:pt-0">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{jobPost.title}</h3>
                      <span className="text-xs text-zinc-400">
                        {getStatusLabel(jobPost.status)}
                      </span>
                    </div>
                    {jobPost.status !== 'ASSIGNED' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => handleEditJobPost(jobPost)}
                        >
                          Editar
                        </Button>
                        {['OPEN', 'IN_REVIEW'].includes(jobPost.status) && (
                          <Button
                            variant="secondary"
                            onClick={() =>
                              handleUpdateJobPostStatus(jobPost.id, 'PAUSED')
                            }
                          >
                            Pausar
                          </Button>
                        )}
                        {['PAUSED', 'CLOSED'].includes(jobPost.status) && (
                          <Button
                            variant="secondary"
                            onClick={() =>
                              handleUpdateJobPostStatus(jobPost.id, 'OPEN')
                            }
                          >
                            Reabrir
                          </Button>
                        )}
                        {jobPost.status !== 'CLOSED' && (
                          <Button
                            variant="secondary"
                            onClick={() =>
                              handleUpdateJobPostStatus(jobPost.id, 'CLOSED')
                            }
                          >
                            Cerrar
                          </Button>
                        )}
                      </div>
                    )}
                    <div className="mt-3 space-y-3">
                      {jobPost.applications.length > 0 ? (
                        jobPost.applications.map((application) => (
                          <div
                            key={application.id}
                            className="rounded-md border border-zinc-800 bg-zinc-950 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold">
                                  {application.artistProfile.artistName ||
                                    application.artistProfile.fullName ||
                                    'Artista'}
                                </p>
                                <p className="text-sm text-zinc-400">
                                  {application.proposedPrice} -{' '}
                                  {application.estimatedTimeline ||
                                    'Tiempo a conversar'}
                                </p>
                                <Link
                                  to={`/artists/${application.artistProfile.id}`}
                                  className="mt-1 inline-block text-sm font-semibold text-violet-300 hover:text-violet-200"
                                >
                                  Ver perfil
                                </Link>
                              </div>
                              <span className="text-xs text-violet-200">
                                {getStatusLabel(application.status)}
                              </span>
                            </div>
                            <p className="mt-2 whitespace-pre-line text-sm text-zinc-300">
                              {application.message}
                            </p>
                            {application.portfolioLinks && (
                              <p className="mt-2 whitespace-pre-line text-sm text-zinc-400">
                                {application.portfolioLinks}
                              </p>
                            )}
                            {application.commissionRequest && (
                              <Link
                                to="/client/dashboard"
                                className="mt-3 inline-block text-sm font-semibold text-violet-300 hover:text-violet-200"
                              >
                                Ver comision #{application.commissionRequest.id}
                              </Link>
                            )}
                            {['PENDING', 'SHORTLISTED'].includes(application.status) &&
                              jobPost.status !== 'ASSIGNED' && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Button
                                    variant="secondary"
                                    onClick={() =>
                                      handleUpdateApplicationStatus(
                                        application.id,
                                        'SHORTLISTED',
                                      )
                                    }
                                    disabled={
                                      updatingApplicationId === application.id
                                    }
                                  >
                                    Preseleccionar
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      handleUpdateApplicationStatus(
                                        application.id,
                                        'ACCEPTED',
                                      )
                                    }
                                    disabled={
                                      updatingApplicationId === application.id
                                    }
                                  >
                                    Aceptar y crear comision
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    onClick={() =>
                                      handleUpdateApplicationStatus(
                                        application.id,
                                        'REJECTED',
                                      )
                                    }
                                    disabled={
                                      updatingApplicationId === application.id
                                    }
                                  >
                                    Rechazar
                                  </Button>
                                </div>
                              )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-500">
                          Aun no hay aplicaciones.
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {isArtist && myApplications.length > 0 && (
            <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-lg font-bold">Mis aplicaciones</h2>
              <div className="mt-4 space-y-3">
                {myApplications.map((application) => (
                  <article
                    key={application.id}
                    className="rounded-md border border-zinc-800 bg-zinc-950 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {application.jobPost.title}
                        </p>
                        <p className="text-sm text-zinc-400">
                          {application.proposedPrice} -{' '}
                          {application.estimatedTimeline || 'Tiempo abierto'}
                        </p>
                      </div>
                      <span className="text-xs text-violet-200">
                        {getStatusLabel(application.status)}
                      </span>
                    </div>
                    {application.commissionRequest && (
                      <Link
                        to="/dashboard"
                        className="mt-3 inline-block text-sm font-semibold text-violet-300 hover:text-violet-200"
                      >
                        Ver comision #{application.commissionRequest.id} en mi dashboard
                      </Link>
                    )}
                    {['PENDING', 'SHORTLISTED'].includes(application.status) && (
                      <Button
                        variant="secondary"
                        onClick={() => handleWithdrawApplication(application.id)}
                        disabled={updatingApplicationId === application.id}
                      >
                        Retirar aplicacion
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {selectedJobPost && (
        <div className="dialog-motion fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="selected-job-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-violet-300">
                  Oferta creativa
                </p>
                <h2 id="selected-job-title" className="mt-2 text-xl font-bold">
                  {selectedJobPost.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseJobPostModal}
                className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-zinc-500 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <p className="mt-4 whitespace-pre-line text-sm text-zinc-300">
              {selectedJobPost.description}
            </p>

            <div className="mt-4 grid gap-2 text-sm text-zinc-400">
              <span>
                Cliente:{' '}
                {selectedJobPost.clientUser?.fullName ||
                  selectedJobPost.clientUser?.email}
              </span>
              {/* ponytail: modality display paused until onsite/remote projects have separate rules.
              <span>
                Modalidad: {getServiceModeLabel(selectedJobPost.serviceMode)}
              </span> */}
              <span>Presupuesto del cliente: {getJobBudgetLabel(selectedJobPost)}</span>
              <span>
                Ubicacion: {selectedJobPost.location || 'No especificada'}
              </span>
              <span>Entrega: {formatDate(selectedJobPost.desiredDeadline)}</span>
            </div>

            {canApplyToSelectedJobPost && (
              selectedActiveJobApplication ? (
                <div className="mt-5 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  Ya aplicaste a esta oferta. Puedes revisar el estado abajo.
                </div>
              ) : (
                <form onSubmit={handleApply} className="mt-5 space-y-3">
                  <textarea
                    name="message"
                    value={applicationFormData.message}
                    onChange={handleApplicationFormChange}
                    rows={5}
                    placeholder="Explica como resolverias el proyecto, alcance incluido y condiciones importantes"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-400"
                  />
                  <input
                    name="proposedPrice"
                    value={applicationFormData.proposedPrice}
                    onChange={handleApplicationFormChange}
                    placeholder="Precio propuesto, ej. 250 USD"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-400"
                  />
                  {getClientProposedPrice(selectedJobPost) && (
                    <button
                      type="button"
                      onClick={() =>
                        setApplicationFormData((currentData) => ({
                          ...currentData,
                          proposedPrice: getClientProposedPrice(selectedJobPost),
                        }))
                      }
                      className="rounded-md border border-violet-400/40 px-3 py-2 text-left text-sm font-semibold text-violet-200 hover:bg-violet-400/10"
                    >
                      Usar precio del cliente: {getClientProposedPrice(selectedJobPost)}
                    </button>
                  )}
                  <input
                    name="estimatedTimeline"
                    value={applicationFormData.estimatedTimeline}
                    onChange={handleApplicationFormChange}
                    placeholder="Tiempo estimado, ej. 10 dias"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-400"
                  />
                  <textarea
                    name="portfolioLinks"
                    value={applicationFormData.portfolioLinks}
                    onChange={handleApplicationFormChange}
                    rows={3}
                    placeholder="Links relevantes de portafolio"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-400"
                  />
                  <Button type="submit" disabled={isApplying}>
                    {isApplying
                      ? 'Enviando...'
                      : selectedJobApplication?.status === 'WITHDRAWN'
                        ? 'Volver a aplicar'
                        : 'Aplicar a oferta'}
                  </Button>
                </form>
              )
            )}

            {isArtist && selectedJobPostBelongsToCurrentUser && (
              <div className="mt-5 rounded-md border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-100">
                Esta oferta fue publicada por ti. Puedes revisar las
                aplicaciones en Mis ofertas.
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  )
}

export default JobsPage
