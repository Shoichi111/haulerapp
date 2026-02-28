import { useNavigate, Navigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  if (!loading && !user) {
    return <Navigate to="/admin" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  async function handleSignOut() {
    await signOut(auth);
    navigate('/admin', { replace: true });
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

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <p className="text-gray-900 font-medium">
            Welcome, {user.email}
          </p>
          <p className="text-gray-500 mt-2 text-sm">
            Dashboard coming in Step 2.2
          </p>
          <span className="inline-block mt-4 bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">
            Proof of Concept
          </span>
        </div>
      </main>
    </div>
  );
}
