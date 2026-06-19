import { useEffect, useState } from 'react'
import Button from '../components/Button'
import { API_URL } from '../config/api'
import { getAuthToken, getAuthUser } from '../utils/auth'

const emptyAdminData = {
  summary: null,
  users: [],
  artists: [],
  portfolioItems: [],
  commissions: [],
  disputes: [],
  payments: { commissionPayments: [], digitalPurchases: [] },
  jobPosts: [],
  digitalProducts: [],
  logs: [],
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.message || 'No se pudo completar la accion')
  }

  return data
}

function AdminPage() {
  const authUser = getAuthUser()
  const token = getAuthToken()
  const [data, setData] = useState(emptyAdminData)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  async function loadAdminData() {
    setIsLoading(true)
    setMessage('')

    try {
      const [
        summary,
        users,
        artists,
        portfolioItems,
        commissions,
        disputes,
        payments,
        jobPosts,
        digitalProducts,
        logs,
      ] = await Promise.all([
        fetchJson(`${API_URL}/admin/summary`, { headers }),
        fetchJson(`${API_URL}/admin/users`, { headers }),
        fetchJson(`${API_URL}/admin/artists`, { headers }),
        fetchJson(`${API_URL}/admin/portfolio-items`, { headers }),
        fetchJson(`${API_URL}/admin/commissions`, { headers }),
        fetchJson(`${API_URL}/admin/disputes`, { headers }),
        fetchJson(`${API_URL}/admin/payments`, { headers }),
        fetchJson(`${API_URL}/admin/job-posts`, { headers }),
        fetchJson(`${API_URL}/admin/digital-products`, { headers }),
        fetchJson(`${API_URL}/admin/logs`, { headers }),
      ])

      setData({
        summary,
        users,
        artists,
        portfolioItems,
        commissions,
        disputes,
        payments,
        jobPosts,
        digitalProducts,
        logs,
      })
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (authUser?.role === 'ADMIN' && token) {
      loadAdminData()
    } else {
      setIsLoading(false)
    }
  }, [])

  async function patch(path, body, successMessage) {
    setMessage('')

    try {
      await fetchJson(`${API_URL}${path}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      })
      setMessage(successMessage)
      await loadAdminData()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function resolveDispute(dispute) {
    const resolution = window.prompt('Resolucion de la disputa')

    if (!resolution?.trim()) {
      return
    }

    const commissionStatus =
      window.prompt(
        'Estado final: IN_PROGRESS, COMPLETED, CANCELLED_BY_CLIENT o CANCELLED_BY_ARTIST',
        'COMPLETED',
      ) || 'COMPLETED'

    await patch(
      `/admin/disputes/${dispute.id}`,
      { resolution, commissionStatus },
      'Disputa resuelta',
    )
  }

  if (authUser?.role !== 'ADMIN') {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <section className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="mt-3 text-zinc-400">No tienes acceso a esta vista.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-violet-400">
              Administracion
            </p>
            <h1 className="mt-2 text-3xl font-bold">Panel admin</h1>
          </div>
          <Button variant="secondary" onClick={loadAdminData}>
            Actualizar
          </Button>
        </div>

        {message && (
          <p className="mt-6 rounded-md border border-violet-400/30 bg-violet-400/10 p-3 text-sm text-violet-200">
            {message}
          </p>
        )}

        {isLoading ? (
          <p className="mt-8 text-zinc-400">Cargando admin...</p>
        ) : (
          <>
            {data.summary && (
              <div className="mt-8 grid gap-3 md:grid-cols-4">
                {Object.entries(data.summary).map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
                  >
                    <p className="text-xs uppercase text-zinc-500">{key}</p>
                    <p className="mt-1 text-2xl font-bold">{value}</p>
                  </div>
                ))}
              </div>
            )}

            <AdminSection title="Usuarios">
              {data.users.map((user) => (
                <Row key={user.id}>
                  <Info
                    title={user.email}
                    detail={`${user.role} · ${user.isSuspended ? 'Suspendido' : 'Activo'}`}
                  />
                  <Button
                    variant="secondary"
                    onClick={() =>
                      patch(
                        `/admin/users/${user.id}`,
                        { isSuspended: !user.isSuspended },
                        user.isSuspended ? 'Usuario activado' : 'Usuario suspendido',
                      )
                    }
                  >
                    {user.isSuspended ? 'Activar' : 'Suspender'}
                  </Button>
                </Row>
              ))}
            </AdminSection>

            <AdminSection title="Artistas">
              {data.artists.map((artist) => (
                <Row key={artist.id}>
                  <Info
                    title={artist.artistName || artist.fullName || artist.user.email}
                    detail={`${artist.category?.name || 'Sin categoria'} · ${artist.isHidden ? 'Oculto' : 'Visible'}`}
                  />
                  <Button
                    variant="secondary"
                    onClick={() =>
                      patch(
                        `/admin/artists/${artist.id}`,
                        { isHidden: !artist.isHidden },
                        artist.isHidden ? 'Artista visible' : 'Artista oculto',
                      )
                    }
                  >
                    {artist.isHidden ? 'Mostrar' : 'Ocultar'}
                  </Button>
                </Row>
              ))}
            </AdminSection>

            <AdminSection title="Disputas">
              {data.disputes.map((dispute) => (
                <Row key={dispute.id}>
                  <Info
                    title={`#${dispute.id} · ${dispute.status}`}
                    detail={`${dispute.commissionRequest?.projectTitle || dispute.commissionRequest?.clientName || 'Comision'} · ${dispute.reason}`}
                  />
                  {dispute.status === 'OPEN' && (
                    <Button onClick={() => resolveDispute(dispute)}>
                      Resolver
                    </Button>
                  )}
                </Row>
              ))}
            </AdminSection>

            <AdminSection title="Productos digitales">
              {data.digitalProducts.map((product) => (
                <Row key={product.id}>
                  <Info
                    title={product.title}
                    detail={`${product.status} · ${product._count?.purchases || 0} compras`}
                  />
                  <Button
                    variant="secondary"
                    onClick={() =>
                      patch(
                        `/admin/digital-products/${product.id}`,
                        {
                          status:
                            product.status === 'ARCHIVED'
                              ? 'PUBLISHED'
                              : 'ARCHIVED',
                        },
                        'Producto actualizado',
                      )
                    }
                  >
                    {product.status === 'ARCHIVED' ? 'Publicar' : 'Archivar'}
                  </Button>
                </Row>
              ))}
            </AdminSection>

            <AdminSection title="Obras">
              {data.portfolioItems.map((item) => (
                <Row key={item.id}>
                  <Info
                    title={item.title}
                    detail={`${item.artistProfile?.artistName || item.artistProfile?.fullName || 'Artista'} · ${item.isHidden ? 'Oculta' : 'Visible'}`}
                  />
                  <Button
                    variant="secondary"
                    onClick={() =>
                      patch(
                        `/admin/portfolio-items/${item.id}`,
                        { isHidden: !item.isHidden },
                        item.isHidden ? 'Obra visible' : 'Obra oculta',
                      )
                    }
                  >
                    {item.isHidden ? 'Mostrar' : 'Ocultar'}
                  </Button>
                </Row>
              ))}
            </AdminSection>

            <AdminSection title="Ofertas">
              {data.jobPosts.map((jobPost) => (
                <Row key={jobPost.id}>
                  <Info
                    title={jobPost.title}
                    detail={`${jobPost.status} · ${jobPost._count?.applications || 0} aplicaciones`}
                  />
                  <Button
                    variant="secondary"
                    onClick={() =>
                      patch(
                        `/admin/job-posts/${jobPost.id}`,
                        {
                          status:
                            jobPost.status === 'CLOSED' ? 'OPEN' : 'CLOSED',
                        },
                        'Oferta actualizada',
                      )
                    }
                  >
                    {jobPost.status === 'CLOSED' ? 'Reabrir' : 'Cerrar'}
                  </Button>
                </Row>
              ))}
            </AdminSection>

            <AdminSection title="Pagos">
              {data.payments.commissionPayments.map((payment) => (
                <Row key={`commission-${payment.id}`}>
                  <Info
                    title={`Comision #${payment.commissionRequestId}`}
                    detail={`${payment.amount} ${payment.currency} · ${payment.status} · ${payment.purpose}`}
                  />
                </Row>
              ))}
              {data.payments.digitalPurchases.map((purchase) => (
                <Row key={`digital-${purchase.id}`}>
                  <Info
                    title={purchase.digitalProduct?.title || 'Producto digital'}
                    detail={`${purchase.amount} ${purchase.currency} · ${purchase.status}`}
                  />
                </Row>
              ))}
            </AdminSection>

            <AdminSection title="Comisiones">
              {data.commissions.map((commission) => (
                <Row key={commission.id}>
                  <Info
                    title={commission.projectTitle || commission.clientName}
                    detail={`${commission.status} · ${commission.artistProfile?.artistName || commission.artistProfile?.fullName || 'Artista'}`}
                  />
                </Row>
              ))}
            </AdminSection>

            <AdminSection title="Auditoria">
              {data.logs.map((log) => (
                <Row key={log.id}>
                  <Info
                    title={`${log.action} · ${log.targetType} #${log.targetId || '-'}`}
                    detail={`${log.adminUser?.email || 'Admin'} · ${new Date(log.createdAt).toLocaleString()}`}
                  />
                </Row>
              ))}
            </AdminSection>
          </>
        )}
      </section>
    </main>
  )
}

function AdminSection({ title, children }) {
  return (
    <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  )
}

function Row({ children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3">
      {children}
    </div>
  )
}

function Info({ title, detail }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{detail}</p>
    </div>
  )
}

export default AdminPage
