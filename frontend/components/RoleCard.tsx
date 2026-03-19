import { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { FiEdit, FiX, FiTrash2, FiExternalLink } from 'react-icons/fi';

interface RoleCardProps {
  role: {
    id: string;
    title: string;
    status: string;
    candidates_count: number;
    successful_candidates_count: number;
    created_by_user_id?: string | null;
    has_jd?: boolean;
    has_hr_briefing?: boolean;
    outreach_count?: number;
    follow_up_count?: number;
    evaluation_count?: number;
    sent_to_client_count?: number;
    not_pushing_forward_count?: number;
    pipeline_counts?: { outreach?: number; 'follow-up'?: number; evaluation?: number };
    evaluation_status_counts?: { sent_to_client?: number; not_pushing_forward?: number };
  };
  onUpdate: () => void;
  getStatusColor?: (status: string) => string;
}

function getCount(role: RoleCardProps['role'], key: 'outreach' | 'follow_up' | 'evaluation' | 'sent_to_client' | 'not_pushing_forward'): number {
  const flat = role[`${key}_count` as keyof typeof role];
  if (typeof flat === 'number') return flat;
  if (key === 'outreach') return role.pipeline_counts?.outreach ?? 0;
  if (key === 'follow_up') return role.pipeline_counts?.['follow-up'] ?? 0;
  if (key === 'evaluation') return role.pipeline_counts?.evaluation ?? 0;
  if (key === 'sent_to_client') return role.evaluation_status_counts?.sent_to_client ?? role.successful_candidates_count ?? 0;
  if (key === 'not_pushing_forward') return role.evaluation_status_counts?.not_pushing_forward ?? 0;
  return 0;
}

export default function RoleCard({ role, onUpdate }: RoleCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${role.title}"?`)) return;

    setIsDeleting(true);
    try {
      await axios.delete(`/api/roles/${role.id}`);
      onUpdate();
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('Failed to delete role');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (e: React.MouseEvent, newStatus: string) => {
    e.stopPropagation();
    try {
      await axios.put(`/api/roles/${role.id}`, { status: newStatus });
      onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer"
      onClick={() => router.push(`/roles/${role.id}`)}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-900">{role.title}</h3>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/roles/${role.id}`);
            }}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Open"
          >
            <FiExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const newStatus = role.status === 'Closed' ? 'In Progress' : 'Closed';
              handleStatusChange(e, newStatus);
            }}
            className="p-1 text-gray-400 hover:text-gray-600"
            title={role.status === 'Closed' ? 'Reopen' : 'Close'}
          >
            <FiX className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1 text-red-400 hover:text-red-600 disabled:opacity-50"
            title="Delete"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {role.created_by_user_id && (
        <div className="mb-2 text-sm text-gray-500">
          <span title="Created by">Created by {role.created_by_user_id}</span>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <span className={role.has_jd ? 'text-green-600' : 'text-amber-600'} title={role.has_jd ? 'Job description uploaded' : 'No job description'}>
          {role.has_jd ? 'JD ✓' : 'No JD'}
        </span>
        <span className={role.has_hr_briefing ? 'text-green-600' : 'text-gray-400'} title={role.has_hr_briefing ? 'HR briefing linked' : 'No HR briefing'}>
          {role.has_hr_briefing ? 'Briefing ✓' : 'No briefing'}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <span className="inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-sm font-medium">
          <span className="text-slate-500 font-normal">Outreach</span>
          <span className="font-semibold">{getCount(role, 'outreach')}</span>
        </span>
        <span className="inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 text-amber-800 text-sm font-medium whitespace-nowrap">
          <span className="text-amber-600 font-normal">Followup</span>
          <span className="font-semibold">{getCount(role, 'follow_up')}</span>
        </span>
        <span className="inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 text-blue-800 text-sm font-medium">
          <span className="text-blue-600 font-normal">Evaluation</span>
          <span className="font-semibold">{getCount(role, 'evaluation')}</span>
        </span>
        <span className="inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-md bg-green-50 text-green-800 text-sm font-medium">
          <span className="text-green-600 font-normal">Sent</span>
          <span className="font-semibold">{getCount(role, 'sent_to_client')}</span>
        </span>
        {getCount(role, 'not_pushing_forward') > 0 && (
          <span className="col-span-4 inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-md bg-red-50 text-red-800 text-sm font-medium w-fit">
            <span className="text-red-600 font-normal">Not pushing</span>
            <span className="font-semibold">{getCount(role, 'not_pushing_forward')}</span>
          </span>
        )}
      </div>
    </div>
  );
}

