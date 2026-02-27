import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/driver/HomePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Driver-facing routes */}
        <Route path="/" element={<HomePage />} />
        {/* /briefing/:projectId added in Step 1.2 */}
        {/* /admin routes added in Section 2 */}
      </Routes>
    </BrowserRouter>
  )
}

export default App
