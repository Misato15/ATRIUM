import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  PayPalButtons,
  PayPalScriptProvider,
  usePayPalScriptReducer,
} from '@paypal/react-paypal-js'
import { API_URL } from '../config/api'

function getArtistDisplayName(profile) {
  return profile?.artistName || profile?.fullName || 'Artista'
}

function DigitalProductCheckoutPage() {
  const { providerOrderId } = useParams()
  const [{ isPending: isPayPalLoading, isRejected: isPayPalRejected }] =
    usePayPalScriptReducer()
  const [checkoutData, setCheckoutData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadCheckout() {
      try {
        const response = await fetch(
          `${API_URL}/digital-products/checkout/${providerOrderId}`,
        )

        if (!response.ok) {
          throw new Error('No se pudo cargar la compra')
        }

        setCheckoutData(await response.json())
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
        `${API_URL}/digital-products/paypal-orders/${paypalOrderId}/capture`,
        {
          method: 'POST',
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'No se pudo confirmar el pago')
      }

      setCheckoutData(await response.json())
    } catch (currentError) {
      setError(currentError.message)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <p className="text-zinc-300">Cargando compra...</p>
      </main>
    )
  }

  if (error && !checkoutData) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <section className="mx-auto max-w-3xl">
          <Link to="/marketplace" className="text-sm font-bold text-violet-400">
            Volver al marketplace
          </Link>
          <h1 className="mt-8 text-3xl font-bold">Compra no disponible</h1>
          <p className="mt-3 text-zinc-400">{error}</p>
        </section>
      </main>
    )
  }

  const product = checkoutData.digitalProduct
  const artistName = getArtistDisplayName(product.artistProfile)
  const isPaid = checkoutData.status === 'PAID'

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-4xl">
        <Link to="/marketplace" className="text-sm font-bold text-violet-400">
          Marketplace
        </Link>

        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
            Compra digital
          </p>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold">{product.title}</h1>
              <p className="mt-2 text-zinc-400">Por {artistName}</p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-right">
              <p className="text-sm text-zinc-400">Total</p>
              <p className="mt-1 text-3xl font-bold">
                {checkoutData.amount} {checkoutData.currency}
              </p>
              <p className="mt-2 text-sm text-violet-300">
                {checkoutData.status}
              </p>
            </div>
          </div>

          <p className="mt-6 whitespace-pre-line text-sm leading-7 text-zinc-300">
            {product.description}
          </p>

          {isPaid ? (
            <div className="mt-6 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-5">
              <p className="font-semibold text-emerald-200">
                Compra confirmada.
              </p>
              <p className="mt-2 text-sm text-emerald-100/80">
                Ya puedes descargar este producto desde tu biblioteca del
                marketplace.
              </p>
              <Link
                to="/marketplace"
                className="mt-4 inline-flex rounded-md bg-emerald-400 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-300"
              >
                Ir a mi biblioteca
              </Link>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="mb-4 text-sm text-zinc-400">
                Puedes pagar con PayPal o tarjeta si PayPal la habilita para tu
                region.
              </p>

              {isPayPalLoading && (
                <p className="rounded-md border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-300">
                  Cargando PayPal...
                </p>
              )}

              {isPayPalRejected && (
                <p className="rounded-md border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
                  No se pudo cargar PayPal. Revisa el client id sandbox del
                  frontend y reinicia Vite.
                </p>
              )}

              {!isPayPalLoading && !isPayPalRejected && (
                <PayPalButtons
                  forceReRender={[checkoutData.providerOrderId]}
                  style={{
                    layout: 'vertical',
                    color: 'gold',
                    shape: 'rect',
                    label: 'paypal',
                  }}
                  createOrder={() => checkoutData.providerOrderId}
                  onApprove={(data) => handleCapturePayPalOrder(data.orderID)}
                  onError={() =>
                    setError(
                      'PayPal no pudo abrir esta orden. Intenta crear una nueva compra.',
                    )
                  }
                />
              )}
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

function DigitalProductCheckoutPageWithPayPal() {
  return (
    <PayPalScriptProvider
      options={{
        clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
        components: 'buttons',
        currency: 'USD',
        intent: 'capture',
      }}
    >
      <DigitalProductCheckoutPage />
    </PayPalScriptProvider>
  )
}

export default DigitalProductCheckoutPageWithPayPal
