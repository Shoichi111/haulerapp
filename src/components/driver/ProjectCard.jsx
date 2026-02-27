// ProjectCard — displayed on the Home page for each active job site.
// Tapping the card navigates the driver to the language selection screen.

import { useNavigate } from 'react-router-dom'

export default function ProjectCard({ project }) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/briefing/${project.id}`)}
      className="w-full text-left bg-white rounded-2xl shadow-md border border-gray-100 px-6 py-5 flex items-center justify-between gap-4 active:scale-98 transition-transform"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600 mb-1">
          Active Job Site
        </p>
        <h2 className="text-xl font-bold text-gray-900 leading-snug">
          {project.name}
        </h2>
      </div>
      {/* Chevron arrow */}
      <div className="shrink-0 w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}
