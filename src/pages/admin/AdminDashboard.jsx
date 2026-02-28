import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [ackCount, setAckCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unpublishing, setUnpublishing] = useState(false);

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/admin" replace />;
  }

  useEffect(() => {
    if (!user) return;

    async function fetchDashboard() {
      try {
        // 1. Get active project (POC = one project)
        const projSnap = await getDocs(
          query(collection(db, 'projects'), where('isActive', '==', true))
        );
        if (projSnap.empty) {
          setLoading(false);
          return;
        }
        const proj = { id: projSnap.docs[0].id, ...projSnap.docs[0].data() };
        setProject(proj);

        // 2. Get active briefing for this project
        const briefSnap = await getDocs(
          query(
            collection(db, 'briefings'),
            where('projectId', '==', proj.id),
            where('isActive', '==', true)
          )
        );
        if (briefSnap.empty) {
          setLoading(false);
          return;
        }
        const br = { id: briefSnap.docs[0].id, ...briefSnap.docs[0].data() };
        setBriefing(br);

        // 3. Count acknowledgements for this briefing
        const ackSnap = await getDocs(
          query(collection(db, 'acknowledgements'), where('briefingId', '==', br.id))
        );
        setAckCount(ackSnap.size);
      } catch (err) {
        console.error('Dashboard fetch failed:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [user]);

  async function handleSignOut() {
    await signOut(auth);
    navigate('/admin', { replace: true });
  }

  async function handleUnpublish() {
    if (!briefing) return;
    setUnpublishing(true);
    try {
      await updateDoc(doc(db, 'briefings', briefing.id), { isActive: false });
      setBriefing(null);
      setAckCount(0);
    } catch (err) {
      console.error('Unpublish failed:', err);
    } finally {
      setUnpublishing(false);
    }
  }

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
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Project name */}
        {project && (
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">{project.name}</p>
          </div>
        )}

        {/* Active briefing card */}
        {briefing ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Active Briefing</h2>
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                Published
              </span>
            </div>

            {briefing.briefingDate && (
              <p className="text-sm text-gray-500">Date: {briefing.briefingDate}</p>
            )}

            {/* Acknowledgement count */}
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-sm text-gray-600">
                <span className="text-2xl font-bold text-gray-900">{ackCount}</span>
                {briefing.expectedTrucks && (
                  <span className="text-gray-400"> of {briefing.expectedTrucks}</span>
                )}
                <span className="ml-2">drivers acknowledged</span>
              </p>
            </div>

            {briefing.createdBy && (
              <p className="text-xs text-gray-400">Created by: {briefing.createdBy}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleUnpublish}
                disabled={unpublishing}
                className="flex-1 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 font-medium text-sm py-2.5 rounded-lg transition-colors"
              >
                {unpublishing ? 'Unpublishing…' : 'Unpublish'}
              </button>
              <button
                onClick={() => navigate('/admin/create-briefing')}
                className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium text-sm py-2.5 rounded-lg transition-colors"
              >
                Create New Briefing
              </button>
            </div>
          </div>
        ) : (
          /* No active briefing */
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <p className="text-gray-700 font-medium">No active briefing</p>
            <p className="text-gray-400 text-sm mt-1">Create a new briefing to get started.</p>
            <button
              onClick={() => navigate('/admin/create-briefing')}
              className="mt-4 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
            >
              Create New Briefing
            </button>
          </div>
        )}

        {/* POC badge */}
        <div className="text-center">
          <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">
            Proof of Concept
          </span>
        </div>
      </main>
    </div>
  );
}
