import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import BriefingForm from '../../components/admin/BriefingForm';

export default function CreateBriefingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  if (!authLoading && !user) {
    return <Navigate to="/admin" replace />;
  }

  useEffect(() => {
    if (!user) return;

    async function fetchProject() {
      try {
        const snap = await getDocs(
          query(collection(db, 'projects'), where('isActive', '==', true))
        );
        if (!snap.empty) {
          setProject({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
      } catch (err) {
        console.error('Failed to load project:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProject();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0"
            aria-label="Back to dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Create Briefing</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {project && (
          <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-4">{project.name}</p>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          {project ? (
            <BriefingForm
              projectId={project.id}
              userEmail={user.email}
              onSaved={() => navigate('/admin/dashboard')}
            />
          ) : (
            <p className="text-gray-500 text-center">No active project found.</p>
          )}
        </div>
      </main>
    </div>
  );
}
