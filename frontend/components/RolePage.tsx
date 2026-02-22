import { useState, useEffect } from 'react';
import { formatExtractedFields } from '../lib/formatExtractedFields';
import axios from 'axios';
import { FiUpload, FiEdit2, FiSave, FiX, FiRefreshCw, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import KanbanBoard from './KanbanBoard';
import EvaluationChat from './EvaluationChat';
import InterviewHelper from './InterviewHelper';

interface RolePageProps {
  role: any;
  onUpdate: () => void;
}

export default function RolePage({ role, onUpdate }: RolePageProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [jd, setJd] = useState<any>(null);
  const [briefing, setBriefing] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isEditingJD, setIsEditingJD] = useState(false);
  const [editingJD, setEditingJD] = useState<any>({});
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [localRole, setLocalRole] = useState<any>(role || {});
  const [candidateInterviews, setCandidateInterviews] = useState<Record<string, any>>({});
  const [evaluationMessages, setEvaluationMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());

  const COLUMN_ORDER: Record<string, number> = { outreach: 0, 'follow-up': 1, evaluation: 2 };
  const sortedCandidates = [...candidates].sort((a, b) => {
    const colA = a.column || 'outreach';
    const colB = b.column || 'outreach';
    const orderA = COLUMN_ORDER[colA] ?? 3;
    const orderB = COLUMN_ORDER[colB] ?? 3;
    if (orderA !== orderB) return orderA - orderB;
    return (a.name || '').localeCompare(b.name || '');
  });

  const toggleProfile = (id: string) => {
    setExpandedProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (role) {
      setLocalRole(role);
      setEvaluationMessages([]); // Clear when switching roles; will load from server when opening Evaluation tab
    }
    fetchJD();
    fetchBriefing();
    fetchCandidates();
  }, [role]);

  useEffect(() => {
    if (role?.id && activeTab === 'evaluation') {
      axios.get(`/api/roles/${role.id}/evaluation-chat`).then((res) => {
        const msgs = res.data?.messages || [];
        if (Array.isArray(msgs) && msgs.length > 0) setEvaluationMessages(msgs);
      }).catch(() => {});
    }
  }, [role?.id, activeTab]);

  const saveEvaluationChat = (messages: { role: 'user' | 'assistant'; content: string }[]) => {
    if (!role?.id) return;
    axios.put(`/api/roles/${role.id}/evaluation-chat`, { messages }).catch(() => {});
  };

  /** Persist evaluation chat immediately when backend returns (so reply is saved even if user switched tab). */
  const persistEvaluationChatNow = (messages: { role: string; content: string }[]) => {
    if (!role?.id) return;
    axios.put(`/api/roles/${role.id}/evaluation-chat`, { messages }).catch(() => {});
  };

  const handleClearEvaluationChat = () => {
    if (!confirm('Clear this evaluation chat? This cannot be undone.')) return;
    setEvaluationMessages([]);
    if (role?.id) {
      axios.delete(`/api/roles/${role.id}/evaluation-chat`).catch(() => {});
    }
  };

  useEffect(() => {
    if (!role?.id || evaluationMessages.length === 0) return;
    const timer = setTimeout(() => saveEvaluationChat(evaluationMessages), 400);
    return () => clearTimeout(timer);
  }, [role?.id, evaluationMessages]);

  const fetchJD = async () => {
    try {
      const response = await axios.get(`/api/roles/${role.id}/jd`);
      setJd(response.data);
      setEditingJD(response.data);
    } catch (error) {
      // JD might not exist yet
    }
  };

  const fetchBriefing = async () => {
    try {
      const response = await axios.get(`/api/roles/${role.id}/hr-briefing`);
      setBriefing(response.data.briefing);
    } catch (error) {
      // Briefing might not exist yet
    }
  };

  const fetchCandidates = async () => {
    try {
      const response = await axios.get(`/api/roles/${role.id}/candidates`);
      setCandidates(response.data.candidates || []);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  };

  const handleMarkNotPushing = async (candidateId: string) => {
    try {
      await axios.put(`/api/roles/${role.id}/candidates/${candidateId}/status`, {
        not_pushing_forward: true,
      });
      await fetchCandidates();
    } catch (error) {
      console.error('Error marking as not pushing:', error);
      alert('Failed to update candidate status');
    }
  };

  const handleDeleteCandidate = async (candidateId: string, candidateName?: string) => {
    if (!confirm(`Delete candidate "${candidateName || 'Unknown'}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/roles/${role.id}/candidates/${candidateId}`);
      if (selectedCandidate?.id === candidateId) setSelectedCandidate(null);
      await fetchCandidates();
    } catch (error) {
      console.error('Error deleting candidate:', error);
      alert('Failed to delete candidate');
    }
  };

  const fetchCandidateInterviews = async () => {
    if (!candidates.length) return;
    const interviews: Record<string, any> = {};
    await Promise.all(
      candidates.map(async (cand) => {
        try {
          const res = await axios.get(`/api/roles/${role.id}/candidates/${cand.id}/interview`);
          if (res.data.interview) interviews[cand.id] = res.data.interview;
        } catch {
          // No interview yet
        }
      })
    );
    setCandidateInterviews(interviews);
  };

  const handleJDUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`/api/roles/${role.id}/jd`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchJD();
    } catch (error: any) {
      console.error('Error uploading JD:', error);
      const message = error.response?.data?.detail || error.response?.data?.message || error.message || 'Failed to upload JD';
      alert(typeof message === 'string' ? message : 'Failed to upload JD');
    }
  };

  const handleSaveJD = async () => {
    try {
      await axios.put(`/api/roles/${role.id}/jd`, editingJD);
      setJd(editingJD);
      setIsEditingJD(false);
    } catch (error) {
      console.error('Error saving JD:', error);
      alert('Failed to save JD');
    }
  };

  useEffect(() => {
    if (activeTab === 'interview' && candidates.length > 0) {
      fetchCandidateInterviews();
    }
  }, [activeTab, candidates]);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'pipeline', label: 'Candidate Pipeline' },
    { id: 'interview', label: 'Interview Helper' },
    { id: 'evaluation', label: 'Evaluation' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">{localRole?.title || role.title}</h1>
          <p className="text-gray-600 mt-1">Role ID: {role.id}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Job Description Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Job Description</h2>
                {!jd && (
                  <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer">
                    <FiUpload className="w-4 h-4" />
                    Upload JD PDF
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleJDUpload}
                      className="hidden"
                    />
                  </label>
                )}
                {jd && !isEditingJD && (
                  <button
                    onClick={() => setIsEditingJD(true)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <FiEdit2 className="w-4 h-4" />
                    Edit
                  </button>
                )}
                {isEditingJD && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveJD}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      <FiSave className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingJD(false);
                        setEditingJD(jd);
                      }}
                      className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                    >
                      <FiX className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {jd ? (
                <div className="space-y-4">
                  {isEditingJD ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Job Title
                        </label>
                        <input
                          type="text"
                          value={editingJD.job_title || ''}
                          onChange={(e) => setEditingJD({ ...editingJD, job_title: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Summary
                        </label>
                        <textarea
                          value={editingJD.job_summary || ''}
                          onChange={(e) => setEditingJD({ ...editingJD, job_summary: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          rows={4}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Responsibilities
                        </label>
                        <textarea
                          value={Array.isArray(editingJD.responsibilities) ? editingJD.responsibilities.join('\n') : ''}
                          onChange={(e) => setEditingJD({ ...editingJD, responsibilities: e.target.value.split('\n').filter(l => l.trim()) })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          rows={6}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Requirements
                        </label>
                        <textarea
                          value={Array.isArray(editingJD.requirements) ? editingJD.requirements.join('\n') : ''}
                          onChange={(e) => setEditingJD({ ...editingJD, requirements: e.target.value.split('\n').filter(l => l.trim()) })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          rows={6}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">Title</h3>
                        <p className="text-gray-700">{jd.job_title || 'N/A'}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Summary</h3>
                        <p className="text-gray-700">{jd.job_summary || 'N/A'}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Responsibilities</h3>
                        <ul className="list-disc list-inside text-gray-700">
                          {Array.isArray(jd.responsibilities) && jd.responsibilities.length > 0
                            ? jd.responsibilities.map((r: string, i: number) => (
                                <li key={i}>{r}</li>
                              ))
                            : <li>N/A</li>}
                        </ul>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Requirements</h3>
                        <ul className="list-disc list-inside text-gray-700">
                          {Array.isArray(jd.requirements) && jd.requirements.length > 0
                            ? jd.requirements.map((r: string, i: number) => (
                                <li key={i}>{r}</li>
                              ))
                            : <li>N/A</li>}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No job description uploaded yet</p>
                  <p className="text-sm mt-2">Upload a PDF to get started</p>
                </div>
              )}
            </div>

            {/* HR Briefing Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">HR Briefing Details</h2>
              {briefing ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Summary</h3>
                    <p className="text-gray-700">{briefing.summary || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Extracted Fields</h3>
                    <div className="bg-gray-50 p-4 rounded text-sm whitespace-pre-wrap text-gray-700">
                      {formatExtractedFields(briefing.extracted_fields)}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No HR briefing linked to this role</p>
              )}
            </div>

            {/* Hiring Plan Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Hiring Plan</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hiring Budget
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Enter budget"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Vacancies
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Enter number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Urgency
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timeline
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., 2 months"
                  />
                </div>
              </div>
            </div>

            {/* D. Candidate Preference & Requirement Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold">D. Candidate Preference & Requirement Fields</h2>
                  <p className="text-sm text-gray-600 mt-1">Fields the interviewer must collect from candidates</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await axios.put(`/api/roles/${role.id}`, {
                        candidate_requirement_fields: localRole.candidate_requirement_fields || [],
                      });
                      onUpdate();
                      alert('Candidate requirement fields saved successfully!');
                    } catch (error) {
                      console.error('Error saving:', error);
                      alert('Failed to save fields');
                    }
                  }}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  <FiSave className="w-4 h-4" />
                  Save
                </button>
              </div>
              
              {/* Display saved fields */}
              {(localRole.candidate_requirement_fields && localRole.candidate_requirement_fields.length > 0) && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Current Fields:</p>
                  <div className="flex flex-wrap gap-2">
                    {localRole.candidate_requirement_fields.map((field: string, index: number) => (
                      field && (
                        <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                          {field}
                        </span>
                      )
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {(localRole.candidate_requirement_fields || []).map((field: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={field}
                      onChange={(e) => {
                        const updated = [...(localRole.candidate_requirement_fields || [])];
                        updated[index] = e.target.value;
                        setLocalRole({ ...localRole, candidate_requirement_fields: updated });
                      }}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Field name (e.g., Expected salary)"
                    />
                    <button
                      onClick={() => {
                        const updated = [...(localRole.candidate_requirement_fields || [])];
                        updated.splice(index, 1);
                        setLocalRole({ ...localRole, candidate_requirement_fields: updated });
                      }}
                      className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const updated = [...(localRole.candidate_requirement_fields || []), ''];
                    setLocalRole({ ...localRole, candidate_requirement_fields: updated });
                  }}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  + Add Field
                </button>
              </div>
            </div>

            {/* E. Evaluation Criteria Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold">E. Evaluation Criteria</h2>
                  <p className="text-sm text-gray-600 mt-1">Criteria used to score candidate fit</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await axios.put(`/api/roles/${role.id}`, {
                        evaluation_criteria: localRole.evaluation_criteria || [],
                      });
                      onUpdate();
                      alert('Evaluation criteria saved successfully!');
                    } catch (error) {
                      console.error('Error saving:', error);
                      alert('Failed to save criteria');
                    }
                  }}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  <FiSave className="w-4 h-4" />
                  Save
                </button>
              </div>
              
              {/* Display saved criteria */}
              {(localRole.evaluation_criteria && localRole.evaluation_criteria.length > 0) && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Current Criteria:</p>
                  <div className="flex flex-wrap gap-2">
                    {localRole.evaluation_criteria.map((criterion: string, index: number) => (
                      criterion && (
                        <span key={index} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                          {criterion}
                        </span>
                      )
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {(localRole.evaluation_criteria || []).map((criterion: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={criterion}
                      onChange={(e) => {
                        const updated = [...(localRole.evaluation_criteria || [])];
                        updated[index] = e.target.value;
                        setLocalRole({ ...localRole, evaluation_criteria: updated });
                      }}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Criterion name (e.g., Must-haves)"
                    />
                    <button
                      onClick={() => {
                        const updated = [...(localRole.evaluation_criteria || [])];
                        updated.splice(index, 1);
                        setLocalRole({ ...localRole, evaluation_criteria: updated });
                      }}
                      className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const updated = [...(localRole.evaluation_criteria || []), ''];
                    setLocalRole({ ...localRole, evaluation_criteria: updated });
                  }}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  + Add Criterion
                </button>
              </div>
            </div>

            {/* Candidate Profiles Section - sorted by status, accordion */}
            {candidates.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Candidate Profiles</h2>
                <p className="text-sm text-gray-500 mb-4">Sorted by pipeline status. Click to expand or collapse.</p>
                <div className="space-y-2">
                  {sortedCandidates.map((candidate) => {
                    const isExpanded = expandedProfiles.has(candidate.id);
                    return (
                      <div key={candidate.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleProfile(candidate.id)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <FiChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
                            ) : (
                              <FiChevronRight className="w-5 h-5 text-gray-500 shrink-0" />
                            )}
                            <h3 className="font-semibold text-gray-900">{candidate.name || 'Unknown Candidate'}</h3>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded shrink-0 ${
                            candidate.sent_to_client ? 'bg-green-100 text-green-800' :
                            candidate.not_pushing_forward ? 'bg-red-100 text-red-800' :
                            candidate.column === 'outreach' ? 'bg-slate-100 text-slate-800' :
                            candidate.column === 'follow-up' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {candidate.sent_to_client ? 'Sent to client' :
                             candidate.not_pushing_forward ? 'Not pushing' :
                             (candidate.column || 'outreach').replace('-', ' ')}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-3">
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-1">Summary</h4>
                              <p className="text-sm text-gray-600">{candidate.summary || 'No summary available'}</p>
                            </div>

                            {candidate.skills && candidate.skills.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-1">Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                  {candidate.skills.map((skill: string, i: number) => (
                                    <span key={i} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {candidate.experience && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-1">Experience</h4>
                                <p className="text-sm text-gray-600">{candidate.experience}</p>
                              </div>
                            )}

                            {candidate.parsed_insights && Object.keys(candidate.parsed_insights).length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-1">Additional Insights</h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                  {candidate.parsed_insights.years_of_experience && (
                                    <p>Years of Experience: {candidate.parsed_insights.years_of_experience}</p>
                                  )}
                                  {candidate.parsed_insights.current_role && (
                                    <p>Current Role: {candidate.parsed_insights.current_role}</p>
                                  )}
                                  {candidate.parsed_insights.education && (
                                    <p>Education: {candidate.parsed_insights.education}</p>
                                  )}
                                  {candidate.parsed_insights.key_achievements && candidate.parsed_insights.key_achievements.length > 0 && (
                                    <div>
                                      <p className="font-semibold">Key Achievements:</p>
                                      <ul className="list-disc list-inside ml-2">
                                        {candidate.parsed_insights.key_achievements.map((achievement: string, i: number) => (
                                          <li key={i}>{achievement}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {candidate.parsed_insights.certifications && candidate.parsed_insights.certifications.length > 0 && (
                                    <p>Certifications: {candidate.parsed_insights.certifications.join(', ')}</p>
                                  )}
                                </div>
                              </div>
                            )}
                            <div className="pt-2 border-t border-gray-200 flex flex-wrap gap-2">
                              {!candidate.not_pushing_forward && !candidate.sent_to_client && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkNotPushing(candidate.id);
                                  }}
                                  className="text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded"
                                >
                                  Mark as not pushing
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCandidate(candidate.id, candidate.name);
                                }}
                                className="text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded"
                              >
                                Delete candidate
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'pipeline' && (
          <KanbanBoard roleId={role.id} roleTitle={role.title} candidates={candidates} onUpdate={fetchCandidates} />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationChat
            roleId={role.id}
            messages={evaluationMessages}
            onMessagesChange={setEvaluationMessages}
            onClearChat={handleClearEvaluationChat}
            onPersistMessages={persistEvaluationChatNow}
          />
        )}

        {activeTab === 'interview' && (
          <div className="space-y-6">
            {candidates.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                <p>No candidates available. Upload candidate PDFs first.</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Select Candidate for Interview</h2>
                    <button
                      onClick={fetchCandidateInterviews}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                      title="Refresh completion status"
                    >
                      <FiRefreshCw className="w-4 h-4" />
                      Refresh
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedCandidates.filter((c) => c && c.id).map((cand) => {
                      const interview = candidateInterviews[cand.id];
                      const hasCompletedInterview = interview && (
                        interview.interview_completed === true ||
                        !!(interview.transcription || interview.summary)
                      );
                      const isSelected = selectedCandidate?.id === cand.id;
                      return (
                        <div
                          key={cand.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedCandidate(cand)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCandidate(cand); } }}
                          className={`p-4 rounded-lg border-2 text-left transition cursor-pointer ${
                            isSelected
                              ? hasCompletedInterview
                                ? 'border-green-600 bg-green-50'
                                : 'border-blue-600 bg-blue-50'
                              : hasCompletedInterview
                                ? 'border-green-400 bg-green-50/50 hover:border-green-500'
                                : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-semibold text-gray-900">{cand.name || 'Unknown'}</h3>
                            {hasCompletedInterview && (
                              <div className="flex-shrink-0" title="Interview completed">
                                <div className="w-3 h-3 bg-green-500 rounded-full" />
                              </div>
                            )}
                          </div>
                          <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded ${
                            cand.sent_to_client ? 'bg-green-100 text-green-800' :
                            cand.not_pushing_forward ? 'bg-red-100 text-red-800' :
                            cand.column === 'outreach' ? 'bg-slate-100 text-slate-800' :
                            cand.column === 'follow-up' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {cand.sent_to_client ? 'Sent to client' :
                             cand.not_pushing_forward ? 'Not pushing' :
                             (cand.column || 'outreach').replace('-', ' ')}
                          </span>
                          <p className="text-sm text-gray-600 mt-2">
                            {cand.summary?.substring(0, 100) || 'No summary'}...
                          </p>
                          {hasCompletedInterview && (
                            <div className="mt-2 pt-2 border-t border-green-200">
                              <span className="text-xs text-green-700 font-medium">✓ Interview Completed</span>
                            </div>
                          )}
                          <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-2">
                            {!cand.not_pushing_forward && !cand.sent_to_client && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkNotPushing(cand.id);
                                }}
                                className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded"
                              >
                                Not pushing
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCandidate(cand.id, cand.name);
                              }}
                              className="text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedCandidate?.id && (
                  <InterviewHelper
                    key={selectedCandidate.id}
                    roleId={role.id}
                    candidateId={selectedCandidate.id}
                    candidate={selectedCandidate}
                    jd={jd}
                    briefing={briefing}
                    role={localRole}
                    onInterviewComplete={fetchCandidateInterviews}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

