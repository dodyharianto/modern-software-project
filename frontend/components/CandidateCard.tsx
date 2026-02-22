import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { FiMessageSquare, FiChevronDown, FiChevronUp, FiMove, FiCheck, FiUpload, FiMic, FiMail, FiMinusCircle, FiTrash2 } from 'react-icons/fi';

interface CandidateCardProps {
  candidate: any;
  roleId: string;
  roleTitle?: string;
  getColorClass: (color: string) => string;
  onUpdate: () => void;
}

export default function CandidateCard({
  candidate,
  roleId,
  roleTitle,
  getColorClass,
  onUpdate,
}: CandidateCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: candidate.id,
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [outreachMessage, setOutreachMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [checklist, setChecklist] = useState(candidate.checklist || {
    consent_form_sent: false,
    consent_form_received: false,
    updated_cv_received: false,
    screening_interview_scheduled: false,
    screening_interview_completed: false,
  });
  const [interview, setInterview] = useState<any>(null);
  const [isUploadingInterview, setIsUploadingInterview] = useState(false);

  useEffect(() => {
    if (candidate.checklist) {
      setChecklist(candidate.checklist);
    }
    fetchInterview();
  }, [candidate.id, candidate.checklist]);

  const fetchInterview = async () => {
    try {
      const response = await axios.get(`/api/roles/${roleId}/candidates/${candidate.id}/interview`);
      setInterview(response.data.interview);
    } catch (error) {
      // Interview might not exist yet
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleGenerateOutreach = async () => {
    setIsGenerating(true);
    try {
      const response = await axios.post(
        `/api/roles/${roleId}/candidates/${candidate.id}/outreach`
      );
      setOutreachMessage(response.data.outreach_message);
    } catch (error) {
      console.error('Error generating outreach:', error);
      alert('Failed to generate outreach message');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkOutreachSent = async () => {
    try {
      await axios.put(`/api/roles/${roleId}/candidates/${candidate.id}/status`, {
        outreach_sent: true,
        color: 'amber-solid',
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleMarkNotPushing = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await axios.put(`/api/roles/${roleId}/candidates/${candidate.id}/status`, {
        not_pushing_forward: true,
      });
      onUpdate();
    } catch (error) {
      console.error('Error marking as not pushing:', error);
      alert('Failed to update candidate status');
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm(`Delete candidate "${candidate.name || 'Unknown'}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/roles/${roleId}/candidates/${candidate.id}`);
      onUpdate();
    } catch (error) {
      console.error('Error deleting candidate:', error);
      alert('Failed to delete candidate');
    }
  };

  const handleChecklistToggle = async (item: string) => {
    const newChecklist = { ...checklist, [item]: !checklist[item as keyof typeof checklist] };
    setChecklist(newChecklist);
    try {
      await axios.put(`/api/roles/${roleId}/candidates/${candidate.id}/status`, {
        checklist: newChecklist,
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating checklist:', error);
      // Revert on error
      setChecklist(checklist);
    }
  };

  const handleInterviewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingInterview(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`/api/roles/${roleId}/candidates/${candidate.id}/interview`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchInterview();
      // Mark interview as completed in checklist
      handleChecklistToggle('screening_interview_completed');
      alert('Interview uploaded and processed successfully!');
    } catch (error: any) {
      console.error('Error uploading interview:', error);
      alert(`Error: ${error.response?.data?.detail || 'Failed to upload interview'}`);
    } finally {
      setIsUploadingInterview(false);
      e.target.value = '';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-2 rounded-lg p-4 transition-all duration-200 ${getColorClass(candidate)} ${
        isDragging ? 'opacity-40 scale-[0.98]' : 'opacity-100'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-1">
          {/* Drag handle - grab here to drag card */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1.5 -m-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 touch-manipulation select-none"
            title="Drag to move between columns"
          >
            <FiMove className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-gray-900">{candidate.name || 'Unknown'}</h4>
        </div>
        <div className="flex items-center gap-1">
          {!candidate.not_pushing_forward && !candidate.sent_to_client && (
            <button
              type="button"
              onClick={handleMarkNotPushing}
              onMouseDown={(e) => e.stopPropagation()}
              className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1"
              title="Mark as not pushing forward"
            >
              <FiMinusCircle className="w-3.5 h-3.5" />
              Not pushing
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded"
            title="Delete candidate"
          >
            <FiTrash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            {isExpanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-gray-600 mb-2">
          {candidate.summary || 'No summary available'}
        </p>

        {candidate.skills && candidate.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {candidate.skills.map((skill: string, i: number) => (
              <span key={i} className="text-xs bg-white px-2 py-1 rounded">
                {skill}
              </span>
            ))}
          </div>
        )}

        {candidate.experience && (
          <p className="text-xs text-gray-500 mb-2 line-clamp-2">
            {candidate.experience}
          </p>
        )}

        {candidate.parsed_insights && Object.keys(candidate.parsed_insights).length > 0 && (
          <div className="text-xs text-gray-500">
            {candidate.parsed_insights.years_of_experience && (
              <span className="mr-2">Exp: {candidate.parsed_insights.years_of_experience} years</span>
            )}
            {candidate.parsed_insights.current_role && (
              <span>Current: {candidate.parsed_insights.current_role}</span>
            )}
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3 pt-3 border-t border-gray-300">
          <div>
            <h5 className="text-xs font-semibold text-gray-700 mb-1">Experience</h5>
            <p className="text-xs text-gray-600">{candidate.experience || 'N/A'}</p>
          </div>

          {/* Outreach Section - Only show in Outreach column */}
          {candidate.column === 'outreach' && (
            <>
              {!candidate.outreach_sent && (
                <div className="space-y-2">
                  {!outreachMessage ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateOutreach();
                      }}
                      disabled={isGenerating}
                      className="w-full text-xs bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isGenerating ? 'Generating...' : 'Generate Outreach'}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-white p-2 rounded text-xs">
                        <p className="font-semibold mb-1">Outreach Message:</p>
                        <p className="text-gray-700">{outreachMessage}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkOutreachSent();
                        }}
                        className="w-full text-xs bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
                      >
                        Mark as Sent
                      </button>
                    </div>
                  )}
                </div>
              )}

              {candidate.outreach_sent && (
                <div className="text-xs text-green-600 flex items-center gap-1">
                  <FiMessageSquare className="w-3 h-3" />
                  Outreach sent
                </div>
              )}
            </>
          )}

          {/* Outreach & Consent link - Show in Outreach and Follow-Up columns */}
          {(candidate.column === 'outreach' || candidate.column === 'follow-up') && (
            <Link
              href={`/outreach-consent?roleId=${roleId}&candidateId=${candidate.id}`}
              className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <FiMail className="w-3 h-3" />
              {candidate.column === 'follow-up' ? 'Send Consent' : 'Outreach & Consent'}
            </Link>
          )}

          {/* Checklist Section - Show in Follow-Up column */}
          {candidate.column === 'follow-up' && (
            <div className="space-y-3">
              <h5 className="text-xs font-semibold text-gray-700 mb-2">Follow-Up Checklist</h5>
              <div className="space-y-2">
                {[
                  { key: 'consent_form_sent', label: 'Consent form sent' },
                  { key: 'consent_form_received', label: 'Consent form received' },
                  { key: 'updated_cv_received', label: 'Updated CV received' },
                  { key: 'screening_interview_scheduled', label: 'Screening interview scheduled' },
                  { key: 'screening_interview_completed', label: 'Screening interview completed' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={checklist[item.key as keyof typeof checklist] || false}
                      onChange={() => handleChecklistToggle(item.key)}
                      className="rounded"
                    />
                    <span className={checklist[item.key as keyof typeof checklist] ? 'line-through text-gray-500' : ''}>
                      {item.label}
                    </span>
                    {checklist[item.key as keyof typeof checklist] && (
                      <FiCheck className="w-3 h-3 text-green-600" />
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Interview Section - Show in Follow-Up and Evaluation columns */}
          {(candidate.column === 'follow-up' || candidate.column === 'evaluation') && (
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <h5 className="text-xs font-semibold text-gray-700 mb-2">Interview</h5>
              {interview ? (
                <div className="space-y-2">
                  <div className="bg-white p-2 rounded text-xs">
                    <p className="font-semibold mb-1">Interview Summary:</p>
                    <p className="text-gray-700 mb-2">{interview.summary || 'N/A'}</p>
                    {interview.fit_score && (
                      <p className="text-gray-700">
                        <span className="font-semibold">Fit Score:</span> {interview.fit_score}/100
                      </p>
                    )}
                    {interview.recommendation && (
                      <p className="text-gray-700">
                        <span className="font-semibold">Recommendation:</span> {interview.recommendation}
                      </p>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-xs bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 cursor-pointer">
                    <FiUpload className="w-3 h-3" />
                    {isUploadingInterview ? 'Uploading...' : 'Upload New Interview'}
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleInterviewUpload}
                      className="hidden"
                      disabled={isUploadingInterview}
                    />
                  </label>
                </div>
              ) : (
                <div>
                  <label className="flex items-center gap-2 text-xs bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 cursor-pointer">
                    <FiMic className="w-3 h-3" />
                    {isUploadingInterview ? 'Uploading...' : 'Upload Interview Audio'}
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleInterviewUpload}
                      className="hidden"
                      disabled={isUploadingInterview}
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Upload audio file to transcribe and analyze</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

