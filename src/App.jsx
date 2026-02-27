import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/driver/HomePage'
import BriefingPage from './pages/driver/BriefingPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Driver-facing routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/briefing/:projectId" element={<BriefingPage />} />
        {/* /admin routes added in Section 2 */}
      </Routes>
    </BrowserRouter>
  )
}

export default App
