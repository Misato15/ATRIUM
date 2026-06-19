import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ArtistDetailPage from './pages/ArtistDetailPage'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import DashboardPage from './pages/DashboardPage'
import ClientDashboardPage from './pages/ClientDashboardPage'
import PortfolioDetailPage from './pages/PortfolioDetailPage'
import PaymentCheckoutPage from './pages/PaymentCheckoutPage'
import CommissionProposalPage from './pages/CommissionProposalPage'
import CommissionDeliveryPage from './pages/CommissionDeliveryPage'
import JobsPage from './pages/JobsPage'
import MarketplacePage from './pages/MarketplacePage'
import DigitalProductCheckoutPage from './pages/DigitalProductCheckoutPage'
import AdminPage from './pages/AdminPage'
import Navbar from './components/Navbar'

function App() {
  return (
    <BrowserRouter>
    <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/artists/:id" element={<ArtistDetailPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/marketplace/checkout/:providerOrderId" element={<DigitalProductCheckoutPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/client/dashboard" element={<ClientDashboardPage />} />
        <Route path="/portfolio/:id" element={<PortfolioDetailPage />} />
        <Route path="/commissions/proposals/:id" element={<CommissionProposalPage />} />
        <Route path="/commissions/deliveries/:id" element={<CommissionDeliveryPage />} />
        <Route path="/payments/checkout/:providerOrderId" element={<PaymentCheckoutPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
