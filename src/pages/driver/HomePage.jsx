// HomePage — driver-facing project selection screen.
// Fetches active projects from Firestore and displays them as tappable cards.
// No login required — this page is publicly accessible.

import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'
import ProjectCard from '../../components/driver/ProjectCard'

export default function HomePage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const q = query(
          collection(db, 'projects'),
          where('isActive', '==', true)
        )
        const snapshot = await getDocs(q)
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setProjects(data)
      } catch (err) {
        console.error('Failed to load projects:', err)
        setError('Unable to load job sites. Please check your connection and try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Dufferin Construction</h1>
              <p className="text-sm text-gray-500">Driver Safety Briefing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 py-8">
        <h2 className="text-base font-semibold text-gray-600 uppercase tracking-wide mb-4">
          Select your job site
        </h2>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-5 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* No projects */}
        {!loading && !error && projects.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl px-6 py-10 text-center">
            <p className="text-gray-500 text-sm">No active job sites at this time.</p>
            <p className="text-gray-400 text-xs mt-1">Please check with your coordinator.</p>
          </div>
        )}

        {/* Project cards */}
        {!loading && !error && projects.length > 0 && (
          <div className="flex flex-col gap-4">
            {projects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-lg mx-auto px-6 pb-8">
        <p className="text-center text-xs text-gray-400">
          Dufferin Construction — Safety First
        </p>
      </div>
    </div>
  )
}
