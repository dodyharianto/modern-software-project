import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import RolePage from '../../components/RolePage';

export default function RoleDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [role, setRole] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchRole();
    }
  }, [id]);

  const fetchRole = async () => {
    try {
      const response = await axios.get(`/api/roles/${id}`);
      setRole(response.data);
    } catch (error) {
      console.error('Error fetching role:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Role not found</div>
      </div>
    );
  }

  return <RolePage role={role} onUpdate={fetchRole} />;
}

