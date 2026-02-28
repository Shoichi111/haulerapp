import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/driver/HomePage'
import BriefingPage from './pages/driver/BriefingPage'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Driver-facing routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/briefing/:projectId" element={<BriefingPage />} />
        {/* Admin routes */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/create-briefing" element={<div className="min-h-screen bg-gray-100 flex items-center justify-center"><p className="text-gray-500">Create Briefing — coming in Step 2.3</p></div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
