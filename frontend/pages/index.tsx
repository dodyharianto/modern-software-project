import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import RoleCard from '../components/RoleCard';
import { FiPlus, FiSearch, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';

interface Role {
  id: string;
  title: string;
  status: string;
  candidates_count: number;
  successful_candidates_count: number;
  created_by_user_id?: string | null;
  outreach_count?: number;
  follow_up_count?: number;
  evaluation_count?: number;
  sent_to_client_count?: number;
  not_pushing_forward_count?: number;
}

export default function Home() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await axios.get('/api/roles');
      setRoles(response.data.roles || []);
    } catch (err: any) {
      console.error('Error fetching roles:', err);
      const detail = err.response?.data?.detail ?? err.response?.data?.message;
      const baseMsg = detail || err.message || 'Failed to load roles. Make sure the backend is running on port 8000.';
      const isNgrok = typeof window !== 'undefined' && window.location.hostname.includes('ngrok');
      const ngrokHint = isNgrok
        ? ' If using ngrok: (1) Click "Visit Site" on the warning page, (2) Run ngrok http 3000 (frontend), not 8000.'
        : '';
      setError(baseMsg + ngrokHint);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    const title = prompt('Enter role title:');
    if (!title) return;

    try {
      const response = await axios.post('/api/roles', { title, status: 'New' });
      router.push(`/roles/${response.data.role_id}`);
    } catch (error) {
      console.error('Error creating role:', error);
      alert('Failed to create role');
    }
  };

  const filteredRoles = roles.filter(role =>
    role.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && roles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Recruiter Dashboard</h1>
            <p className="text-gray-600">Manage your recruitment pipeline</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchRoles}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
              title="Refresh"
            >
              <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleCreateRole}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              <FiPlus className="w-5 h-5" />
              New Role
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 flex-1">{error}</p>
            <button
              onClick={fetchRoles}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
            >
              Retry
            </button>
          </div>
        )}

        <div className="mb-6">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {filteredRoles.length === 0 && !error ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No roles found</p>
            <button
              onClick={handleCreateRole}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first role
            </button>
          </div>
        ) : filteredRoles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRoles.map((role) => (
              <RoleCard key={role.id} role={role} onUpdate={fetchRoles} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

