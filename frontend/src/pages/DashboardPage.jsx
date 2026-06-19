import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import PortfolioItemCard from '../components/PortfolioItemCard'
import { API_URL } from '../config/api'
import { getAuthToken, removeAuthToken, saveAuthUser } from '../utils/auth'
import {
  getCommissionFinalDownloadUrl,
  uploadAttachments,
  uploadCommissionFinalFile,
  uploadFile,
  uploadImage,
  uploadPortfolioFile,
} from '../utils/uploads'

function getProfileDisplayName(profile) {
  return profile?.artistName || profile?.fullName
}

function getPortfolioMediaType(file) {
  if (file.mimeType?.startsWith('video/')) {
    return 'VIDEO'
  }

  if (file.mimeType === 'application/pdf') {
    return 'PDF'
  }

  return 'IMAGE'
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  )
}

function UploadAction({
  title,
  description,
  buttonLabel,
  status,
  onChange,
  accept = 'image/*',
  multiple = false,
}) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div>
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
      </div>

      <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-violet-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-violet-300">
        {buttonLabel}
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={onChange}
          className="sr-only"
        />
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
    PAYMENT_PENDING: 'Pago pendiente',
    IN_PROGRESS: 'En trabajo',
    DELIVERED: 'Entregada',
    REVISION_REQUESTED: 'Cambios solicitados',
    COMPLETED: 'Completada',
    REJECTED: 'Rechazada',
    CANCELLED_BY_CLIENT: 'Cancelada por cliente',
    CANCELLED_BY_ARTIST: 'Cancelada por artista',
    DISPUTED: 'En disputa',
  }

  return labels[status] || status
}

function getServiceModeLabel(serviceMode) {
  const labels = {
    ONLINE: 'Online',
    IN_PERSON: 'Presencial',
    BOTH: 'Online y presencial',
  }

  return labels[serviceMode] || 'Online'
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

  return (
    classNames[status] || 'border-zinc-700 bg-zinc-900 text-zinc-300'
  )
}

