import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { API_URL } from '../config/api'
import {
  getAuthToken,
  removeAuthToken,
  saveAuthUser,
} from '../utils/auth'
import {
  getCommissionFinalDownloadUrl,
  uploadAttachments,
} from '../utils/uploads'

function getArtistDisplayName(profile) {
  return profile?.artistName || profile?.fullName || 'Artista'
}

function getCommissionStatusLabel(status) {
  const labels = {
    PENDING: 'Pendiente',
    REVIEWED: 'En revision',
    PROPOSED: 'Propuesta',
    CLIENT_ACCEPTED: 'Aceptada por ti',
    CLIENT_REJECTED: 'Rechazada por ti',
    ACCEPTED: 'Confirmada',
    PAYMENT_PENDING: 'Pago pendiente',
    IN_PROGRESS: 'En trabajo',
    DELIVERED: 'Entrega lista',
    REVISION_REQUESTED: 'Cambios solicitados',
    COMPLETED: 'Completada',
    REJECTED: 'Rechazada',
    CANCELLED_BY_CLIENT: 'Cancelada por ti',
    CANCELLED_BY_ARTIST: 'Cancelada por artista',
    DISPUTED: 'En disputa',
  }

  return labels[status] || status
}

function getCommissionStatusClassName(status) {
  const classNames = {
    ALL: 'border-violet-400/40 bg-violet-400/10 text-violet-200',
    PENDING: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
    REVIEWED: 'border-sky-400/40 bg-sky-400/10 text-sky-200',
    PROPOSED: 'border-indigo-400/40 bg-indigo-400/10 text-indigo-200',
    CLIENT_ACCEPTED: 'border-lime-400/40 bg-lime-400/10 text-lime-200',
    CLIENT_REJECTED: 'border-orange-400/40 bg-orange-400/10 text-orange-200',
    ACCEPTED: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
    PAYMENT_PENDING: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
    IN_PROGRESS: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200',
    DELIVERED: 'border-blue-400/40 bg-blue-400/10 text-blue-200',
    REVISION_REQUESTED: 'border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-200',
    COMPLETED: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
    REJECTED: 'border-red-400/40 bg-red-400/10 text-red-200',
    CANCELLED_BY_CLIENT: 'border-zinc-600 bg-zinc-800 text-zinc-300',
    CANCELLED_BY_ARTIST: 'border-zinc-600 bg-zinc-800 text-zinc-300',
    DISPUTED: 'border-red-400/40 bg-red-400/10 text-red-200',
  }

  return classNames[status] || 'border-zinc-700 bg-zinc-900 text-zinc-300'
}

function getPaymentStatusLabel(status) {
  const labels = {
    PENDING: 'Pendiente',
    PAID: 'Pagado',
    FAILED: 'Fallido',
    CANCELLED: 'Cancelado',
  }

  return labels[status] || status
}

function getPaymentStatusClassName(status) {
  const classNames = {
    PENDING: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
    PAID: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
    FAILED: 'border-red-400/40 bg-red-400/10 text-red-200',
    CANCELLED: 'border-zinc-700 bg-zinc-900 text-zinc-300',
  }

  return classNames[status] || 'border-zinc-700 bg-zinc-900 text-zinc-300'
}

function getJobPostStatusLabel(status) {
  const labels = {
    OPEN: 'Abierta',
    IN_REVIEW: 'Recibiendo aplicaciones',
    PAUSED: 'Pausada',
    ASSIGNED: 'Asignada',
    CLOSED: 'Cerrada',
  }

  return labels[status] || status
}

function formatCommissionDate(dateValue) {
  if (!dateValue) {
    return 'Sin fecha'
  }

  return new Intl.DateTimeFormat('es-HN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateValue))
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
      {hint && <p className="mt-2 text-xs text-zinc-500">{hint}</p>}
    </div>
  )
}

function ClientDashboardPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [commissions, setCommissions] = useState([])
  const [jobPosts, setJobPosts] = useState([])
  const [error, setError] = useState('')
  const [responseError, setResponseError] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCommissionId, setSelectedCommissionId] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [commissionStatusFilter, setCommissionStatusFilter] = useState('ALL')
  const [revisionRequest, setRevisionRequest] = useState('')
  const [isRespondingProposal, setIsRespondingProposal] = useState(false)
  const [isRespondingDelivery, setIsRespondingDelivery] = useState(false)
  const [isPreparingPayment, setIsPreparingPayment] = useState(false)
  const [isCancellingCommission, setIsCancellingCommission] = useState(false)
  const [isOpeningDispute, setIsOpeningDispute] = useState(false)
  const [isPreparingFinalDownload, setIsPreparingFinalDownload] = useState(false)
  const [disputeEvidenceAttachments, setDisputeEvidenceAttachments] = useState([])
  const [disputeUploadStatus, setDisputeUploadStatus] = useState('')

  useEffect(() => {
    async function loadClientDashboard() {
      const token = getAuthToken()

      if (!token) {
        navigate('/login')
        return
      }

      try {
        const meResponse = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!meResponse.ok) {
          removeAuthToken()
          navigate('/login')
          return
        }

        const currentUser = await meResponse.json()
        saveAuthUser(currentUser)
        setUser(currentUser)

        const commissionsResponse = await fetch(`${API_URL}/commissions/client/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!commissionsResponse.ok) {
          const errorData = await commissionsResponse.json()
          throw new Error(
            errorData.message || 'No se pudieron cargar tus solicitudes',
          )
        }

        const commissionsData = await commissionsResponse.json()
        setCommissions(commissionsData)
        setSelectedCommissionId((currentSelectedCommissionId) =>
          currentSelectedCommissionId ?? commissionsData[0]?.id ?? null,
        )
        setRevisionRequest(commissionsData[0]?.revisionRequest || '')

        const jobPostsResponse = await fetch(`${API_URL}/job-posts/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (jobPostsResponse.ok) {
          const jobPostsData = await jobPostsResponse.json()
          setJobPosts(jobPostsData)
        }
      } catch (currentError) {
        setError(currentError.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadClientDashboard()
  }, [navigate])

  const filteredCommissions = useMemo(() => {
    if (commissionStatusFilter === 'ALL') {
      return commissions
    }

    return commissions.filter(
      (commission) => commission.status === commissionStatusFilter,
    )
  }, [commissionStatusFilter, commissions])

  const selectedCommission =
    filteredCommissions.find((commission) => commission.id === selectedCommissionId) ||
    commissions.find((commission) => commission.id === selectedCommissionId) ||
    filteredCommissions[0] ||
    commissions[0] ||
    null

  const selectedCommissionPayment =
    selectedCommission?.paymentTransactions?.find(
      (paymentTransaction) =>
        !paymentTransaction.purpose ||
        paymentTransaction.purpose === 'COMMISSION',
    ) || null
  const selectedExtraRevisionPayment =
    selectedCommission?.paymentTransactions?.find(
      (paymentTransaction) =>
        paymentTransaction.purpose === 'REVISION_EXTRA' &&
        paymentTransaction.status === 'PENDING',
    ) || null
  const displayName =
    user?.fullName || user?.profile?.fullName || user?.email || 'Cliente'
  const visibleStatuses = [
    'ALL',
    'PENDING',
    'REVIEWED',
    'PROPOSED',
    'PAYMENT_PENDING',
    'IN_PROGRESS',
    'DELIVERED',
    'REVISION_REQUESTED',
    'DISPUTED',
    'COMPLETED',
    'CANCELLED_BY_CLIENT',
    'CANCELLED_BY_ARTIST',
  ]

  const metrics = useMemo(() => {
    const pendingCount = commissions.filter((commission) =>
      ['PENDING', 'REVIEWED', 'PROPOSED'].includes(commission.status),
    ).length
    const activeCount = commissions.filter((commission) =>
      ['CLIENT_ACCEPTED', 'ACCEPTED', 'PAYMENT_PENDING', 'IN_PROGRESS', 'DELIVERED', 'REVISION_REQUESTED', 'DISPUTED'].includes(
        commission.status,
      ),
    ).length
    const completedCount = commissions.filter(
      (commission) => commission.status === 'COMPLETED',
    ).length

    return {
      total: commissions.length,
      pending: pendingCount,
      active: activeCount,
      completed: completedCount,
    }
  }, [commissions])

  function syncCommission(updatedCommission) {
    setCommissions((currentCommissions) =>
      currentCommissions.map((commission) =>
        commission.id === updatedCommission.id
          ? {
              ...commission,
              ...updatedCommission,
              paymentTransactions:
                updatedCommission.paymentTransactions ??
                commission.paymentTransactions,
            }
          : commission,
      ),
    )
    setSelectedCommissionId(updatedCommission.id)
    setRevisionRequest(updatedCommission.revisionRequest || '')
  }

  function handleSelectCommission(commission) {
    setSelectedCommissionId(commission.id)
    setIsDetailModalOpen(true)
    setRevisionRequest(commission.revisionRequest || '')
    setResponseError('')
    setPaymentError('')
    setDisputeEvidenceAttachments([])
    setDisputeUploadStatus('')
  }

  async function handleProposalResponse(decision) {
    if (!selectedCommission) {
      return
    }

    const token = getAuthToken()
    setIsRespondingProposal(true)
    setResponseError('')

    try {
      const response = await fetch(
        `${API_URL}/commissions/client/${selectedCommission.id}/proposal-response`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ decision }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.message || 'No se pudo responder la propuesta',
        )
      }

      syncCommission(await response.json())
    } catch (currentError) {
      setResponseError(currentError.message)
    } finally {
      setIsRespondingProposal(false)
    }
  }

  async function handleDeliveryResponse(decision) {
    if (!selectedCommission) {
      return
    }

    const token = getAuthToken()
    setIsRespondingDelivery(true)
    setResponseError('')

    try {
      const response = await fetch(
        `${API_URL}/commissions/client/${selectedCommission.id}/delivery-response`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
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

      syncCommission(await response.json())
    } catch (currentError) {
      setResponseError(currentError.message)
    } finally {
      setIsRespondingDelivery(false)
    }
  }

  async function handleCancelCommission() {
    if (!selectedCommission) {
      return
    }

    const reason = window.prompt('Motivo de cancelacion')

    if (reason === null) {
      return
    }

    const token = getAuthToken()
    setIsCancellingCommission(true)
    setResponseError('')

    try {
      const response = await fetch(
        `${API_URL}/commissions/client/${selectedCommission.id}/cancel`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reason,
          }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'No se pudo cancelar la comision')
      }

      syncCommission(await response.json())
    } catch (currentError) {
      setResponseError(currentError.message)
    } finally {
      setIsCancellingCommission(false)
    }
  }

  async function handlePayCommission(paymentTransaction = selectedCommissionPayment) {
    if (!paymentTransaction) {
      setPaymentError('Esta comision aun no tiene un pago pendiente disponible')
      return
    }

    const token = getAuthToken()
    setPaymentError('')
    setIsPreparingPayment(true)

    try {
      let providerOrderId = paymentTransaction.providerOrderId

      if (!providerOrderId) {
        const response = await fetch(
          `${API_URL}/payments/${paymentTransaction.id}/paypal-order`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'No se pudo preparar el pago')
        }

        const updatedPaymentTransaction = await response.json()
        providerOrderId = updatedPaymentTransaction.providerOrderId

        setCommissions((currentCommissions) =>
          currentCommissions.map((commission) =>
            commission.id === updatedPaymentTransaction.commissionRequest.id
              ? {
                  ...commission,
                  paymentTransactions: commission.paymentTransactions.map(
                    (paymentTransaction) =>
                      paymentTransaction.id === updatedPaymentTransaction.id
                        ? {
                            ...paymentTransaction,
                            ...updatedPaymentTransaction,
                          }
                        : paymentTransaction,
                  ),
                }
              : commission,
          ),
        )
      }

      if (!providerOrderId) {
        throw new Error('No se pudo obtener la orden de PayPal')
      }

      navigate(`/payments/checkout/${providerOrderId}`)
    } catch (currentError) {
      setPaymentError(currentError.message)
    } finally {
      setIsPreparingPayment(false)
    }
  }

  async function handleDownloadFinalFile(attachmentId) {
    if (!selectedCommission) {
      return
    }

    setIsPreparingFinalDownload(true)
    setResponseError('')

    try {
      const downloadUrl = await getCommissionFinalDownloadUrl(
        selectedCommission.id,
        attachmentId,
      )
      window.open(downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (currentError) {
      setResponseError(currentError.message)
    } finally {
      setIsPreparingFinalDownload(false)
    }
  }

  async function handleDisputeEvidenceUpload(event) {
    const files = Array.from(event.target.files || [])

    if (files.length === 0) {
      return
    }

    setDisputeUploadStatus('Subiendo evidencia...')

    try {
      const uploadedAttachments = await uploadAttachments(files)
      setDisputeEvidenceAttachments((currentAttachments) => [
        ...currentAttachments,
        ...uploadedAttachments,
      ])
      setDisputeUploadStatus('Evidencia adjuntada')
    } catch (currentError) {
      setDisputeUploadStatus(currentError.message)
    } finally {
      event.target.value = ''
    }
  }

  async function handleOpenDispute() {
    if (!selectedCommission) {
      return
    }

    const reason = window.prompt('Motivo de la disputa')

    if (reason === null) {
      return
    }

    const token = getAuthToken()
    setIsOpeningDispute(true)
    setResponseError('')

    try {
      const response = await fetch(
        `${API_URL}/commissions/client/${selectedCommission.id}/dispute`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reason,
            evidenceAttachments: disputeEvidenceAttachments,
          }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'No se pudo abrir la disputa')
      }

      syncCommission(await response.json())
      setDisputeEvidenceAttachments([])
      setDisputeUploadStatus('')
    } catch (currentError) {
      setResponseError(currentError.message)
    } finally {
      setIsOpeningDispute(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <p className="text-zinc-300">Cargando tus solicitudes...</p>
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
          <h1 className="mt-8 text-3xl font-bold">Dashboard no disponible</h1>
          <p className="mt-3 text-zinc-400">{error}</p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
              Dashboard cliente
            </p>
            <h1 className="mt-3 text-3xl font-bold">{displayName}</h1>
            <p className="mt-2 max-w-2xl text-zinc-400">
              Revisa tus comisiones, responde propuestas, aprueba entregas y paga
              cuando el proyecto lo requiera.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
            {commissions.length} solicitud{commissions.length === 1 ? '' : 'es'}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <MetricCard label="Solicitudes" value={metrics.total} />
          <MetricCard label="Pendientes" value={metrics.pending} />
          <MetricCard label="Activas" value={metrics.active} />
          <MetricCard label="Completadas" value={metrics.completed} />
        </div>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Ofertas publicadas</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Gestiona tus ofertas y revisa aplicaciones desde bolsa de trabajo.
              </p>
            </div>
            <Link
              to="/jobs"
              className="text-sm font-semibold text-violet-300 hover:text-violet-200"
            >
              Ir a ofertas
            </Link>
          </div>

          {jobPosts.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              Todavia no has publicado ofertas.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {jobPosts.slice(0, 3).map((jobPost) => (
                <article
                  key={jobPost.id}
                  className="rounded-md border border-zinc-800 bg-zinc-950 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{jobPost.title}</p>
                    <span className="text-xs text-violet-200">
                      {getJobPostStatusLabel(jobPost.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    {jobPost.applications?.length || 0} aplicaciones
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          {visibleStatuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setCommissionStatusFilter(status)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${getCommissionStatusClassName(
                commissionStatusFilter === status ? status : 'DEFAULT',
              )}`}
            >
              {status === 'ALL' ? 'Todas' : getCommissionStatusLabel(status)}
            </button>
          ))}
        </div>

        {filteredCommissions.length === 0 ? (
          <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
            <h2 className="text-2xl font-bold">Aun no tienes solicitudes</h2>
            <p className="mt-3 text-zinc-400">
              Cuando pidas una comision desde el perfil de un artista, aparecera
              aqui.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex rounded-md bg-violet-400 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-violet-300"
            >
              Explorar artistas
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCommissions.map((commission) => {
                const isSelected = commission.id === selectedCommission?.id
                const artistName = getArtistDisplayName(commission.artistProfile)

                return (
                  <button
                    key={commission.id}
                    type="button"
                    onClick={() => handleSelectCommission(commission)}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      isSelected
                        ? 'border-violet-400 bg-zinc-900'
                        : 'border-zinc-800 bg-zinc-950 hover:border-violet-400/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {commission.projectTitle || 'Solicitud sin titulo'}
                        </p>
                        <p className="mt-1 text-sm text-zinc-400">{artistName}</p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getCommissionStatusClassName(
                          commission.status,
                        )}`}
                      >
                        {getCommissionStatusLabel(commission.status)}
                      </span>
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-400">
                      {commission.message}
                    </p>

                    <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                      <span>{commission.budget || 'Sin presupuesto'}</span>
                      <span>{formatCommissionDate(commission.createdAt)}</span>
                    </div>
                  </button>
                )
              })}
          </div>
        )}

        {isDetailModalOpen && selectedCommission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
              <section className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
                      Solicitud
                    </p>
                    <h2 className="mt-2 text-3xl font-bold">
                      {selectedCommission.projectTitle || 'Proyecto sin titulo'}
                    </h2>
                    <p className="mt-2 text-zinc-400">
                      Con {getArtistDisplayName(selectedCommission.artistProfile)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full border px-4 py-2 text-sm font-semibold ${getCommissionStatusClassName(
                        selectedCommission.status,
                      )}`}
                    >
                      {getCommissionStatusLabel(selectedCommission.status)}
                    </span>

                    <button
                      type="button"
                      onClick={() => setIsDetailModalOpen(false)}
                      aria-label="Cerrar detalle"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 transition hover:border-violet-400 hover:text-violet-300"
                    >
                      x
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Presupuesto
                    </p>
                    <p className="mt-2 text-lg font-bold text-white">
                      {selectedCommission.budget || 'No especificado'}
                    </p>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Fecha deseada
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {selectedCommission.desiredDeadline
                        ? formatCommissionDate(selectedCommission.desiredDeadline)
                        : 'No especificada'}
                    </p>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Creada
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {formatCommissionDate(selectedCommission.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Mensaje enviado
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-300">
                    {selectedCommission.message}
                  </p>
                </div>

                {selectedCommission.attachments?.some(
                  (attachment) => attachment.type === 'CLIENT_REFERENCE',
                ) && (
                  <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Referencias enviadas
                    </p>
                    <div className="mt-3 grid gap-2">
                      {selectedCommission.attachments
                        .filter(
                          (attachment) =>
                            attachment.type === 'CLIENT_REFERENCE',
                        )
                        .map((attachment) => (
                          <a
                            key={attachment.id || attachment.url}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 hover:border-violet-400"
                          >
                            {attachment.name || attachment.url}
                          </a>
                        ))}
                    </div>
                  </div>
                )}

                {selectedCommission.disputes?.length > 0 && (
                  <div className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-300">
                      Disputa abierta
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm text-zinc-200">
                      {selectedCommission.disputes[0].reason}
                    </p>
                    {selectedCommission.attachments?.some(
                      (attachment) => attachment.type === 'DISPUTE_EVIDENCE',
                    ) && (
                      <div className="mt-3 grid gap-2">
                        {selectedCommission.attachments
                          .filter(
                            (attachment) =>
                              attachment.type === 'DISPUTE_EVIDENCE',
                          )
                          .map((attachment) => (
                            <a
                              key={attachment.id || attachment.url}
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate rounded-md border border-red-400/30 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                            >
                              {attachment.name || attachment.url}
                            </a>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {(selectedCommission.artistResponse ||
                  selectedCommission.quotedPrice) && (
                  <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                      Propuesta del artista
                    </p>
                    {selectedCommission.quotedPrice && (
                      <p className="mt-3 text-lg font-bold text-white">
                        {selectedCommission.quotedPrice}
                      </p>
                    )}
                    {selectedCommission.artistResponse && (
                      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-300">
                        {selectedCommission.artistResponse}
                      </p>
                    )}
                    <p className="mt-3 text-sm text-zinc-400">
                      Cambios incluidos:{' '}
                      {selectedCommission.includedRevisions ?? 1} · Usados:{' '}
                      {selectedCommission.usedRevisions || 0} · Extra:{' '}
                      {selectedCommission.extraRevisionPrice || 'No definido'} ·
                      Retencion si cancelas tras entrega:{' '}
                      {selectedCommission.cancellationRetentionPercent ?? 0}%
                    </p>

                    {selectedCommission.status === 'PROPOSED' && (
                      <div className="mt-5 flex flex-wrap gap-3">
                        <Button
                          disabled={isRespondingProposal}
                          onClick={() => handleProposalResponse('ACCEPT')}
                        >
                          {isRespondingProposal
                            ? 'Respondiendo...'
                            : 'Aceptar propuesta'}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={isRespondingProposal}
                          onClick={() => handleProposalResponse('REJECT')}
                        >
                          Rechazar propuesta
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {(selectedCommissionPayment ||
                  selectedCommission.status === 'PAYMENT_PENDING') && (
                  <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
                          Pago
                        </p>
                        <h3 className="mt-2 text-lg font-bold text-white">
                          Pago de la comision
                        </h3>
                        <p className="mt-1 text-sm text-zinc-500">
                          Cuando la orden este lista, puedes pagarla aqui.
                        </p>
                      </div>

                      {selectedCommissionPayment && (
                        <span
                          className={`rounded-md border px-3 py-2 text-xs font-semibold ${getPaymentStatusClassName(
                            selectedCommissionPayment.status,
                          )}`}
                        >
                          {getPaymentStatusLabel(selectedCommissionPayment.status)}
                        </span>
                      )}
                    </div>

                    {selectedCommissionPayment ? (
                      <div className="mt-4 grid gap-3 rounded-md border border-zinc-800 bg-zinc-900 p-3 md:grid-cols-4">
                        <div>
                          <p className="text-xs uppercase text-zinc-500">Monto</p>
                          <p className="mt-1 font-semibold text-white">
                            {selectedCommissionPayment.amount}{' '}
                            {selectedCommissionPayment.currency}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-zinc-500">Estado</p>
                          <p className="mt-1 font-semibold text-white">
                            {getPaymentStatusLabel(selectedCommissionPayment.status)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-zinc-500">
                            Proveedor
                          </p>
                          <p className="mt-1 font-semibold text-white">
                            {selectedCommissionPayment.provider}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-zinc-500">
                            Orden PayPal
                          </p>
                          <p className="mt-1 break-all font-semibold text-white">
                            {selectedCommissionPayment.providerOrderId || 'Pendiente'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-400">
                        El artista todavia no ha generado el pago de esta comision.
                      </p>
                    )}

                    {selectedCommissionPayment?.status === 'PENDING' && (
                      <div className="mt-4">
                        <Button
                          disabled={isPreparingPayment}
                          onClick={handlePayCommission}
                        >
                          {isPreparingPayment
                            ? 'Preparando pago...'
                            : selectedCommissionPayment.providerOrderId
                              ? 'Pagar ahora'
                              : 'Generar orden y pagar'}
                        </Button>
                      </div>
                    )}

                    {paymentError && (
                      <p className="mt-4 text-sm text-red-400">{paymentError}</p>
                    )}
                  </div>
                )}

                {(selectedCommission.deliveryMessage ||
                  selectedCommission.status === 'DELIVERED' ||
                  selectedCommission.status === 'COMPLETED' ||
                  selectedCommission.status === 'REVISION_REQUESTED') && (
                  <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                      Revision de entrega
                    </p>

                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-300">
                      {selectedCommission.deliveryMessage ||
                        'El artista aun no ha dejado un mensaje de entrega.'}
                    </p>

                    {selectedCommission.clientResponseDeadline &&
                      selectedCommission.status === 'DELIVERED' && (
                        <div className="mt-4 rounded-md border border-blue-400/30 bg-blue-400/10 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
                            Plazo para responder
                          </p>
                          <p className="mt-2 text-sm text-zinc-300">
                            {formatCommissionDate(
                              selectedCommission.clientResponseDeadline,
                            )}
                          </p>
                        </div>
                      )}

                    {(selectedCommission.deliveryPreviewUrl ||
                      selectedCommission.deliveryUrl) && (
                      <a
                        href={
                          selectedCommission.deliveryPreviewUrl ||
                          selectedCommission.deliveryUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 block break-all text-sm font-semibold text-violet-300 hover:text-violet-200"
                      >
                        Abrir preview con watermark
                      </a>
                    )}

                    {selectedCommission.attachments?.some((attachment) =>
                      ['ARTIST_PREVIEW', 'ARTIST_FINAL'].includes(
                        attachment.type,
                      ),
                    ) && (
                      <div className="mt-4 grid gap-2">
                        {selectedCommission.attachments
                          .filter((attachment) =>
                            ['ARTIST_PREVIEW', 'ARTIST_FINAL'].includes(
                              attachment.type,
                            ),
                          )
                          .map((attachment) => (
                            attachment.type === 'ARTIST_FINAL' ? (
                              <button
                                key={attachment.id || attachment.name}
                                type="button"
                                onClick={() =>
                                  handleDownloadFinalFile(attachment.id)
                                }
                                disabled={isPreparingFinalDownload}
                                className="truncate rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-left text-sm font-semibold text-emerald-200 disabled:opacity-60"
                              >
                                Descargar final:{' '}
                                {attachment.name || 'Archivo final'}
                              </button>
                            ) : (
                              <a
                                key={attachment.id || attachment.url}
                                href={attachment.previewUrl || attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="truncate rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 hover:border-violet-400"
                              >
                                Preview: {attachment.name || attachment.url}
                              </a>
                            )
                          ))}
                      </div>
                    )}

                    {selectedCommission.status !== 'COMPLETED' && (
                      <p className="mt-3 text-sm text-zinc-500">
                        El archivo final se desbloquea cuando apruebes la entrega.
                      </p>
                    )}

                    {selectedCommission.status === 'COMPLETED' &&
                      selectedCommission.finalFileUrl && (
                        <button
                          type="button"
                          onClick={() => handleDownloadFinalFile()}
                          disabled={isPreparingFinalDownload}
                          className="mt-4 inline-flex rounded-md bg-emerald-400 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-60"
                        >
                          {isPreparingFinalDownload
                            ? 'Preparando descarga...'
                            : 'Descargar archivo final'}
                        </button>
                      )}

                    {selectedCommission.revisionRequest && (
                      <div className="mt-4 rounded-md border border-fuchsia-400/30 bg-fuchsia-400/10 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-300">
                          Ultimos cambios solicitados
                        </p>
                        <p className="mt-2 whitespace-pre-line text-sm text-zinc-300">
                          {selectedCommission.revisionRequest}
                        </p>
                      </div>
                    )}

                    {selectedCommission.status === 'DELIVERED' && (
                      <>
                        <textarea
                          value={revisionRequest}
                          onChange={(event) =>
                            setRevisionRequest(event.target.value)
                          }
                          rows="4"
                          placeholder="Si necesitas cambios, describe exactamente que debe corregirse."
                          className="mt-4 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-fuchsia-400"
                        />

                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button
                            disabled={isRespondingDelivery}
                            onClick={() => handleDeliveryResponse('ACCEPT')}
                          >
                            {isRespondingDelivery
                              ? 'Respondiendo...'
                              : 'Aprobar entrega'}
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={
                              isRespondingDelivery ||
                              Boolean(selectedExtraRevisionPayment)
                            }
                            onClick={() =>
                              handleDeliveryResponse('REQUEST_REVISION')
                            }
                          >
                            Pedir cambios
                          </Button>
                        </div>
                      </>
                    )}

                    {selectedCommission.status === 'DELIVERED' &&
                      (selectedCommission.usedRevisions || 0) >=
                        (selectedCommission.includedRevisions ?? 1) &&
                      selectedCommission.extraRevisionPrice && (
                        <p className="mt-3 rounded-md border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
                          Los cambios incluidos ya fueron usados. Nuevos cambios
                          pueden requerir cobro extra de{' '}
                          {selectedCommission.extraRevisionPrice}.
                        </p>
                      )}

                    {selectedExtraRevisionPayment && (
                      <div className="mt-4 rounded-md border border-amber-400/30 bg-amber-400/10 p-3">
                        <p className="text-sm font-semibold text-amber-100">
                          Pago extra de revision pendiente:{' '}
                          {selectedExtraRevisionPayment.amount}{' '}
                          {selectedExtraRevisionPayment.currency}
                        </p>
                        <Button
                          disabled={isPreparingPayment}
                          onClick={() =>
                            handlePayCommission(selectedExtraRevisionPayment)
                          }
                        >
                          {isPreparingPayment
                            ? 'Preparando pago...'
                            : 'Pagar revision extra'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {responseError && (
                  <p className="mt-6 text-sm text-red-400">{responseError}</p>
                )}

                {![
                  'COMPLETED',
                  'REJECTED',
                  'CANCELLED_BY_CLIENT',
                  'CANCELLED_BY_ARTIST',
                  'DISPUTED',
                ].includes(selectedCommission.status) && (
                  <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                      Disputa
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Usa esto solo si no puedes resolver la entrega o pago con
                      el artista.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <label className="cursor-pointer rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-red-400">
                        Adjuntar evidencia
                        <input
                          type="file"
                          multiple
                          onChange={handleDisputeEvidenceUpload}
                          className="sr-only"
                        />
                      </label>
                      <Button
                        variant="secondary"
                        disabled={isOpeningDispute}
                        onClick={handleOpenDispute}
                      >
                        {isOpeningDispute
                          ? 'Abriendo disputa...'
                          : 'Abrir disputa'}
                      </Button>
                    </div>
                    {disputeUploadStatus && (
                      <p className="mt-3 text-sm text-violet-300">
                        {disputeUploadStatus}
                      </p>
                    )}
                    {disputeEvidenceAttachments.length > 0 && (
                      <div className="mt-3 grid gap-2">
                        {disputeEvidenceAttachments.map((attachment) => (
                          <a
                            key={attachment.url}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300"
                          >
                            {attachment.name || attachment.url}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {![
                  'COMPLETED',
                  'REJECTED',
                  'CANCELLED_BY_CLIENT',
                  'CANCELLED_BY_ARTIST',
                  'DISPUTED',
                ].includes(selectedCommission.status) && (
                  <div className="mt-6 flex justify-end">
                    <Button
                      variant="secondary"
                      disabled={isCancellingCommission}
                      onClick={handleCancelCommission}
                    >
                      {isCancellingCommission
                        ? 'Cancelando...'
                        : 'Cancelar comision'}
                    </Button>
                  </div>
                )}
              </section>
          </div>
        )}
      </section>
    </main>
  )
}

export default ClientDashboardPage
