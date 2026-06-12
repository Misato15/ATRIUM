import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PayPalButtons } from '@paypal/react-paypal-js'
import { API_URL } from '../config/api'

function getArtistDisplayName(profile) {
  return profile?.artistName || profile?.fullName || 'Artista'
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

function PaymentCheckoutPage() {
  const { providerOrderId } = useParams()
  const [checkoutData, setCheckoutData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadCheckout() {
      try {
        const response = await fetch(
          `${API_URL}/payments/checkout/${providerOrderId}`,
        )

        if (!response.ok) {
          throw new Error('No se pudo cargar el pago')
        }

        const data = await response.json()

        if (!data) {
          throw new Error('Pago no encontrado')
        }

        setCheckoutData(data)
      } catch (currentError) {
        setError(currentError.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadCheckout()
  }, [providerOrderId])

  async function handleCapturePayPalOrder(paypalOrderId) {
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/payments/paypal-orders/${paypalOrderId}/capture`,
        {
          method: 'POST',
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'No se pudo confirmar el pago')
      }

      const updatedPaymentTransaction = await response.json()
      setCheckoutData(updatedPaymentTransaction)
    } catch (currentError) {
      setError(currentError.message)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <p className="text-zinc-300">Cargando pago...</p>
      </main>
    )
  }

  if (error && !checkoutData) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <section className="mx-auto max-w-3xl">
          <Link to="/" className="text-sm font-bold text-violet-400">
            Volver al inicio
          </Link>
          <h1 className="mt-8 text-3xl font-bold">Pago no disponible</h1>
          <p className="mt-3 text-zinc-400">{error}</p>
        </section>
      </main>
    )
  }

  const commissionRequest = checkoutData.commissionRequest
  const artistProfile = commissionRequest.artistProfile
  const artistName = getArtistDisplayName(artistProfile)
  const isPaid = checkoutData.status === 'PAID'

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-4xl">
        <Link to="/" className="text-sm font-bold text-violet-400">
          Atrium
        </Link>

        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
            Pago de comision
          </p>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold">{artistName}</h1>
              <p className="mt-2 text-zinc-400">
                Solicitud de {commissionRequest.clientName}
              </p>
              {artistProfile.location && (
                <p className="mt-1 text-sm text-zinc-500">
                  {artistProfile.location}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-right">
              <p className="text-sm text-zinc-400">Total</p>
              <p className="mt-1 text-3xl font-bold">
                {checkoutData.amount} {checkoutData.currency}
              </p>
              <p className="mt-2 text-sm text-violet-300">
                {getPaymentStatusLabel(checkoutData.status)}
              </p>
            </div>
          </div>

          {commissionRequest.artistResponse && (
            <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Propuesta del artista
              </p>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-300">
                {commissionRequest.artistResponse}
              </p>
            </div>
          )}

          {isPaid ? (
            <div className="mt-6 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-5">
              <p className="font-semibold text-emerald-200">
                Pago confirmado correctamente.
              </p>
              <p className="mt-2 text-sm text-emerald-100/80">
                El artista ya puede ver este pago como pagado en su dashboard.
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="mb-4 text-sm text-zinc-400">
                Puedes pagar con PayPal o tarjeta si PayPal la habilita para tu
                region.
              </p>
              <PayPalButtons
                style={{
                  layout: 'vertical',
                  color: 'gold',
                  shape: 'rect',
                  label: 'paypal',
                }}
                createOrder={() => checkoutData.providerOrderId}
                onApprove={(data) => handleCapturePayPalOrder(data.orderID)}
              />
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-md border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}
        </div>
      </section>
    </main>
  )
}

export default PaymentCheckoutPage
