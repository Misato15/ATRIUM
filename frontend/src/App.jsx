import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ArtistDetailPage from './pages/ArtistDetailPage'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PortfolioDetailPage from './pages/PortfolioDetailPage'
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
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/portfolio/:id" element={<PortfolioDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App