function getJobApplicationStatusLabel(status) {
  const labels = {
    PENDING: 'Pendiente',
    SHORTLISTED: 'Preseleccionada',
    ACCEPTED: 'Aceptada',
    REJECTED: 'Rechazada',
    WITHDRAWN: 'Retirada',
  }

  return labels[status] || status
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
  const [categories, setCategories] = useState([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [commissionRequests, setCommissionRequests] = useState([])
  const [jobApplications, setJobApplications] = useState([])
  const [paymentTransactions, setPaymentTransactions] = useState([])
  const [error, setError] = useState('')
  const [notificationsError, setNotificationsError] = useState('')
  const [commissionError, setCommissionError] = useState('')
  const [commissionNoteError, setCommissionNoteError] = useState('')
  const [commissionProposalError, setCommissionProposalError] = useState('')
  const [commissionDeliveryError, setCommissionDeliveryError] = useState('')
  const [clientReviewError, setClientReviewError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingPortfolioItem, setEditingPortfolioItem] = useState(null)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [portfolioError, setPortfolioError] = useState('')
  const [profileImageUploadStatus, setProfileImageUploadStatus] = useState('')
  const [coverImageUploadStatus, setCoverImageUploadStatus] = useState('')
  const [portfolioImageUploadStatus, setPortfolioImageUploadStatus] = useState('')
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isCreatingPortfolioItem, setIsCreatingPortfolioItem] = useState(false)
  const [isDeletingPortfolioItemId, setIsDeletingPortfolioItemId] =
    useState(null)
  const [isSavingCommissionNote, setIsSavingCommissionNote] = useState(false)
  const [isSavingCommissionProposal, setIsSavingCommissionProposal] =
    useState(false)
  const [isDeliveringCommission, setIsDeliveringCommission] = useState(false)
  const [isOpeningDispute, setIsOpeningDispute] = useState(false)
  const [isPreparingFinalDownload, setIsPreparingFinalDownload] = useState(false)
  const [isSavingClientReview, setIsSavingClientReview] = useState(false)
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
    includedRevisions: '1',
    extraRevisionPrice: '',
    cancellationRetentionPercent: '0',
  })
  const [commissionDeliveryFormData, setCommissionDeliveryFormData] = useState({
    deliveryMessage: '',
    deliveryUrl: '',
    deliveryPreviewUrl: '',
    finalFileUrl: '',
    previewAttachments: [],
    finalAttachments: [],
  })
  const [commissionDeliveryUploadStatus, setCommissionDeliveryUploadStatus] =
    useState('')
  const [disputeEvidenceAttachments, setDisputeEvidenceAttachments] = useState([])
  const [disputeUploadStatus, setDisputeUploadStatus] = useState('')
  const [clientReviewFormData, setClientReviewFormData] = useState({
    rating: '5',
    comment: '',
  })
  const [profileFormData, setProfileFormData] = useState({
    categoryId: '',
    fullName: '',
    artistName: '',
    bio: '',
    location: '',
    profileImageUrl: '',
    coverImageUrl: '',
    commissionTypes: '',
    startingPrice: '',
    servicePriceRange: '',
    serviceMode: 'ONLINE',
    serviceArea: '',
    serviceDescription: '',
    interests: '',
  })
  const [portfolioFormData, setPortfolioFormData] = useState({
    title: '',
    description: '',
    mediaType: 'IMAGE',
    mediaUrl: '',
    thumbnailUrl: '',
    assets: [],
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
        saveAuthUser(data)

        setUser(data)
        setProfileFormData({
          categoryId: data.profile?.categoryId || '',
          fullName: data.profile?.fullName || '',
          artistName: data.profile?.artistName || '',
          bio: data.profile?.bio || '',
          location: data.profile?.location || '',
          profileImageUrl: data.profile?.profileImageUrl || '',
          coverImageUrl: data.profile?.coverImageUrl || '',
          commissionTypes: data.profile?.commissionTypes || '',
          startingPrice: data.profile?.startingPrice || '',
          servicePriceRange: data.profile?.servicePriceRange || '',
          serviceMode: data.profile?.serviceMode || 'ONLINE',
          serviceArea: data.profile?.serviceArea || '',
          serviceDescription: data.profile?.serviceDescription || '',
          interests: data.profile?.interests || '',
        })

        const categoriesResponse = await fetch(`${API_URL}/artist-categories`)

        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          setCategories(categoriesData)
        }

        setIsLoadingCategories(false)

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

        if (!data.profile) {
          return
        }

        const metricsResponse = await fetch(`${API_URL}/artists/me/metrics`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json()
          setMetrics(metricsData)
        }

        const commissionsResponse = await fetch(`${API_URL}/commissions/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (commissionsResponse.ok) {
          const commissionsData = await commissionsResponse.json()
          setCommissionRequests(commissionsData)
        }

        const jobApplicationsResponse = await fetch(
          `${API_URL}/job-posts/applications/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (jobApplicationsResponse.ok) {
          const jobApplicationsData = await jobApplicationsResponse.json()
          setJobApplications(jobApplicationsData)
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
        setIsLoadingCategories(false)
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
    setEditingPortfolioItem(null)
    setPortfolioFormData({
      title: '',
      description: '',
      mediaType: 'IMAGE',
      mediaUrl: '',
      thumbnailUrl: '',
      assets: [],
    })
    setPortfolioError('')
    setPortfolioImageUploadStatus('')
    setIsCreateModalOpen(true)
  }

  function closeCreateModal() {
    if (!isCreatingPortfolioItem) {
      setIsCreateModalOpen(false)
      setEditingPortfolioItem(null)
    }
  }

  function openEditPortfolioModal(item) {
    setEditingPortfolioItem(item)
    setPortfolioError('')
    setPortfolioImageUploadStatus('')
    setPortfolioFormData({
      title: item.title || '',
      description: item.description || '',
      mediaType: item.mediaType || 'IMAGE',
      mediaUrl: item.mediaUrl || '',
      thumbnailUrl: item.thumbnailUrl || '',
      assets:
        item.assets?.length > 0
          ? item.assets
          : item.mediaUrl
            ? [
                {
                  mediaType: item.mediaType || 'IMAGE',
                  url: item.mediaUrl,
                  thumbnailUrl: item.thumbnailUrl || '',
                },
              ]
            : [],
    })
    setIsCreateModalOpen(true)
  }

  function removePortfolioAsset(indexToRemove) {
    setPortfolioFormData((currentData) => {
      const assets = currentData.assets.filter((_, index) => index !== indexToRemove)
      const cover = assets[0]

      return {
        ...currentData,
        mediaType: cover?.mediaType || 'IMAGE',
        mediaUrl: cover?.url || '',
        thumbnailUrl: cover?.thumbnailUrl || '',
        assets: assets.map((asset, index) => ({
          ...asset,
          sortOrder: index,
        })),
      }
    })
  }

  function openCommissionDetail(commissionRequest) {
    setCommissionNoteError('')
    setCommissionProposalError('')
    setCommissionDeliveryError('')
    setClientReviewError('')
    setPaymentError('')
    setCommissionNoteDraft(commissionRequest.artistNote || '')
    setCommissionProposalFormData({
      artistResponse: commissionRequest.artistResponse || '',
      quotedPrice: commissionRequest.quotedPrice || '',
      includedRevisions: String(commissionRequest.includedRevisions ?? 1),
      extraRevisionPrice: commissionRequest.extraRevisionPrice || '',
      cancellationRetentionPercent: String(
        commissionRequest.cancellationRetentionPercent ?? 0,
      ),
    })
    setCommissionRejectionReason(commissionRequest.rejectionReason || '')
    setCommissionDeliveryFormData({
      deliveryMessage: commissionRequest.deliveryMessage || '',
      deliveryUrl: commissionRequest.deliveryUrl || '',
      deliveryPreviewUrl:
        commissionRequest.deliveryPreviewUrl ||
        commissionRequest.deliveryUrl ||
        '',
      finalFileUrl: commissionRequest.finalFileUrl || '',
      previewAttachments: [],
      finalAttachments: [],
    })
    setCommissionDeliveryUploadStatus('')
    setDisputeEvidenceAttachments([])
    setDisputeUploadStatus('')
    setClientReviewFormData({
      rating: commissionRequest.clientReview?.rating
        ? String(commissionRequest.clientReview.rating)
        : '5',
      comment: commissionRequest.clientReview?.comment || '',
    })
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

        setCommissionRequests((currentRequests) =>
          currentRequests.map((currentCommissionRequest) =>
            currentCommissionRequest.id === commissionRequest.id
              ? { ...currentCommissionRequest, status: 'PAYMENT_PENDING' }
              : currentCommissionRequest,
          ),
        )

        setSelectedCommissionRequest((currentRequest) =>
          currentRequest
            ? { ...currentRequest, status: 'PAYMENT_PENDING' }
            : currentRequest,
        )
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

  async function handleCancelSelectedCommission() {
    if (!selectedCommissionRequest) {
      return
    }

    const reason = window.prompt('Motivo de cancelacion')

    if (reason === null) {
      return
    }

    const token = getAuthToken()
    setCommissionError('')
    setUpdatingCommissionId(selectedCommissionRequest.id)

    try {
      const response = await fetch(
        `${API_URL}/commissions/${selectedCommissionRequest.id}/cancel`,
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

      const updatedCommissionRequest = await response.json()

      setCommissionRequests((currentRequests) =>
        currentRequests.map((commissionRequest) =>
          commissionRequest.id === updatedCommissionRequest.id
            ? updatedCommissionRequest
            : commissionRequest,
        ),
      )
      setSelectedCommissionRequest(updatedCommissionRequest)
    } catch (error) {
      setCommissionError(error.message)
    } finally {
      setUpdatingCommissionId(null)
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
    } catch (error) {
      setDisputeUploadStatus(error.message)
    } finally {
      event.target.value = ''
    }
  }

  async function handleOpenSelectedCommissionDispute() {
    if (!selectedCommissionRequest) {
      return
    }

    const reason = window.prompt('Motivo de la disputa')

    if (reason === null) {
      return
    }

    const token = getAuthToken()
    setCommissionError('')
    setIsOpeningDispute(true)

    try {
      const response = await fetch(
        `${API_URL}/commissions/${selectedCommissionRequest.id}/dispute`,
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

      const updatedCommissionRequest = await response.json()

      setCommissionRequests((currentRequests) =>
        currentRequests.map((commissionRequest) =>
          commissionRequest.id === updatedCommissionRequest.id
            ? updatedCommissionRequest
            : commissionRequest,
        ),
      )
      setSelectedCommissionRequest(updatedCommissionRequest)
      setDisputeEvidenceAttachments([])
      setDisputeUploadStatus('')
    } catch (error) {
      setCommissionError(error.message)
    } finally {
      setIsOpeningDispute(false)
    }
  }

  async function handleDownloadSelectedFinalFile(attachmentId) {
    if (!selectedCommissionRequest) {
      return
    }

    setCommissionDeliveryError('')
    setIsPreparingFinalDownload(true)

    try {
      const downloadUrl = await getCommissionFinalDownloadUrl(
        selectedCommissionRequest.id,
        attachmentId,
      )
      window.open(downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setCommissionDeliveryError(error.message)
    } finally {
      setIsPreparingFinalDownload(false)
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

  function handleSelectedCommissionDeliveryChange(event) {
    const { name, value } = event.target

    setCommissionDeliveryFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }))
  }

  async function handleCommissionDeliveryFileUpload(event, attachmentField) {
    const files = Array.from(event.target.files || [])

    if (files.length === 0) {
      return
    }

    setCommissionDeliveryUploadStatus('Subiendo archivos...')

    try {
      const upload =
        attachmentField === 'finalAttachments'
          ? uploadCommissionFinalFile
          : uploadFile
      const uploadedAttachments = await uploadAttachments(files, upload)

      setCommissionDeliveryFormData((currentData) => ({
        ...currentData,
        [attachmentField]: [
          ...currentData[attachmentField],
          ...uploadedAttachments,
        ],
      }))
      setCommissionDeliveryUploadStatus('Archivos adjuntados')
    } catch (error) {
      setCommissionDeliveryUploadStatus(error.message)
    } finally {
      event.target.value = ''
    }
  }

  function handleClientReviewChange(event) {
    const { name, value } = event.target

    setClientReviewFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }))
  }

  async function handleSaveClientReview(event) {
    event.preventDefault()

    if (!selectedCommissionRequest) {
      return
    }

    const token = getAuthToken()
    setClientReviewError('')
    setIsSavingClientReview(true)

    try {
      const response = await fetch(`${API_URL}/reviews/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          commissionRequestId: selectedCommissionRequest.id,
          rating: Number(clientReviewFormData.rating),
          comment: clientReviewFormData.comment,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'No se pudo guardar la review')
      }

      const clientReview = await response.json()
      const updatedCommissionRequest = {
        ...selectedCommissionRequest,
        clientReview,
      }

      setCommissionRequests((currentRequests) =>
        currentRequests.map((commissionRequest) =>
          commissionRequest.id === updatedCommissionRequest.id
            ? updatedCommissionRequest
            : commissionRequest,
        ),
      )
      setSelectedCommissionRequest(updatedCommissionRequest)
    } catch (error) {
      setClientReviewError(error.message)
    } finally {
      setIsSavingClientReview(false)
    }
  }

  async function handleDeliverCommission() {
    if (!selectedCommissionRequest) {
      return
    }

    const token = getAuthToken()
    setCommissionDeliveryError('')
    setIsDeliveringCommission(true)

    try {
      const response = await fetch(
        `${API_URL}/commissions/${selectedCommissionRequest.id}/delivery`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(commissionDeliveryFormData),
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'No se pudo enviar la entrega')
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
      setCommissionDeliveryFormData((currentData) => ({
        ...currentData,
        previewAttachments: [],
        finalAttachments: [],
      }))
      setCommissionDeliveryUploadStatus('')
    } catch (error) {
      setCommissionDeliveryError(error.message)
    } finally {
      setIsDeliveringCommission(false)
    }
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
      const currentUserResponse = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!currentUserResponse.ok) {
        removeAuthToken()
        navigate('/login')
        return
      }

      const currentUser = await currentUserResponse.json()
      saveAuthUser(currentUser)

      if (!currentUser.profile) {
        removeAuthToken()
        navigate('/login')
        throw new Error(
          'Estas usando una sesion de cliente. Inicia sesion con la cuenta del artista para enviar la propuesta.',
        )
      }

      if (
        selectedCommissionRequest.artistProfileId &&
        currentUser.profile.id !== selectedCommissionRequest.artistProfileId
      ) {
        throw new Error(
          'Esta solicitud pertenece a otro perfil de artista.',
        )
      }

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
            includedRevisions: Number(
              commissionProposalFormData.includedRevisions || 1,
            ),
            extraRevisionPrice:
              commissionProposalFormData.extraRevisionPrice || '',
            cancellationRetentionPercent: Number(
              commissionProposalFormData.cancellationRetentionPercent || 0,
            ),
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
        includedRevisions: '1',
        extraRevisionPrice: '',
        cancellationRetentionPercent: '0',
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

  async function handlePortfolioFilesUpload(event) {
    const files = Array.from(event.target.files || [])

    if (files.length === 0) {
      return
    }

    try {
      setPortfolioImageUploadStatus('Subiendo archivos de la obra...')
      const results = await Promise.all(files.map(uploadPortfolioFile))
      const uploadedAssets = results.map((file, index) => ({
        mediaType: getPortfolioMediaType(file),
        url: file.url,
        thumbnailUrl: file.mimeType?.startsWith('image/') ? file.url : '',
        publicId: file.publicId,
        resourceType: file.resourceType,
        deliveryType: file.deliveryType,
        name: file.name,
        mimeType: file.mimeType,
        size: file.bytes,
        sortOrder: portfolioFormData.assets.length + index,
      }))

      setPortfolioFormData((currentData) => ({
        ...currentData,
        mediaType: currentData.mediaUrl
          ? currentData.mediaType
          : uploadedAssets[0].mediaType,
        mediaUrl: currentData.mediaUrl || uploadedAssets[0].url,
        thumbnailUrl: currentData.thumbnailUrl || uploadedAssets[0].thumbnailUrl,
        assets: [...currentData.assets, ...uploadedAssets],
      }))

      setPortfolioImageUploadStatus('Archivos de obra subidos correctamente')
    } catch (error) {
      setPortfolioImageUploadStatus(error.message)
    } finally {
      event.target.value = ''
    }
  }

  async function handleUpdateProfile(event) {
    event.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    setIsUpdatingProfile(true)

    const token = getAuthToken()
    const isCreatingArtistProfile = !user?.profile

    try {
      if (isCreatingArtistProfile && !profileFormData.categoryId) {
        throw new Error('Selecciona una categoria artistica')
      }

      const response = await fetch(`${API_URL}/artists/me`, {
        method: isCreatingArtistProfile ? 'POST' : 'PATCH',
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

      setUser((currentUser) => {
        const updatedUser = {
          ...currentUser,
          role: 'ARTIST',
          profile: updatedProfile,
        }

        saveAuthUser(updatedUser)
        return updatedUser
      })

      setProfileSuccess(
        isCreatingArtistProfile
          ? 'Perfil artistico creado correctamente'
          : 'Perfil actualizado correctamente',
      )
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
      if (portfolioFormData.assets.length === 0 && !portfolioFormData.mediaUrl) {
        throw new Error('Debes subir al menos un archivo para publicar la obra')
      }

      const response = await fetch(
        editingPortfolioItem
          ? `${API_URL}/portfolio/${editingPortfolioItem.id}`
          : `${API_URL}/portfolio`,
        {
          method: editingPortfolioItem ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(portfolioFormData),
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'No se pudo crear la obra')
      }

      const savedItem = await response.json()

      setUser((currentUser) => ({
        ...currentUser,
        profile: {
          ...currentUser.profile,
          portfolioItems: editingPortfolioItem
            ? (currentUser.profile?.portfolioItems || []).map((item) =>
                item.id === savedItem.id ? savedItem : item,
              )
            : [
                savedItem,
                ...(currentUser.profile?.portfolioItems || []),
              ],
        },
      }))

      if (!editingPortfolioItem) {
        setMetrics((currentMetrics) =>
          currentMetrics
            ? {
                ...currentMetrics,
                totalWorks: currentMetrics.totalWorks + 1,
              }
            : currentMetrics,
        )
      }

      setPortfolioFormData({
        title: '',
        description: '',
        mediaType: 'IMAGE',
        mediaUrl: '',
        thumbnailUrl: '',
        assets: [],
      })
      setPortfolioImageUploadStatus('')
      setEditingPortfolioItem(null)
      setIsCreateModalOpen(false)
    } catch (error) {
      setPortfolioError(error.message)
    } finally {
      setIsCreatingPortfolioItem(false)
    }
  }

  async function handleDeletePortfolioItem(itemId) {
    const shouldDelete = window.confirm(
      'Estas seguro de que quieres eliminar esta obra? Esta accion no se puede deshacer.',
    )

    if (!shouldDelete) {
      return
    }

    const token = getAuthToken()
    setPortfolioError('')
    setIsDeletingPortfolioItemId(itemId)

    try {
      const response = await fetch(`${API_URL}/portfolio/${itemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'No se pudo eliminar la obra')
      }

      setUser((currentUser) => ({
        ...currentUser,
        profile: {
          ...currentUser.profile,
          portfolioItems: (currentUser.profile?.portfolioItems || []).filter(
            (item) => item.id !== itemId,
          ),
        },
      }))

      setMetrics((currentMetrics) =>
        currentMetrics
          ? {
              ...currentMetrics,
              totalWorks: Math.max(currentMetrics.totalWorks - 1, 0),
            }
          : currentMetrics,
      )
    } catch (error) {
      setPortfolioError(error.message)
    } finally {
      setIsDeletingPortfolioItemId(null)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <p className="text-zinc-300">Cargando dashboard...</p>
      </main>
    )
  }

  if (user && !user.profile) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
        <section className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-900 pb-6">
            <Link to="/" className="text-sm font-bold uppercase text-violet-400">
              Atrium
            </Link>

            <div className="flex items-center gap-3">
              <Link
                to="/client/dashboard"
                className="rounded-md border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-200 hover:border-violet-400"
              >
                Mis solicitudes
              </Link>
              <Button variant="secondary" onClick={handleLogout}>
                Cerrar sesion
              </Button>
            </div>
          </div>

          {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
              Perfil artistico
            </p>
            <h1 className="mt-3 text-3xl font-bold">
              Crea tu perfil de artista
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Tu cuenta seguira funcionando como cliente. Al crear este perfil
              tambien podras publicar obras y recibir comisiones.
            </p>
          </div>

          <form
            className="mt-8 space-y-5 rounded-lg border border-zinc-800 bg-zinc-900 p-6"
            onSubmit={handleUpdateProfile}
          >
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
                  placeholder={user.fullName || user.email}
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-zinc-300">
                  Categoria artistica
                </label>
                <select
                  name="categoryId"
                  value={profileFormData.categoryId}
                  onChange={handleProfileChange}
                  required
                  disabled={isLoadingCategories}
                  className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                >
                  <option value="">
                    {isLoadingCategories
                      ? 'Cargando categorias...'
                      : 'Selecciona una categoria'}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
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
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300">Bio</label>
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
                Servicios que ofreces
              </label>
              <textarea
                name="commissionTypes"
                value={profileFormData.commissionTypes}
                onChange={handleProfileChange}
                rows="3"
                placeholder="Ej. retratos, logos, musica para eventos, fotografia"
                className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              />
            </div>

            <Button>
              {isUpdatingProfile ? 'Creando perfil...' : 'Crear perfil artistico'}
            </Button>
          </form>
        </section>
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

  const commissionStatusFilters = [
    {
      value: 'ALL',
      label: 'Todas',
      count: commissionRequests.length,
      statuses: [],
    },
    {
      value: 'NEW',
      label: 'Nuevas',
      statuses: ['PENDING', 'REVIEWED'],
      count: commissionRequests.filter((commissionRequest) =>
        ['PENDING', 'REVIEWED'].includes(commissionRequest.status),
      ).length,
    },
    {
      value: 'NEGOTIATION',
      label: 'Negociacion',
      statuses: ['PROPOSED', 'CLIENT_ACCEPTED', 'CLIENT_REJECTED', 'ACCEPTED'],
      count: commissionRequests.filter((commissionRequest) =>
        ['PROPOSED', 'CLIENT_ACCEPTED', 'CLIENT_REJECTED', 'ACCEPTED'].includes(
          commissionRequest.status,
        ),
      ).length,
    },
    {
      value: 'PAYMENT',
      label: 'Pago',
      statuses: ['PAYMENT_PENDING'],
      count: commissionRequests.filter(
        (commissionRequest) => commissionRequest.status === 'PAYMENT_PENDING',
      ).length,
    },
    {
      value: 'WORK',
      label: 'Trabajo',
      statuses: ['IN_PROGRESS', 'DELIVERED', 'REVISION_REQUESTED', 'DISPUTED'],
      count: commissionRequests.filter((commissionRequest) =>
        ['IN_PROGRESS', 'DELIVERED', 'REVISION_REQUESTED', 'DISPUTED'].includes(
          commissionRequest.status,
        ),
      ).length,
    },
    {
      value: 'CLOSED',
      label: 'Cerradas',
      statuses: [
        'COMPLETED',
        'REJECTED',
        'CANCELLED_BY_CLIENT',
        'CANCELLED_BY_ARTIST',
      ],
      count: commissionRequests.filter((commissionRequest) =>
        [
          'COMPLETED',
          'REJECTED',
          'CANCELLED_BY_CLIENT',
          'CANCELLED_BY_ARTIST',
        ].includes(commissionRequest.status),
      ).length,
    },
  ]
  const selectedCommissionFilter = commissionStatusFilters.find(
    (filter) => filter.value === commissionStatusFilter,
  )
  const visibleCommissionRequests =
    commissionStatusFilter === 'ALL'
      ? commissionRequests
      : commissionRequests.filter((commissionRequest) =>
          selectedCommissionFilter?.statuses.includes(commissionRequest.status),
        )
  const unreadNotificationCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length
  const selectedCommissionPayment = selectedCommissionRequest
    ? paymentTransactions.find(
        (paymentTransaction) =>
          paymentTransaction.commissionRequestId ===
            selectedCommissionRequest.id &&
          (!paymentTransaction.purpose ||
            paymentTransaction.purpose === 'COMMISSION'),
      )
    : null
  const canCreateSelectedCommissionPayment =
    ['ACCEPTED', 'PAYMENT_PENDING'].includes(selectedCommissionRequest?.status) &&
    selectedCommissionRequest?.quotedPrice &&
    !selectedCommissionPayment?.providerOrderId
  const canDeliverSelectedCommission =
    ['IN_PROGRESS', 'REVISION_REQUESTED'].includes(
      selectedCommissionRequest?.status,
    )
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

            <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
                    Bolsa de trabajo
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white">
                    Mis aplicaciones
                  </h2>
                </div>
                <Link
                  to="/jobs"
                  className="text-sm font-semibold text-violet-300 hover:text-violet-200"
                >
                  Ver ofertas
                </Link>
              </div>

              {jobApplications.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">
                  Todavia no has aplicado a ofertas.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {jobApplications.slice(0, 3).map((application) => (
                    <article
                      key={application.id}
                      className="rounded-md border border-zinc-800 bg-zinc-950 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold">
                          {application.jobPost?.title || 'Oferta'}
                        </p>
                        <span className="text-xs text-violet-200">
                          {getJobApplicationStatusLabel(application.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-400">
                        {application.proposedPrice}
                        {application.estimatedTimeline
                          ? ` - ${application.estimatedTimeline}`
                          : ''}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8">
  <div>
    <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
      Pagos
    </p>
    <h2 className="mt-2 text-2xl font-bold text-white">Historial de pagos</h2>
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
    <div className="mt-5 space-y-3">
      {paymentTransactions.map((paymentTransaction) => (
        <article
          key={paymentTransaction.id}
          className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">
                {paymentTransaction.commissionRequest?.clientName ||
                  'Cliente sin nombre'}
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                {paymentTransaction.amount} {paymentTransaction.currency} ·{' '}
                {paymentTransaction.provider}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-md border px-3 py-1 text-xs font-semibold ${getPaymentStatusClassName(
                  paymentTransaction.status,
                )}`}
              >
                {getPaymentStatusLabel(paymentTransaction.status)}
              </span>

              <span
                className={`rounded-md border px-3 py-1 text-xs font-semibold ${getCommissionStatusClassName(
                  paymentTransaction.commissionRequest?.status,
                )}`}
              >
                {getCommissionStatusLabel(
                  paymentTransaction.commissionRequest?.status,
                )}
              </span>
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
                      className={`rounded-md border px-4 py-3 text-left transition hover:-translate-y-0.5 ${
                        isActive
                          ? 'border-violet-400 bg-violet-400/10 text-violet-100'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      <span className="block text-xs font-semibold uppercase">
                        {filter.label}
                      </span>
                      <span className="mt-1 block text-xl font-bold">
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
                            {commissionRequest.projectTitle ||
                              commissionRequest.clientName}
                          </h3>
                          <p className="mt-1 break-all text-sm text-zinc-400">
                            {commissionRequest.clientName} ·{' '}
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
                          <p className="text-xs text-zinc-500">Entrega</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-200">
                            {commissionRequest.desiredDeadline
                              ? formatCommissionDate(
                                  commissionRequest.desiredDeadline,
                                )
                              : 'Sin fecha'}
                            {commissionRequest.isFlexibleDeadline
                              ? ' · flexible'
                              : ''}
                          </p>
                        </div>
                      </div>

                      {commissionRequest.serviceMode && (
                        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Modalidad:{' '}
                          <span className="text-zinc-300">
                            {getServiceModeLabel(commissionRequest.serviceMode)}
                          </span>
                        </p>
                      )}

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
                            !['PENDING', 'REVIEWED', 'CLIENT_ACCEPTED'].includes(
                              commissionRequest.status,
                            )
                          }
                          onClick={() =>
                            handleUpdateCommissionStatus(
                              commissionRequest.id,
                              'ACCEPTED',
                            )
                          }
                          className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-emerald-400 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Aceptar
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

                      {(profileFormData.startingPrice ||
                        profileFormData.servicePriceRange ||
                        profileFormData.serviceArea ||
                        profileFormData.serviceDescription) && (
                        <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
                            Servicios
                          </p>
                          {profileFormData.serviceDescription && (
                            <p className="mt-2 text-sm leading-6 text-zinc-300">
                              {profileFormData.serviceDescription}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-zinc-300">
                            {profileFormData.startingPrice && (
                              <span className="rounded-md border border-zinc-700 px-3 py-2">
                                Desde {profileFormData.startingPrice}
                              </span>
                            )}
                            {profileFormData.servicePriceRange && (
                              <span className="rounded-md border border-zinc-700 px-3 py-2">
                                {profileFormData.servicePriceRange}
                              </span>
                            )}
                            <span className="rounded-md border border-zinc-700 px-3 py-2">
                              {getServiceModeLabel(profileFormData.serviceMode)}
                            </span>
                            {profileFormData.serviceArea && (
                              <span className="rounded-md border border-zinc-700 px-3 py-2">
                                {profileFormData.serviceArea}
                              </span>
                            )}
                          </div>
                        </div>
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
                    Categoria artistica
                  </label>
                  <select
                    name="categoryId"
                    value={profileFormData.categoryId}
                    onChange={handleProfileChange}
                    disabled={isLoadingCategories}
                    className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                  >
                    <option value="">
                      {isLoadingCategories
                        ? 'Cargando categorias...'
                        : 'Selecciona una categoria'}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
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

                <div>
                  <label className="text-sm font-medium text-zinc-300">
                    Intereses creativos
                  </label>
                  <textarea
                    name="interests"
                    value={profileFormData.interests}
                    onChange={handleProfileChange}
                    rows="3"
                    placeholder="Ej. retrato, musica urbana, ilustracion editorial"
                    className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                  />
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
                    Servicios y comisiones
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Esto ayuda a que el cliente entienda que puedes hacer antes de solicitar.
                  </p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-300">
                        Precio base
                      </label>
                      <input
                        type="text"
                        name="startingPrice"
                        value={profileFormData.startingPrice}
                        onChange={handleProfileChange}
                        placeholder="Ej. Desde L 1500"
                        className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-zinc-300">
                        Rango de precios
                      </label>
                      <input
                        type="text"
                        name="servicePriceRange"
                        value={profileFormData.servicePriceRange}
                        onChange={handleProfileChange}
                        placeholder="Ej. L 1500 - L 8000"
                        className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-zinc-300">
                        Modalidad
                      </label>
                      <select
                        name="serviceMode"
                        value={profileFormData.serviceMode}
                        onChange={handleProfileChange}
                        className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                      >
                        <option value="ONLINE">Online</option>
                        <option value="IN_PERSON">Presencial</option>
                        <option value="BOTH">Online y presencial</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-zinc-300">
                        Rango geografico
                      </label>
                      <input
                        type="text"
                        name="serviceArea"
                        value={profileFormData.serviceArea}
                        onChange={handleProfileChange}
                        placeholder="Ej. San Pedro Sula / Remoto"
                        className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-medium text-zinc-300">
                      Tipos de comisiones
                    </label>
                    <textarea
                      name="commissionTypes"
                      value={profileFormData.commissionTypes}
                      onChange={handleProfileChange}
                      rows="3"
                      placeholder="Ej. retratos, logos, murales, composicion musical"
                      className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-medium text-zinc-300">
                      Descripcion breve de servicios
                    </label>
                    <textarea
                      name="serviceDescription"
                      value={profileFormData.serviceDescription}
                      onChange={handleProfileChange}
                      rows="4"
                      placeholder="Describe que servicios ofreces y como trabajas con clientes."
                      className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                    />
                  </div>
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
                    <div key={item.id} className="space-y-3">
                      <PortfolioItemCard
                        id={item.id}
                        title={item.title}
                        description={item.description}
                        mediaType={item.mediaType}
                        mediaUrl={item.mediaUrl}
                        thumbnailUrl={item.thumbnailUrl}
                        assets={item.assets}
                        artistName={getProfileDisplayName(user.profile)}
                        viewCount={item.viewCount}
                        likeCount={item.likeCount}
                      />

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditPortfolioModal(item)}
                          className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:border-violet-400 hover:text-violet-200"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={isDeletingPortfolioItemId === item.id}
                          onClick={() => handleDeletePortfolioItem(item.id)}
                          className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:border-red-400 hover:text-red-200 disabled:opacity-60"
                        >
                          {isDeletingPortfolioItemId === item.id
                            ? 'Eliminando...'
                            : 'Eliminar'}
                        </button>
                      </div>
                    </div>
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
                  {editingPortfolioItem ? 'Editar obra' : 'Nueva obra'}
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  {editingPortfolioItem
                    ? 'Actualizar publicacion'
                    : 'Publicar en portafolio'}
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

              <UploadAction
                title="Archivos de la obra"
                description="Puedes subir varias imagenes, videos o PDFs en una publicacion."
                buttonLabel="Seleccionar archivos"
                status={portfolioImageUploadStatus}
                onChange={handlePortfolioFilesUpload}
                accept="image/*,video/*,application/pdf"
                multiple
              />

              {portfolioFormData.assets.length > 0 && (
                <div className="grid gap-3">
                  {portfolioFormData.assets.map((asset, index) => (
                    <div
                      key={`${asset.url}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-200">
                          {asset.name || asset.url}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {asset.mediaType} {index === 0 ? '· Portada' : ''}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removePortfolioAsset(index)}
                        className="shrink-0 rounded-md border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:border-red-400 hover:text-red-200"
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
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
                {isCreatingPortfolioItem
                  ? 'Guardando...'
                  : editingPortfolioItem
                    ? 'Guardar cambios'
                    : 'Publicar obra'}
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
                  {selectedCommissionRequest.projectTitle ||
                    selectedCommissionRequest.clientName}
                </h2>
                <p className="mt-1 break-all text-sm text-zinc-400">
                  {selectedCommissionRequest.clientName} ·{' '}
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
                  Fecha deseada
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {selectedCommissionRequest.desiredDeadline
                    ? formatCommissionDate(
                        selectedCommissionRequest.desiredDeadline,
                      )
                    : 'No especificada'}
                  {selectedCommissionRequest.isFlexibleDeadline
                    ? ' · flexible'
                    : ''}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Modalidad
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {selectedCommissionRequest.serviceMode
                    ? getServiceModeLabel(selectedCommissionRequest.serviceMode)
                    : 'No especificada'}
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

            {selectedCommissionRequest.attachments?.some(
              (attachment) => attachment.type === 'CLIENT_REFERENCE',
            ) && (
              <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Referencias del cliente
                </p>
                <div className="mt-3 grid gap-2">
                  {selectedCommissionRequest.attachments
                    .filter(
                      (attachment) => attachment.type === 'CLIENT_REFERENCE',
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

            {selectedCommissionRequest.disputes?.length > 0 && (
              <div className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-300">
                  Disputa abierta
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-zinc-200">
                  {selectedCommissionRequest.disputes[0].reason}
                </p>
                {selectedCommissionRequest.attachments?.some(
                  (attachment) => attachment.type === 'DISPUTE_EVIDENCE',
                ) && (
                  <div className="mt-3 grid gap-2">
                    {selectedCommissionRequest.attachments
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
                  <p className="mt-2 text-xs text-emerald-100">
                    {selectedCommissionRequest.includedRevisions ?? 1} cambios
                    incluidos · Extra:{' '}
                    {selectedCommissionRequest.extraRevisionPrice ||
                      'No definido'}{' '}
                    · Retencion:{' '}
                    {selectedCommissionRequest.cancellationRetentionPercent ??
                      0}
                    %
                  </p>
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

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-zinc-300">
                    Cambios incluidos
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="includedRevisions"
                    value={commissionProposalFormData.includedRevisions}
                    onChange={handleSelectedCommissionProposalChange}
                    className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300">
                    Cobro extra por cambio
                  </label>
                  <input
                    type="text"
                    name="extraRevisionPrice"
                    value={commissionProposalFormData.extraRevisionPrice}
                    onChange={handleSelectedCommissionProposalChange}
                    placeholder="Ej. 25 USD"
                    className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300">
                    Retencion si cancela cliente
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="cancellationRetentionPercent"
                    value={
                      commissionProposalFormData.cancellationRetentionPercent
                    }
                    onChange={handleSelectedCommissionProposalChange}
                    className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                  />
                </div>
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

            {['ACCEPTED', 'PAYMENT_PENDING'].includes(
              selectedCommissionRequest.status,
            ) && (
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

            {(canDeliverSelectedCommission ||
              selectedCommissionRequest.deliveryMessage ||
              selectedCommissionRequest.status === 'DELIVERED' ||
              selectedCommissionRequest.status === 'COMPLETED') && (
              <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
                  Entrega
                </p>
                <h3 className="mt-2 text-lg font-bold text-white">
                  Trabajo para revision del cliente
                </h3>

                {selectedCommissionRequest.revisionRequest && (
                  <div className="mt-4 rounded-md border border-fuchsia-400/30 bg-fuchsia-400/10 p-3">
                    <p className="text-xs font-semibold uppercase text-fuchsia-300">
                      Cambios solicitados
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm text-zinc-300">
                      {selectedCommissionRequest.revisionRequest}
                    </p>
                  </div>
                )}

                {selectedCommissionRequest.clientResponseDeadline && (
                  <div className="mt-4 rounded-md border border-blue-400/30 bg-blue-400/10 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
                      Plazo de respuesta del cliente
                    </p>
                    <p className="mt-2 text-sm text-zinc-300">
                      {formatCommissionDate(
                        selectedCommissionRequest.clientResponseDeadline,
                      )}
                    </p>
                  </div>
                )}

                <textarea
                  name="deliveryMessage"
                  value={commissionDeliveryFormData.deliveryMessage}
                  onChange={handleSelectedCommissionDeliveryChange}
                  disabled={!canDeliverSelectedCommission}
                  rows="4"
                  placeholder="Describe lo que estas entregando."
                  className="mt-4 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400 disabled:opacity-60"
                />

                <input
                  name="deliveryPreviewUrl"
                  value={commissionDeliveryFormData.deliveryPreviewUrl}
                  onChange={handleSelectedCommissionDeliveryChange}
                  disabled={!canDeliverSelectedCommission}
                  placeholder="Link de vista previa con watermark"
                  className="mt-3 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400 disabled:opacity-60"
                />

                <input
                  name="finalFileUrl"
                  value={commissionDeliveryFormData.finalFileUrl}
                  onChange={handleSelectedCommissionDeliveryChange}
                  disabled={!canDeliverSelectedCommission}
                  placeholder="Link del archivo final privado"
                  className="mt-3 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400 disabled:opacity-60"
                />

                {canDeliverSelectedCommission && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="cursor-pointer rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-200 hover:border-violet-400">
                      Adjuntar preview
                      <input
                        type="file"
                        multiple
                        onChange={(event) =>
                          handleCommissionDeliveryFileUpload(
                            event,
                            'previewAttachments',
                          )
                        }
                        className="sr-only"
                      />
                    </label>
                    <label className="cursor-pointer rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-200 hover:border-emerald-400">
                      Adjuntar finales privados
                      <input
                        type="file"
                        multiple
                        onChange={(event) =>
                          handleCommissionDeliveryFileUpload(
                            event,
                            'finalAttachments',
                          )
                        }
                        className="sr-only"
                      />
                    </label>
                  </div>
                )}

                {commissionDeliveryUploadStatus && (
                  <p className="mt-3 text-sm text-violet-300">
                    {commissionDeliveryUploadStatus}
                  </p>
                )}

                {[
                  ...commissionDeliveryFormData.previewAttachments,
                  ...commissionDeliveryFormData.finalAttachments,
                ].length > 0 && (
                  <div className="mt-3 grid gap-2 text-sm text-zinc-300">
                    {[
                      ...commissionDeliveryFormData.previewAttachments,
                      ...commissionDeliveryFormData.finalAttachments,
                    ].map((attachment) => (
                      <a
                        key={attachment.url}
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 hover:border-violet-400"
                      >
                        {attachment.name || attachment.url}
                      </a>
                    ))}
                  </div>
                )}

                {(selectedCommissionRequest.deliveryPreviewUrl ||
                  selectedCommissionRequest.deliveryUrl) && (
                  <a
                    href={
                      selectedCommissionRequest.deliveryPreviewUrl ||
                      selectedCommissionRequest.deliveryUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 block break-all text-sm font-semibold text-violet-300 hover:text-violet-200"
                  >
                    Abrir preview entregado
                  </a>
                )}

                {selectedCommissionRequest.attachments?.some((attachment) =>
                  ['ARTIST_PREVIEW', 'ARTIST_FINAL'].includes(attachment.type),
                ) && (
                  <div className="mt-4 grid gap-2">
                    {selectedCommissionRequest.attachments
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
                              handleDownloadSelectedFinalFile(attachment.id)
                            }
                            disabled={isPreparingFinalDownload}
                            className="truncate rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-left text-sm font-semibold text-emerald-200 disabled:opacity-60"
                          >
                            Final privado: {attachment.name || 'Archivo final'}
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

                {selectedCommissionRequest.finalFileUrl && (
                  <button
                    type="button"
                    onClick={() => handleDownloadSelectedFinalFile()}
                    disabled={isPreparingFinalDownload}
                    className="mt-2 block rounded-md border border-emerald-400/40 px-3 py-2 text-sm font-semibold text-emerald-300 hover:text-emerald-200 disabled:opacity-60"
                  >
                    {isPreparingFinalDownload
                      ? 'Preparando descarga...'
                      : 'Descargar archivo final guardado'}
                  </button>
                )}

                <p className="mt-3 text-xs text-zinc-500">
                  Cambios usados: {selectedCommissionRequest.usedRevisions || 0}
                  /{selectedCommissionRequest.includedRevisions ?? 1}. Extra:{' '}
                  {selectedCommissionRequest.extraRevisionPrice || 'No definido'}.
                </p>

                {canDeliverSelectedCommission && (
                  <button
                    type="button"
                    disabled={isDeliveringCommission}
                    onClick={handleDeliverCommission}
                    className="mt-4 rounded-md bg-violet-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeliveringCommission
                      ? 'Enviando entrega...'
                      : 'Enviar entrega'}
                  </button>
                )}

                {commissionDeliveryError && (
                  <p className="mt-3 text-sm text-red-400">
                    {commissionDeliveryError}
                  </p>
                )}
              </div>
            )}

            {selectedCommissionRequest.status === 'COMPLETED' &&
              selectedCommissionRequest.clientUserId && (
                <form
                  className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                  onSubmit={handleSaveClientReview}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
                    Review del cliente
                  </p>
                  <h3 className="mt-2 text-lg font-bold text-white">
                    Experiencia trabajando con {selectedCommissionRequest.clientName}
                  </h3>

                  {selectedCommissionRequest.clientUser?.interests && (
                    <p className="mt-2 text-sm text-zinc-500">
                      Intereses: {selectedCommissionRequest.clientUser.interests}
                    </p>
                  )}

                  {selectedCommissionRequest.clientUser?.clientReviewsReceived
                    ?.length > 0 && (
                    <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-900 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Reviews previas
                      </p>
                      {selectedCommissionRequest.clientUser.clientReviewsReceived.map(
                        (review) => (
                          <div key={review.id} className="mt-3 text-sm text-zinc-300">
                            <p className="font-semibold text-white">
                              {review.rating}/5 -{' '}
                              {review.artistProfile?.artistName ||
                                review.artistProfile?.fullName ||
                                'Artista'}
                            </p>
                            <p className="mt-1 whitespace-pre-line">
                              {review.comment}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  )}

                  {selectedCommissionRequest.clientReview ? (
                    <div className="mt-4 rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3">
                      <p className="text-sm font-semibold text-emerald-200">
                        {selectedCommissionRequest.clientReview.rating}/5
                      </p>
                      <p className="mt-2 whitespace-pre-line text-sm text-zinc-300">
                        {selectedCommissionRequest.clientReview.comment}
                      </p>
                    </div>
                  ) : (
                    <>
                      <label className="mt-4 block text-sm font-medium text-zinc-300">
                        Calificacion
                      </label>
                      <select
                        name="rating"
                        value={clientReviewFormData.rating}
                        onChange={handleClientReviewChange}
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
                        value={clientReviewFormData.comment}
                        onChange={handleClientReviewChange}
                        required
                        rows="4"
                        placeholder="Describe puntualidad, claridad, trato y cumplimiento del cliente."
                        className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                      />

                      <button
                        type="submit"
                        disabled={isSavingClientReview}
                        className="mt-4 rounded-md bg-violet-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-violet-300 disabled:opacity-60"
                      >
                        {isSavingClientReview
                          ? 'Guardando review...'
                          : 'Guardar review'}
                      </button>
                    </>
                  )}

                  {clientReviewError && (
                    <p className="mt-3 text-sm text-red-400">
                      {clientReviewError}
                    </p>
                  )}
                </form>
              )}

            {![
              'COMPLETED',
              'REJECTED',
              'CANCELLED_BY_CLIENT',
              'CANCELLED_BY_ARTIST',
              'DISPUTED',
            ].includes(selectedCommissionRequest.status) && (
              <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                  Disputa
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Abre una disputa si no se puede resolver la entrega, pago o
                  cancelacion directamente con el cliente.
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
                  <button
                    type="button"
                    disabled={isOpeningDispute}
                    onClick={handleOpenSelectedCommissionDispute}
                    className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isOpeningDispute
                      ? 'Abriendo disputa...'
                      : 'Abrir disputa'}
                  </button>
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
                  !['PENDING', 'REVIEWED', 'CLIENT_REJECTED'].includes(
                    selectedCommissionRequest.status,
                  ) ||
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
                  !['PENDING', 'REVIEWED', 'CLIENT_ACCEPTED'].includes(
                    selectedCommissionRequest.status,
                  )
                }
                onClick={handleConfirmCommissionRequest}
                className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-emerald-400 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Aceptar comision
              </button>

              <button
                type="button"
                disabled={
                  updatingCommissionId === selectedCommissionRequest.id ||
                  !['PENDING', 'REVIEWED', 'PROPOSED', 'CLIENT_REJECTED'].includes(
                    selectedCommissionRequest.status,
                  )
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

              <button
                type="button"
                disabled={
                  updatingCommissionId === selectedCommissionRequest.id ||
                  [
                    'COMPLETED',
                    'REJECTED',
                    'CANCELLED_BY_CLIENT',
                    'CANCELLED_BY_ARTIST',
                    'DISPUTED',
                  ].includes(selectedCommissionRequest.status)
                }
                onClick={handleCancelSelectedCommission}
                className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar comision
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default DashboardPage
