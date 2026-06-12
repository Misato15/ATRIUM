import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import PortfolioItemCard from '../components/PortfolioItemCard'
import { API_URL } from '../config/api'
import { getAuthToken, removeAuthToken } from '../utils/auth'
import { uploadImage } from '../utils/uploads'

function getProfileDisplayName(profile) {
  return profile?.artistName || profile?.fullName
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  )
}

function UploadAction({ title, description, buttonLabel, status, onChange }) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div>
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
      </div>

      <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-violet-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-violet-300">
        {buttonLabel}
        <input type="file" accept="image/*" onChange={onChange} className="sr-only" />
      </label>

      {status && <p className="text-sm text-violet-300">{status}</p>}
    </div>
  )
}

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  )
}

function getNotificationTypeLabel(type) {
  const labels = {
    COMMISSION_REQUEST: 'Solicitud',
    PORTFOLIO_LIKE: 'Me gusta',
    FOLLOW: 'Seguidor',
    MESSAGE: 'Mensaje',
  }

  return labels[type] || 'Notificacion'
}

function getCommissionStatusLabel(status) {
  const labels = {
    PENDING: 'Pendiente',
    REVIEWED: 'En revision',
    PROPOSED: 'Propuesta enviada',
    CLIENT_ACCEPTED: 'Cliente acepto',
    CLIENT_REJECTED: 'Cliente rechazo',
    ACCEPTED: 'Aceptada',
    REJECTED: 'Rechazada',
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
    REJECTED: 'border-red-400/40 bg-red-400/10 text-red-200',
  }

  return (
    classNames[status] || 'border-zinc-700 bg-zinc-900 text-zinc-300'
  )
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
    CANCELLED: 'border-zinc-600 bg-zinc-800 text-zinc-300',
  }

  return classNames[status] || 'border-zinc-700 bg-zinc-900 text-zinc-300'
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

function normalizePaymentAmount(amount) {
  const match = amount.match(/\d+(?:[.,]\d{1,2})?/)

  if (!match) {
    return null
  }

  const normalizedAmount = Number(match[0].replace(',', '.'))

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return null
  }

  return normalizedAmount.toFixed(2)
}

function DashboardPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [commissionRequests, setCommissionRequests] = useState([])
  const [paymentTransactions, setPaymentTransactions] = useState([])
  const [error, setError] = useState('')
  const [notificationsError, setNotificationsError] = useState('')
  const [commissionError, setCommissionError] = useState('')
  const [commissionNoteError, setCommissionNoteError] = useState('')
  const [commissionProposalError, setCommissionProposalError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [portfolioError, setPortfolioError] = useState('')
  const [profileImageUploadStatus, setProfileImageUploadStatus] = useState('')
  const [coverImageUploadStatus, setCoverImageUploadStatus] = useState('')
  const [portfolioImageUploadStatus, setPortfolioImageUploadStatus] = useState('')
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isCreatingPortfolioItem, setIsCreatingPortfolioItem] = useState(false)
  const [isSavingCommissionNote, setIsSavingCommissionNote] = useState(false)
  const [isSavingCommissionProposal, setIsSavingCommissionProposal] =
    useState(false)
  const [updatingCommissionId, setUpdatingCommissionId] = useState(null)
  const [paymentError, setPaymentError] = useState('')
  const [creatingPaymentCommissionId, setCreatingPaymentCommissionId] =
    useState(null)
  const [commissionStatusFilter, setCommissionStatusFilter] = useState('ALL')
  const [selectedCommissionRequest, setSelectedCommissionRequest] =
    useState(null)
  const [commissionNoteDraft, setCommissionNoteDraft] = useState('')
  const [commissionRejectionReason, setCommissionRejectionReason] =
    useState('')
  const [commissionProposalFormData, setCommissionProposalFormData] = useState({
    artistResponse: '',
    quotedPrice: '',
  })
  const [profileFormData, setProfileFormData] = useState({
    fullName: '',
    artistName: '',
    bio: '',
    location: '',
    profileImageUrl: '',
    coverImageUrl: '',
  })
  const [portfolioFormData, setPortfolioFormData] = useState({
    title: '',
    description: '',
    mediaType: 'IMAGE',
    mediaUrl: '',
    thumbnailUrl: '',
  })

  useEffect(() => {
    async function loadCurrentUser() {
      const token = getAuthToken()

      if (!token) {
        navigate('/login')
        return
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          removeAuthToken()
          navigate('/login')
          return
        }

        const data = await response.json()
        setUser(data)
        setProfileFormData({
          fullName: data.profile?.fullName || '',
          artistName: data.profile?.artistName || '',
          bio: data.profile?.bio || '',
          location: data.profile?.location || '',
          profileImageUrl: data.profile?.profileImageUrl || '',
          coverImageUrl: data.profile?.coverImageUrl || '',
        })

        const metricsResponse = await fetch(
          `${API_URL}/artists/me/metrics`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json()
          setMetrics(metricsData)
        }

        const notificationsResponse = await fetch(
          `${API_URL}/notifications/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (notificationsResponse.ok) {
          const notificationsData = await notificationsResponse.json()
          setNotifications(notificationsData)
        }

        const commissionsResponse = await fetch(
          `${API_URL}/commissions/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (commissionsResponse.ok) {
          const commissionsData = await commissionsResponse.json()
          setCommissionRequests(commissionsData)
        }
        const paymentsResponse = await fetch(`${API_URL}/payments/me`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
})

if (paymentsResponse.ok) {
  const paymentsData = await paymentsResponse.json()
  setPaymentTransactions(paymentsData)
}
      } catch {
        setError('No se pudo cargar tu dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    loadCurrentUser()
  }, [navigate])

  function handleLogout() {
    removeAuthToken()
    navigate('/login')
  }

  function handleProfileChange(event) {
    setProfileFormData({
      ...profileFormData,
      [event.target.name]: event.target.value,
    })
  }

  function handlePortfolioChange(event) {
    setPortfolioFormData({
      ...portfolioFormData,
      [event.target.name]: event.target.value,
    })
  }

  function openCreateModal() {
    setPortfolioError('')
    setPortfolioImageUploadStatus('')
    setIsCreateModalOpen(true)
  }

  function closeCreateModal() {
    if (!isCreatingPortfolioItem) {
      setIsCreateModalOpen(false)
    }
  }

  function openCommissionDetail(commissionRequest) {
    setCommissionNoteError('')
    setCommissionProposalError('')
    setPaymentError('')
    setCommissionNoteDraft(commissionRequest.artistNote || '')
    setCommissionProposalFormData({
      artistResponse: commissionRequest.artistResponse || '',
      quotedPrice: commissionRequest.quotedPrice || '',
    })
    setCommissionRejectionReason(commissionRequest.rejectionReason || '')
    setSelectedCommissionRequest(commissionRequest)
  }

  async function handleMarkNotificationAsRead(notificationId) {
    const token = getAuthToken()

    try {
      const response = await fetch(
        `${API_URL}/notifications/${notificationId}/read`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error('No se pudo actualizar la notificacion')
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification,
        ),
      )
    } catch (error) {
      setNotificationsError(error.message)
    }
  }

  async function handleMarkAllNotificationsAsRead() {
    const token = getAuthToken()

    try {
      const response = await fetch(
        `${API_URL}/notifications/read-all`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error('No se pudieron actualizar las notificaciones')
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          isRead: true,
        })),
      )
    } catch (error) {
      setNotificationsError(error.message)
    }
  }

  async function handleCreatePendingPayment(commissionRequest) {
    const token = getAuthToken()
    setPaymentError('')
    setCreatingPaymentCommissionId(commissionRequest.id)

    try {
      if (!commissionRequest.quotedPrice) {
        throw new Error(
          'La solicitud necesita una cotizacion antes de generar pago',
        )
      }

      const paymentAmount = normalizePaymentAmount(commissionRequest.quotedPrice)

      if (!paymentAmount) {
        throw new Error('La cotizacion debe incluir un monto numerico')
      }

      let paymentTransaction = paymentTransactions.find(
        (currentPaymentTransaction) =>
          currentPaymentTransaction.commissionRequestId ===
          commissionRequest.id,
      )

      if (!paymentTransaction) {
        const response = await fetch(
          `${API_URL}/payments/commissions/${commissionRequest.id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              amount: paymentAmount,
              currency: 'USD',
            }),
          },
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'No se pudo generar el pago')
        }

        paymentTransaction = await response.json()

        setPaymentTransactions((currentTransactions) => [
          paymentTransaction,
          ...currentTransactions,
        ])
      }

      if (paymentTransaction.providerOrderId) {
        return
      }

      const paypalOrderResponse = await fetch(
        `${API_URL}/payments/${paymentTransaction.id}/paypal-order`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!paypalOrderResponse.ok) {
        const errorData = await paypalOrderResponse.json()
        throw new Error(errorData.message || 'No se pudo crear la orden PayPal')
      }

      const updatedPaymentTransaction = await paypalOrderResponse.json()

      setPaymentTransactions((currentTransactions) => {
        const alreadyExists = currentTransactions.some(
          (paymentTransaction) =>
            paymentTransaction.id === updatedPaymentTransaction.id,
        )

        if (alreadyExists) {
          return currentTransactions.map((paymentTransaction) =>
            paymentTransaction.id === updatedPaymentTransaction.id
              ? updatedPaymentTransaction
              : paymentTransaction,
          )
        }

        return [updatedPaymentTransaction, ...currentTransactions]
      })
    } catch (error) {
      setPaymentError(error.message)
    } finally {
      setCreatingPaymentCommissionId(null)
    }
  }

  async function handleUpdateCommissionStatus(commissionRequestId, status) {
    const token = getAuthToken()
    setCommissionError('')
    setUpdatingCommissionId(commissionRequestId)

    try {
      if (status === 'REJECTED' && !commissionRejectionReason.trim()) {
        throw new Error('Debes escribir un motivo de rechazo')
      }

      const response = await fetch(
        `${API_URL}/commissions/${commissionRequestId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
            rejectionReason:
              status === 'REJECTED' ? commissionRejectionReason : undefined,
          }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.message || 'No se pudo actualizar la solicitud',
        )
      }

      const updatedCommissionRequest = await response.json()

      setCommissionRequests((currentRequests) =>
        currentRequests.map((commissionRequest) =>
          commissionRequest.id === updatedCommissionRequest.id
            ? updatedCommissionRequest
            : commissionRequest,
        ),
      )

      setSelectedCommissionRequest((currentRequest) =>
        currentRequest?.id === updatedCommissionRequest.id
          ? {
              ...currentRequest,
              ...updatedCommissionRequest,
            }
          : currentRequest,
      )
    } catch (error) {
      setCommissionError(error.message)
    } finally {
      setUpdatingCommissionId(null)
    }
  }

  function handleSelectedCommissionNoteChange(event) {
    setCommissionNoteDraft(event.target.value)
  }

  async function handleSaveCommissionNote() {
    if (!selectedCommissionRequest) {
      return
    }

    const token = getAuthToken()
    setCommissionNoteError('')
    setIsSavingCommissionNote(true)

    try {
      const response = await fetch(
        `${API_URL}/commissions/${selectedCommissionRequest.id}/note`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            artistNote: commissionNoteDraft,
          }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'No se pudo guardar la nota')
      }

      const updatedCommissionRequest = await response.json()

      setCommissionRequests((currentRequests) =>
        currentRequests.map((commissionRequest) =>
          commissionRequest.id === updatedCommissionRequest.id
            ? updatedCommissionRequest
            : commissionRequest,
        ),
      )

      setSelectedCommissionRequest(updatedCommissionRequest)
      setCommissionNoteDraft('')
    } catch (error) {
      setCommissionNoteError(error.message)
    } finally {
      setIsSavingCommissionNote(false)
    }
  }

  function handleSelectedCommissionProposalChange(event) {
    const { name, value } = event.target

    setCommissionProposalFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }))
  }

  async function handleAcceptCommissionRequest() {
    if (!selectedCommissionRequest) {
      return
    }

    const token = getAuthToken()
    setCommissionProposalError('')
    setIsSavingCommissionProposal(true)
    setUpdatingCommissionId(selectedCommissionRequest.id)

    try {
      const proposalResponse = await fetch(
        `${API_URL}/commissions/${selectedCommissionRequest.id}/proposal`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            artistResponse: commissionProposalFormData.artistResponse || '',
            quotedPrice: commissionProposalFormData.quotedPrice || '',
          }),
        },
      )

      if (!proposalResponse.ok) {
        const errorData = await proposalResponse.json()
        throw new Error(
          errorData.message || 'No se pudo guardar la propuesta',
        )
      }

      const updatedCommissionRequest = await proposalResponse.json()

      setCommissionRequests((currentRequests) =>
        currentRequests.map((commissionRequest) =>
          commissionRequest.id === updatedCommissionRequest.id
            ? updatedCommissionRequest
            : commissionRequest,
        ),
      )

      setSelectedCommissionRequest(updatedCommissionRequest)
      setCommissionProposalFormData({
        artistResponse: '',
        quotedPrice: '',
      })
    } catch (error) {
      setCommissionProposalError(error.message)
    } finally {
      setIsSavingCommissionProposal(false)
      setUpdatingCommissionId(null)
    }
  }

  async function handleConfirmCommissionRequest() {
    if (!selectedCommissionRequest) {
      return
    }

    await handleUpdateCommissionStatus(selectedCommissionRequest.id, 'ACCEPTED')
  }

  async function handleProfileImageUpload(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      setProfileImageUploadStatus('Subiendo imagen...')
      const result = await uploadImage(file)

      setProfileFormData((currentData) => ({
        ...currentData,
        profileImageUrl: result.url,
      }))

      setProfileImageUploadStatus('Imagen subida correctamente')
    } catch (error) {
      setProfileImageUploadStatus(error.message)
    }
  }

  async function handleCoverImageUpload(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      setCoverImageUploadStatus('Subiendo portada...')
      const result = await uploadImage(file)

      setProfileFormData((currentData) => ({
        ...currentData,
        coverImageUrl: result.url,
      }))

      setCoverImageUploadStatus('Portada subida correctamente')
    } catch (error) {
      setCoverImageUploadStatus(error.message)
    }
  }

  async function handlePortfolioImageUpload(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      setPortfolioImageUploadStatus('Subiendo imagen de la obra...')
      const result = await uploadImage(file)

      setPortfolioFormData((currentData) => ({
        ...currentData,
        mediaType: 'IMAGE',
        mediaUrl: result.url,
        thumbnailUrl: result.url,
      }))

      setPortfolioImageUploadStatus('Imagen de obra subida correctamente')
    } catch (error) {
      setPortfolioImageUploadStatus(error.message)
    }
  }

  async function handleUpdateProfile(event) {
    event.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    setIsUpdatingProfile(true)

    const token = getAuthToken()

    try {
      const response = await fetch(`${API_URL}/artists/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileFormData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'No se pudo actualizar el perfil')
      }

      const updatedProfile = await response.json()

      setUser((currentUser) => ({
        ...currentUser,
        profile: updatedProfile,
      }))

      setProfileSuccess('Perfil actualizado correctamente')
    } catch (error) {
      setProfileError(error.message)
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  async function handleCreatePortfolioItem(event) {
    event.preventDefault()
    setPortfolioError('')
    setIsCreatingPortfolioItem(true)

    const token = getAuthToken()

    try {
      if (!portfolioFormData.mediaUrl) {
        throw new Error('Debes subir una imagen para publicar la obra')
      }

      const response = await fetch(`${API_URL}/portfolio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(portfolioFormData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'No se pudo crear la obra')
      }

      const createdItem = await response.json()

      setUser((currentUser) => ({
        ...currentUser,
        profile: {
          ...currentUser.profile,
          portfolioItems: [
            createdItem,
            ...(currentUser.profile?.portfolioItems || []),
          ],
        },
      }))

      setMetrics((currentMetrics) =>
        currentMetrics
          ? {
              ...currentMetrics,
              totalWorks: currentMetrics.totalWorks + 1,
            }
          : currentMetrics,
      )

      setPortfolioFormData({
        title: '',
        description: '',
        mediaType: 'IMAGE',
        mediaUrl: '',
        thumbnailUrl: '',
      })
      setPortfolioImageUploadStatus('')
      setIsCreateModalOpen(false)
    } catch (error) {
      setPortfolioError(error.message)
    } finally {
      setIsCreatingPortfolioItem(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <p className="text-zinc-300">Cargando dashboard...</p>
      </main>
    )
  }

  const profilePreviewName =
    profileFormData.artistName ||
    profileFormData.fullName ||
    user?.email ||
    'Artista'
  const profilePreviewInitial = profilePreviewName.charAt(0).toUpperCase()
  const profileUrl = user?.profile?.id ? `/artists/${user.profile.id}` : '/'
  const works = user?.profile?.portfolioItems || []

  const pendingCommissions = commissionRequests.filter(
    (commissionRequest) => commissionRequest.status === 'PENDING',
  )
  const reviewedCommissions = commissionRequests.filter(
    (commissionRequest) => commissionRequest.status === 'REVIEWED',
  )
  const proposedCommissions = commissionRequests.filter(
    (commissionRequest) => commissionRequest.status === 'PROPOSED',
  )
  const clientAcceptedCommissions = commissionRequests.filter(
    (commissionRequest) => commissionRequest.status === 'CLIENT_ACCEPTED',
  )
  const clientRejectedCommissions = commissionRequests.filter(
    (commissionRequest) => commissionRequest.status === 'CLIENT_REJECTED',
  )
  const acceptedCommissions = commissionRequests.filter(
    (commissionRequest) => commissionRequest.status === 'ACCEPTED',
  )
  const rejectedCommissions = commissionRequests.filter(
    (commissionRequest) => commissionRequest.status === 'REJECTED',
  )
  const visibleCommissionRequests =
    commissionStatusFilter === 'ALL'
      ? commissionRequests
      : commissionRequests.filter(
          (commissionRequest) =>
            commissionRequest.status === commissionStatusFilter,
        )
  const commissionStatusFilters = [
    {
      value: 'ALL',
      label: 'Todas',
      count: commissionRequests.length,
    },
    {
      value: 'PENDING',
      label: 'Pendientes',
      count: pendingCommissions.length,
    },
    {
      value: 'REVIEWED',
      label: 'En revision',
      count: reviewedCommissions.length,
    },
    {
      value: 'PROPOSED',
      label: 'Propuestas',
      count: proposedCommissions.length,
    },
    {
      value: 'CLIENT_ACCEPTED',
      label: 'Cliente acepto',
      count: clientAcceptedCommissions.length,
    },
    {
      value: 'CLIENT_REJECTED',
      label: 'Cliente rechazo',
      count: clientRejectedCommissions.length,
    },
    {
      value: 'ACCEPTED',
      label: 'Aceptadas',
      count: acceptedCommissions.length,
    },
    {
      value: 'REJECTED',
      label: 'Rechazadas',
      count: rejectedCommissions.length,
    },
  ]
  const unreadNotificationCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length
  const selectedCommissionPayment = selectedCommissionRequest
    ? paymentTransactions.find(
        (paymentTransaction) =>
          paymentTransaction.commissionRequestId ===
          selectedCommissionRequest.id,
      )
    : null
  const canCreateSelectedCommissionPayment =
    selectedCommissionRequest?.status === 'ACCEPTED' &&
    selectedCommissionRequest?.quotedPrice &&
    !selectedCommissionPayment?.providerOrderId
  const selectedPaymentCheckoutUrl = selectedCommissionPayment?.providerOrderId
    ? `${window.location.origin}/payments/checkout/${selectedCommissionPayment.providerOrderId}`
    : ''

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-900 pb-6">
          <Link to="/" className="text-sm font-bold uppercase text-violet-400">
            Atrium
          </Link>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                title="Notificaciones"
                aria-label="Notificaciones"
                onClick={() =>
                  setIsNotificationsOpen(
                    (currentIsOpen) => !currentIsOpen,
                  )
                }
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-md border border-zinc-800 text-zinc-200 transition hover:border-violet-400 hover:text-violet-300"
              >
                <BellIcon />

                {unreadNotificationCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-violet-400 px-1 text-xs font-bold text-zinc-950">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 top-14 z-40 w-[min(90vw,380px)] rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-2xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Notificaciones
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Actividad reciente de tu cuenta.
                      </p>
                    </div>

                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllNotificationsAsRead}
                        className="text-xs font-semibold text-violet-300 hover:text-violet-200"
                      >
                        Marcar todas
                      </button>
                    )}
                  </div>

                  {notificationsError && (
                    <p className="mt-3 text-sm text-red-400">
                      {notificationsError}
                    </p>
                  )}

                  <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="rounded-md border border-dashed border-zinc-800 p-4 text-sm text-zinc-500">
                        No tienes notificaciones todavia.
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() =>
                            handleMarkNotificationAsRead(notification.id)
                          }
                          className={`w-full rounded-md border p-4 text-left transition ${
                            notification.isRead
                              ? 'border-zinc-800 bg-zinc-950 text-zinc-400'
                              : 'border-violet-400/50 bg-violet-400/10 text-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
                                {getNotificationTypeLabel(notification.type)}
                              </p>
                              <p className="mt-1 text-sm font-semibold">
                                {notification.title}
                              </p>
                            </div>

                            {!notification.isRead && (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                            )}
                          </div>

                          <p className="mt-2 text-sm leading-6 text-zinc-300">
                            {notification.message}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link
              to={profileUrl}
              className="rounded-md px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-900"
            >
              Mi perfil
            </Link>

            <Button variant="secondary" onClick={handleLogout}>
              Cerrar sesion
            </Button>
          </div>
        </div>

        {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

        {user && (
          <>
            <section className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
                  Dashboard
                </p>

                <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                  Hola, {getProfileDisplayName(user.profile) || user.email}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                  Administra tu perfil, publica obras y revisa el rendimiento de
                  tu portafolio desde un solo lugar.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={openCreateModal}>Publicar obra</Button>

                  <Link
                    to={profileUrl}
                    className="rounded-md border border-zinc-700 px-5 py-3 font-semibold text-white transition hover:bg-zinc-950"
                  >
                    Ver perfil publico
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
                  <p className="text-sm text-zinc-400">Email</p>
                  <p className="mt-2 break-all font-semibold">{user.email}</p>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
                  <p className="text-sm text-zinc-400">Rol</p>
                  <p className="mt-2 font-semibold">{user.role}</p>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
                  <p className="text-sm text-zinc-400">Categoria</p>
                  <p className="mt-2 font-semibold">
                    {user.profile?.category?.name || 'Sin categoria'}
                  </p>
                </div>
              </div>
            </section>

            {metrics && (
              <section className="mt-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
                    Metricas
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    Actividad de tu portafolio
                  </h2>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <MetricCard label="Obras publicadas" value={metrics.totalWorks} />
                  <MetricCard label="Vistas totales" value={metrics.totalViews} />
                  <MetricCard label="Me gusta totales" value={metrics.totalLikes} />
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
                    <p className="text-sm text-zinc-400">Obra mas vista</p>
                    <p className="mt-2 font-semibold text-white">
                      {metrics.topViewedWork?.title || 'Sin datos todavia'}
                    </p>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
                    <p className="text-sm text-zinc-400">
                      Obra con mas me gusta
                    </p>
                    <p className="mt-2 font-semibold text-white">
                      {metrics.topLikedWork?.title || 'Sin datos todavia'}
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section className="mt-8">
  <div>
    <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
      Pagos
    </p>
    <h2 className="mt-2 text-2xl font-bold text-white">
      Pagos y transacciones
    </h2>
    <p className="mt-2 text-sm text-zinc-400">
      Seguimiento de pagos generados desde solicitudes de comision.
    </p>
  </div>

  {paymentTransactions.length === 0 ? (
    <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-400">
        Todavia no hay transacciones de pago registradas.
      </p>
    </div>
  ) : (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      {paymentTransactions.map((paymentTransaction) => (
        <article
          key={paymentTransaction.id}
          className="rounded-lg border border-zinc-800 bg-zinc-900 p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-400">Cliente</p>
              <h3 className="mt-1 text-lg font-bold text-white">
                {paymentTransaction.commissionRequest?.clientName ||
                  'Cliente sin nombre'}
              </h3>
            </div>

            <span
              className={`rounded-md border px-3 py-1 text-xs font-semibold ${getPaymentStatusClassName(
                paymentTransaction.status,
              )}`}
            >
              {getPaymentStatusLabel(paymentTransaction.status)}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-zinc-500">Monto</p>
              <p className="mt-1 font-semibold text-white">
                {paymentTransaction.amount} {paymentTransaction.currency}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-zinc-500">Proveedor</p>
              <p className="mt-1 font-semibold text-white">
                {paymentTransaction.provider}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-zinc-500">Comision</p>
              <p className="mt-1 font-semibold text-white">
                {getCommissionStatusLabel(
                  paymentTransaction.commissionRequest?.status,
                )}
              </p>
            </div>
          </div>

          {paymentTransaction.commissionRequest?.artistResponse && (
            <p className="mt-4 text-sm leading-6 text-zinc-300">
              {paymentTransaction.commissionRequest.artistResponse}
            </p>
          )}
        </article>
      ))}
    </div>
  )}
</section>

            <section className="mt-10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
                    Comisiones
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    Solicitudes recibidas
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Revisa posibles trabajos y actualiza su estado desde tu
                    dashboard.
                  </p>
                </div>

                <span className="rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-300">
                  {commissionRequests.length} solicitudes
                </span>
              </div>
              {commissionError && (
                <p className="mt-4 text-sm text-red-400">{commissionError}</p>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                {commissionStatusFilters.map((filter) => {
                  const isActive = commissionStatusFilter === filter.value

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setCommissionStatusFilter(filter.value)}
                      className={`rounded-lg border px-5 py-4 text-left transition hover:-translate-y-0.5 ${getCommissionStatusClassName(
                        filter.value,
                      )} ${isActive ? 'ring-2 ring-violet-300/70' : ''}`}
                    >
                      <span className="block text-xs font-semibold uppercase tracking-wide">
                        {filter.label}
                      </span>
                      <span className="mt-2 block text-2xl font-bold">
                        {filter.count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {visibleCommissionRequests.length > 0 ? (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {visibleCommissionRequests.map((commissionRequest) => (
                    <article
                      key={commissionRequest.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-900 p-5"
                    >
                      <button
                        type="button"
                        onClick={() => openCommissionDetail(commissionRequest)}
                        className="mb-4 text-sm font-semibold text-violet-300 transition hover:text-violet-200"
                      >
                        Ver detalle
                      </button>

                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
                            Solicitud de comision
                          </p>
                          <h3 className="mt-2 text-xl font-bold text-white">
                            {commissionRequest.clientName}
                          </h3>
                          <p className="mt-1 break-all text-sm text-zinc-400">
                            {commissionRequest.clientEmail}
                          </p>
                        </div>

                        <span
                          className={`rounded-md border px-3 py-1 text-xs font-semibold ${getCommissionStatusClassName(
                            commissionRequest.status,
                          )}`}
                        >
                          {getCommissionStatusLabel(commissionRequest.status)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
                          <p className="text-xs text-zinc-500">Presupuesto</p>
                          <p className="mt-1 font-semibold text-zinc-200">
                            {commissionRequest.budget || 'No especificado'}
                          </p>
                        </div>

                        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
                          <p className="text-xs text-zinc-500">Recibida</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-200">
                            {formatCommissionDate(
                              commissionRequest.createdAt,
                            )}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 whitespace-pre-line text-sm leading-6 text-zinc-300">
                        {commissionRequest.message}
                      </p>

                      {commissionRequest.artistNote && (
                        <div className="mt-4 rounded-md border border-violet-400/30 bg-violet-400/10 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
                            Nota interna
                          </p>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-300">
                            {commissionRequest.artistNote}
                          </p>
                        </div>
                      )}

                      {(commissionRequest.artistResponse ||
                        commissionRequest.quotedPrice) && (
                        <div className="mt-4 rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                            Propuesta
                          </p>
                          {commissionRequest.quotedPrice && (
                            <p className="mt-2 text-sm font-semibold text-white">
                              {commissionRequest.quotedPrice}
                            </p>
                          )}
                          {commissionRequest.artistResponse && (
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-300">
                              {commissionRequest.artistResponse}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={
                            updatingCommissionId === commissionRequest.id ||
                            commissionRequest.status !== 'PENDING'
                          }
                          onClick={() =>
                            handleUpdateCommissionStatus(
                              commissionRequest.id,
                              'REVIEWED',
                            )
                          }
                          className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-sky-400 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Poner en revision
                        </button>

                        <button
                          type="button"
                          disabled={
                            updatingCommissionId === commissionRequest.id ||
                            commissionRequest.status !== 'CLIENT_ACCEPTED'
                          }
                          onClick={() =>
                            handleUpdateCommissionStatus(
                              commissionRequest.id,
                              'ACCEPTED',
                            )
                          }
                          className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-emerald-400 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Confirmar
                        </button>

                        <button
                          type="button"
                          onClick={() => openCommissionDetail(commissionRequest)}
                          className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Gestionar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-lg border border-dashed border-zinc-700 p-8 text-center">
                  <p className="font-semibold text-zinc-200">
                    No hay solicitudes en este filtro.
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Cambia el filtro o espera a que alguien use el formulario de
                    tu perfil publico.
                  </p>
                </div>
              )}
            </section>

            <section className="mt-10">
              <div className="mb-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
                  Perfil publico
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  Vista editorial del artista
                </h2>
              </div>

              <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                <div className="h-64 bg-zinc-800">
                  {profileFormData.coverImageUrl && (
                    <img
                      src={profileFormData.coverImageUrl}
                      alt="Portada del perfil"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px]">
                  <div className="flex gap-5">
                    <div className="-mt-20 flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-zinc-900 bg-zinc-800 text-4xl font-bold text-white">
                      {profileFormData.profileImageUrl ? (
                        <img
                          src={profileFormData.profileImageUrl}
                          alt="Foto de perfil"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        profilePreviewInitial
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
                        Vista previa
                      </p>
                      <h3 className="mt-2 text-3xl font-bold">
                        {profilePreviewName}
                      </h3>

                      {profileFormData.fullName &&
                        profileFormData.artistName && (
                          <p className="mt-1 text-zinc-400">
                            {profileFormData.fullName}
                          </p>
                        )}

                      <p className="mt-1 text-sm text-zinc-400">
                        {profileFormData.location || 'Sin ubicacion'}
                      </p>

                      {profileFormData.bio && (
                        <p className="mt-5 max-w-2xl leading-7 text-zinc-300">
                          {profileFormData.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                    <p className="text-sm text-zinc-400">Portafolio</p>
                    <p className="mt-2 text-3xl font-bold">{works.length}</p>
                    <p className="mt-2 text-sm text-zinc-500">
                      Obras publicadas en tu perfil.
                    </p>
                  </div>
                </div>
              </div>

              <form
                className="mt-6 grid gap-5 rounded-lg border border-zinc-800 bg-zinc-900 p-6"
                onSubmit={handleUpdateProfile}
              >
                <div>
                  <h3 className="text-xl font-bold">Editar datos publicos</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Estos datos se muestran en tu pagina publica.
                  </p>
                </div>

                {profileError && (
                  <p className="text-sm text-red-400">{profileError}</p>
                )}

                {profileSuccess && (
                  <p className="text-sm text-green-400">{profileSuccess}</p>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-zinc-300">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={profileFormData.fullName}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-zinc-300">
                      Nombre artistico
                    </label>
                    <input
                      type="text"
                      name="artistName"
                      value={profileFormData.artistName}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-300">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={profileFormData.bio}
                    onChange={handleProfileChange}
                    rows="4"
                    className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-300">
                    Ubicacion
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={profileFormData.location}
                    onChange={handleProfileChange}
                    className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <UploadAction
                    title="Foto de perfil"
                    description="Sube una imagen cuadrada para que se vea mejor."
                    buttonLabel="Seleccionar foto"
                    status={profileImageUploadStatus}
                    onChange={handleProfileImageUpload}
                  />

                  <UploadAction
                    title="Portada del perfil"
                    description="Usa una imagen horizontal para mejorar la presentacion."
                    buttonLabel="Seleccionar portada"
                    status={coverImageUploadStatus}
                    onChange={handleCoverImageUpload}
                  />
                </div>

                <Button>
                  {isUpdatingProfile ? 'Guardando...' : 'Guardar perfil'}
                </Button>
              </form>
            </section>

            <section className="mt-10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
                    Portafolio
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">Mis obras</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Administra las obras visibles en tu perfil publico.
                  </p>
                </div>

                <Button onClick={openCreateModal}>Publicar obra</Button>
              </div>

              {works.length > 0 ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {works.map((item) => (
                    <PortfolioItemCard
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      description={item.description}
                      mediaType={item.mediaType}
                      mediaUrl={item.mediaUrl}
                      thumbnailUrl={item.thumbnailUrl}
                      artistName={getProfileDisplayName(user.profile)}
                      viewCount={item.viewCount}
                      likeCount={item.likeCount}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-lg border border-dashed border-zinc-700 p-8 text-center text-zinc-400">
                  Todavia no has publicado obras en tu portafolio.
                </div>
              )}
            </section>
          </>
        )}
      </section>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4 py-8">
          <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
                  Nueva obra
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  Publicar en portafolio
                </h2>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
              >
                Cerrar
              </button>
            </div>

            <form className="mt-6 grid gap-4" onSubmit={handleCreatePortfolioItem}>
              {portfolioError && (
                <p className="text-sm text-red-400">{portfolioError}</p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-zinc-300">
                    Titulo
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={portfolioFormData.title}
                    onChange={handlePortfolioChange}
                    required
                    className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-300">
                    Tipo de medio
                  </label>
                  <select
                    name="mediaType"
                    value={portfolioFormData.mediaType}
                    onChange={handlePortfolioChange}
                    required
                    className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                  >
                    <option value="IMAGE">Imagen</option>
                    <option value="VIDEO">Video</option>
                    <option value="AUDIO">Audio</option>
                    <option value="EMBED">Embed</option>
                  </select>
                </div>
              </div>

              <UploadAction
                title="Imagen de la obra"
                description="Sube una imagen real desde tu computadora."
                buttonLabel="Seleccionar imagen"
                status={portfolioImageUploadStatus}
                onChange={handlePortfolioImageUpload}
              />

              {portfolioFormData.mediaUrl && (
                <img
                  src={portfolioFormData.mediaUrl}
                  alt="Vista previa de la obra"
                  className="max-h-72 w-full rounded-lg border border-zinc-800 object-contain"
                />
              )}

              <div>
                <label className="text-sm font-medium text-zinc-300">
                  Descripcion
                </label>
                <textarea
                  name="description"
                  value={portfolioFormData.description}
                  onChange={handlePortfolioChange}
                  rows="4"
                  className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <Button type="button" variant="secondary" onClick={closeCreateModal}>
                  Cancelar
                </Button>

                <Button>
                  {isCreatingPortfolioItem ? 'Publicando...' : 'Publicar obra'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedCommissionRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4 py-8">
          <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
                  Detalle de comision
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  {selectedCommissionRequest.clientName}
                </h2>
                <p className="mt-1 break-all text-sm text-zinc-400">
                  {selectedCommissionRequest.clientEmail}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCommissionRequest(null)}
                className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-md border px-3 py-2 text-xs font-semibold ${getCommissionStatusClassName(
                  selectedCommissionRequest.status,
                )}`}
              >
                {getCommissionStatusLabel(selectedCommissionRequest.status)}
              </span>

              <span className="text-sm text-zinc-500">
                Recibida el{' '}
                {formatCommissionDate(selectedCommissionRequest.createdAt)}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Presupuesto
                </p>
                <p className="mt-2 text-lg font-bold text-white">
                  {selectedCommissionRequest.budget || 'No especificado'}
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Contacto
                </p>
                <p className="mt-2 break-all text-sm font-semibold text-white">
                  {selectedCommissionRequest.clientEmail}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Mensaje del cliente
              </p>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-300">
                {selectedCommissionRequest.message}
              </p>
            </div>

            <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
                    Nota interna
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Esta nota solo la ve el artista. Sirve para recordar ideas,
                    precios o siguientes pasos.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSaveCommissionNote}
                  disabled={isSavingCommissionNote}
                  className="rounded-md bg-violet-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingCommissionNote ? 'Guardando...' : 'Guardar nota'}
                </button>
              </div>

              {commissionNoteError && (
                <p className="mt-3 text-sm text-red-400">
                  {commissionNoteError}
                </p>
              )}

              {selectedCommissionRequest.artistNote && (
                <div className="mt-4 rounded-md border border-violet-400/30 bg-violet-400/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
                    Nota guardada
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-300">
                    {selectedCommissionRequest.artistNote}
                  </p>
                </div>
              )}

              <textarea
                value={commissionNoteDraft}
                onChange={handleSelectedCommissionNoteChange}
                rows="4"
                placeholder="Escribe una nota nueva o modifica la nota actual."
                className="mt-4 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              />
            </div>

            <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                    Respuesta y cotizacion
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Esta propuesta se enviara al cliente para que pueda aceptarla o rechazarla.
                  </p>
                </div>
              </div>

              {commissionProposalError && (
                <p className="mt-3 text-sm text-red-400">
                  {commissionProposalError}
                </p>
              )}

              {(selectedCommissionRequest.quotedPrice ||
                selectedCommissionRequest.artistResponse) && (
                <div className="mt-4 rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                    Propuesta guardada
                  </p>
                  {selectedCommissionRequest.quotedPrice && (
                    <p className="mt-2 text-sm font-semibold text-white">
                      {selectedCommissionRequest.quotedPrice}
                    </p>
                  )}
                  {selectedCommissionRequest.artistResponse && (
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-300">
                      {selectedCommissionRequest.artistResponse}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4">
                <label className="text-sm font-medium text-zinc-300">
                  Precio o rango estimado
                </label>
                <input
                  type="text"
                  name="quotedPrice"
                  value={commissionProposalFormData.quotedPrice}
                  onChange={handleSelectedCommissionProposalChange}
                  placeholder="Ejemplo: L 2500, $150 o A negociar"
                  className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-zinc-300">
                  Respuesta inicial para el cliente
                </label>
                <textarea
                  name="artistResponse"
                  value={commissionProposalFormData.artistResponse}
                  onChange={handleSelectedCommissionProposalChange}
                  rows="4"
                  placeholder="Ejemplo: Puedo trabajar esta pieza en dos semanas. Necesitaria referencias visuales y confirmacion del formato final."
                  className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                Motivo de rechazo
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Este mensaje se enviara al cliente si decides rechazar la solicitud.
              </p>
              <textarea
                value={commissionRejectionReason}
                onChange={(event) =>
                  setCommissionRejectionReason(event.target.value)
                }
                rows="3"
                placeholder="Ejemplo: No puedo tomar esta solicitud por disponibilidad o alcance del proyecto."
                className="mt-4 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
              />
            </div>

            {selectedCommissionRequest.status === 'ACCEPTED' && (
              <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
                      Pago
                    </p>
                    <h3 className="mt-2 text-lg font-bold text-white">
                      Transaccion de la comision
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      Crea el pago pendiente para conectarlo luego con PayPal.
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

                {selectedCommissionPayment && (
                  <div className="mt-4 grid gap-3 rounded-md border border-zinc-800 bg-zinc-900 p-3 sm:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase text-zinc-500">Monto</p>
                      <p className="mt-1 font-semibold text-white">
                        {selectedCommissionPayment.amount}{' '}
                        {selectedCommissionPayment.currency}
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
                      <p className="text-xs uppercase text-zinc-500">Estado</p>
                      <p className="mt-1 font-semibold text-white">
                        {getPaymentStatusLabel(selectedCommissionPayment.status)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase text-zinc-500">
                        Orden PayPal
                      </p>
                      <p className="mt-1 break-all font-semibold text-white">
                        {selectedCommissionPayment.providerOrderId ||
                          'No generada'}
                      </p>
                    </div>
                  </div>
                )}
                {selectedPaymentCheckoutUrl && (
                  <div className="mt-4 rounded-md border border-violet-400/30 bg-violet-400/10 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
                      Enlace de pago para el cliente
                    </p>
                    <a
                      href={selectedPaymentCheckoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block break-all text-sm font-semibold text-violet-200 hover:text-violet-100"
                    >
                      {selectedPaymentCheckoutUrl}
                    </a>
                  </div>
                )}

                {canCreateSelectedCommissionPayment && (
                  <button
                    type="button"
                    disabled={
                      creatingPaymentCommissionId === selectedCommissionRequest.id
                    }
                    onClick={() =>
                      handleCreatePendingPayment(selectedCommissionRequest)
                    }
                    className="mt-4 rounded-md bg-violet-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creatingPaymentCommissionId === selectedCommissionRequest.id
                      ? 'Generando pago...'
                      : selectedCommissionPayment
                        ? 'Generar orden PayPal'
                        : 'Generar pago pendiente'}
                  </button>
                )}

                {paymentError && (
                  <p className="mt-3 text-sm text-red-400">{paymentError}</p>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={
                  updatingCommissionId === selectedCommissionRequest.id ||
                  selectedCommissionRequest.status !== 'PENDING'
                }
                onClick={() =>
                  handleUpdateCommissionStatus(
                    selectedCommissionRequest.id,
                    'REVIEWED',
                  )
                }
                className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-sky-400 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Poner en revision
              </button>

              <button
                type="button"
                disabled={
                  updatingCommissionId === selectedCommissionRequest.id ||
                  selectedCommissionRequest.status === 'REJECTED' ||
                  selectedCommissionRequest.status === 'ACCEPTED' ||
                  isSavingCommissionProposal
                }
                onClick={handleAcceptCommissionRequest}
                className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-emerald-400 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingCommissionProposal
                  ? 'Enviando...'
                  : 'Enviar propuesta'}
              </button>

              <button
                type="button"
                disabled={
                  updatingCommissionId === selectedCommissionRequest.id ||
                  selectedCommissionRequest.status !== 'CLIENT_ACCEPTED'
                }
                onClick={handleConfirmCommissionRequest}
                className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-emerald-400 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmar comision
              </button>

              <button
                type="button"
                disabled={
                  updatingCommissionId === selectedCommissionRequest.id ||
                  selectedCommissionRequest.status === 'REJECTED'
                }
                onClick={() =>
                  handleUpdateCommissionStatus(
                    selectedCommissionRequest.id,
                    'REJECTED',
                  )
                }
                className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default DashboardPage
