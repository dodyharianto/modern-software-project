import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { FiSearch, FiMail, FiSend, FiUser, FiFileText, FiExternalLink } from 'react-icons/fi';

interface Role {
  id: string;
  title: string;
}

interface Candidate {
  id: string;
  name: string;
  summary?: string;
  column: string;
  outreach_message?: string | null;
  outreach_sent?: boolean;
  consent_form_sent?: boolean;
  consent_form_received?: boolean;
  consent_email?: {
    subject: string;
    content: string;
    consent_content: string;
    sent_at: string;
  };
  consent_reply?: {
    response: string;
    status: string;
    received_at: string;
  };
  outreach_reply?: {
    content: string;
    subject?: string;
    sentiment: string;
    intent?: string;
    analysis?: { key_points?: string[]; recommended_action?: string };
    received_at?: string;
  };
  simulated_email?: {
    content: string;
    sentiment: string;
    analysis?: { key_points: string[]; recommended_action: string };
  };
  not_pushing_forward?: boolean;
}

interface CandidateWithRole extends Candidate {
  roleId: string;
  roleTitle: string;
}

interface ConsentTemplate {
  id: string;
  name: string;
  content: string;
}

export default function OutreachConsentPage() {
  const router = useRouter();
  const { roleId, candidateId } = router.query;
  const [roles, setRoles] = useState<Role[]>([]);
  const [candidates, setCandidates] = useState<CandidateWithRole[]>([]);
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilter, setColumnFilter] = useState<'outreach' | 'follow-up'>('outreach');
  const [selected, setSelected] = useState<CandidateWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingOutreach, setIsGeneratingOutreach] = useState(false);
  const [isSendingConsent, setIsSendingConsent] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSimulatingOutreachReply, setIsSimulatingOutreachReply] = useState(false);
  const [consentContent, setConsentContent] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [outreachDraft, setOutreachDraft] = useState('');
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [isSavingOutreach, setIsSavingOutreach] = useState(false);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Pre-select candidate when navigating from role page with query params
  useEffect(() => {
    if (!loading && candidates.length > 0 && roleId && candidateId) {
      const rId = typeof roleId === 'string' ? roleId : roleId?.[0];
      const cId = typeof candidateId === 'string' ? candidateId : candidateId?.[0];
      if (rId && cId) {
        const preSelect = candidates.find((c) => c.roleId === rId && c.id === cId);
        if (preSelect && (!selected || selected.id !== cId || selected.roleId !== rId)) {
          setSelected(preSelect);
          setColumnFilter(preSelect.column === 'evaluation' ? 'follow-up' : (preSelect.column as 'outreach' | 'follow-up'));
        }
      }
    }
  }, [loading, candidates, roleId, candidateId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, templatesRes] = await Promise.all([
        axios.get('/api/roles'),
        axios.get('/api/consent-templates'),
      ]);
      const rolesList = rolesRes.data.roles || [];
      setRoles(rolesList);
      setTemplates(templatesRes.data.templates || []);

      const allCandidates: CandidateWithRole[] = [];
      for (const role of rolesList) {
        const candRes = await axios.get(`/api/roles/${role.id}/candidates`);
        const cands = (candRes.data.candidates || []).map((c: Candidate) => ({
          ...c,
          roleId: role.id,
          roleTitle: role.title,
        }));
        allCandidates.push(...cands);
      }
      setCandidates(allCandidates);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selected) {
      setCandidateEmail(`${selected.name.replace(/\s/g, '')}@example.com`);
      setOutreachDraft(selected.outreach_message || '');
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template) {
        setConsentContent(template.content);
      } else if (selected.consent_email?.consent_content) {
        setConsentContent(selected.consent_email.consent_content);
      } else {
        setConsentContent('');
      }
    }
  }, [selected, selectedTemplateId, templates]);

  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch = !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesColumn = c.column === columnFilter;
    return matchesSearch && matchesColumn;
  });

  const handleGenerateOutreach = async () => {
    if (!selected) return;
    setIsGeneratingOutreach(true);
    try {
      const res = await axios.post(
        `/api/roles/${selected.roleId}/candidates/${selected.id}/outreach`,
        { recruiter_notes: recruiterNotes.trim() || undefined }
      );
      const msg = res.data.outreach_message;
      setSelected({ ...selected, outreach_message: msg });
      setOutreachDraft(msg);
      fetchData();
    } catch (error) {
      console.error('Error generating outreach:', error);
      alert('Failed to generate outreach message');
    } finally {
      setIsGeneratingOutreach(false);
    }
  };

  const handleSuggestNotes = async () => {
    if (!selected) return;
    setIsGeneratingNotes(true);
    try {
      const res = await axios.post(
        `/api/roles/${selected.roleId}/candidates/${selected.id}/outreach-notes`
      );
      setRecruiterNotes(res.data.recruiter_notes || '');
    } catch (error) {
      console.error('Error generating notes:', error);
      alert('Failed to generate notes');
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  const handleSaveOutreach = async () => {
    if (!selected || !outreachDraft.trim()) return;
    setIsSavingOutreach(true);
    try {
      await axios.put(
        `/api/roles/${selected.roleId}/candidates/${selected.id}/outreach`,
        { outreach_message: outreachDraft.trim() }
      );
      setSelected({ ...selected, outreach_message: outreachDraft.trim() });
      fetchData();
    } catch (error) {
      console.error('Error saving outreach:', error);
      alert('Failed to save outreach');
    } finally {
      setIsSavingOutreach(false);
    }
  };

  const handleSendConsent = async () => {
    if (!selected) return;
    const content = consentContent.trim();
    if (!content.trim()) {
      alert('Please select or enter consent content');
      return;
    }
    setIsSendingConsent(true);
    try {
      const template = templates.find((t) => t.id === selectedTemplateId);
      await axios.post(
        `/api/roles/${selected.roleId}/candidates/${selected.id}/send-consent`,
        {
          candidate_name: selected.name,
          role_title: selected.roleTitle,
          email: candidateEmail,
          consent_content: content,
          consent_content_id: template?.id || '',
        }
      );
      setSelected(null);
      fetchData();
    } catch (error) {
      console.error('Error sending consent:', error);
      alert('Failed to send consent email');
    } finally {
      setIsSendingConsent(false);
    }
  };

  const handleMarkAsNegative = async () => {
    if (!selected) return;
    try {
      await axios.put(`/api/roles/${selected.roleId}/candidates/${selected.id}/status`, {
        not_pushing_forward: true,
      });
      setSelected({ ...selected, not_pushing_forward: true });
      fetchData();
    } catch (error: any) {
      console.error('Error marking as negative:', error);
      alert(error.response?.data?.detail || 'Failed to mark as negative');
    }
  };

  const handleSimulateOutreachReply = async (replyType: 'positive' | 'negative') => {
    if (!selected) return;
    setIsSimulatingOutreachReply(true);
    try {
      const res = await axios.post(
        `/api/roles/${selected.roleId}/candidates/${selected.id}/simulate-outreach-reply`,
        { reply_type: replyType }
      );
      setSelected(res.data.candidate);
      fetchData();
      if (replyType === 'positive') {
        alert('Good response simulated. Candidate moved to Follow-up. You can now send the consent form below.');
      } else {
        alert('Not interested response simulated. Candidate marked as negative.');
      }
    } catch (error: any) {
      console.error('Error simulating outreach reply:', error);
      const msg = error.response?.data?.detail;
      const detail = typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.map((x: any) => x?.msg || x).join(' ') : 'Failed to simulate outreach reply';
      alert(detail || 'Failed to simulate outreach reply');
    } finally {
      setIsSimulatingOutreachReply(false);
    }
  };

  const handleSimulateReply = async (consentStatus: 'consented' | 'declined') => {
    if (!selected) return;
    setIsSimulating(true);
    try {
      const res = await axios.post(
        `/api/roles/${selected.roleId}/candidates/${selected.id}/simulate-consent-reply`,
        { consent_status: consentStatus }
      );
      setSelected(res.data.candidate);
      fetchData();
    } catch (error) {
      console.error('Error simulating reply:', error);
      alert('Failed to simulate reply');
    } finally {
      setIsSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Outreach & Consent</h1>
          <p className="text-gray-600">
            Craft personalized outreach, send consent forms, and manage candidate replies
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Candidate list */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow p-4">
            <div className="mb-4">
              <div className="relative mb-3">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search candidates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                {(['outreach', 'follow-up'] as const).map((col) => (
                  <button
                    key={col}
                    onClick={() => setColumnFilter(col)}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      columnFilter === col
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {col.charAt(0).toUpperCase() + col.slice(1).replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredCandidates.map((c) => (
                <div
                  key={`${c.roleId}-${c.id}`}
                  className={`rounded-lg border transition ${
                    selected?.id === c.id && selected?.roleId === c.roleId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <button
                    onClick={() => setSelected(c)}
                    className="w-full text-left p-3"
                  >
                    <div className="font-medium text-gray-900">{c.name}</div>
                    <div className="text-sm text-gray-500">{c.roleTitle}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {c.outreach_reply && (
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          c.outreach_reply.sentiment === 'positive'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {c.outreach_reply.sentiment === 'positive' ? 'Replied (interested)' : 'Replied (not interested)'}
                        </span>
                      )}
                      {c.consent_form_received && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          Consent received
                        </span>
                      )}
                      {c.consent_form_sent && !c.consent_form_received && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                          Consent sent
                        </span>
                      )}
                      {(c.consent_reply || c.simulated_email) && (c.consent_reply?.status || c.simulated_email?.consent_status) === 'declined' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800">
                          Declined consent
                        </span>
                      )}
                      {c.not_pushing_forward && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800">
                          Negative
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              ))}
              {filteredCandidates.length === 0 && (
                <div className="text-gray-500 py-8 text-center">No candidates found</div>
              )}
            </div>
          </div>

          {/* Right: Selected candidate details */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            {!selected ? (
              <div className="text-gray-500 py-16 text-center">
                Select a candidate to craft outreach messages, send consent forms, or simulate replies
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <FiUser className="w-5 h-5" />
                      {selected.name}
                    </h2>
                    <p className="text-gray-600">{selected.roleTitle}</p>
                  </div>
                  <Link
                    href={`/roles/${selected.roleId}`}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <FiExternalLink className="w-4 h-4" />
                    View in Role
                  </Link>
                </div>

                {/* Outreach section - first and primary */}
                <div className="border-b pb-6">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <FiMail className="w-5 h-5" />
                    Craft Outreach Message
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Add personal notes below to guide the AI. Then generate a draft and edit it to make it yours—avoid generic messages.
                  </p>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your notes / customization hints</label>
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={handleSuggestNotes}
                        disabled={isGeneratingNotes}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        {isGeneratingNotes ? 'Generating...' : 'AI Suggest Notes'}
                      </button>
                    </div>
                    <textarea
                      value={recruiterNotes}
                      onChange={(e) => setRecruiterNotes(e.target.value)}
                      placeholder="e.g. Mention their work at [Company]. We're looking for someone who can start by March. Emphasize the remote option."
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={handleGenerateOutreach}
                      disabled={isGeneratingOutreach}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {isGeneratingOutreach ? 'Generating...' : 'Generate Draft'}
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Outreach message (edit to tailor)</label>
                    <textarea
                      value={outreachDraft}
                      onChange={(e) => setOutreachDraft(e.target.value)}
                      placeholder="Generate a draft above, then edit here to add your personal touch..."
                      rows={8}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    />
                    {outreachDraft.trim() && (
                      <button
                        onClick={handleSaveOutreach}
                        disabled={isSavingOutreach}
                        className="mt-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm"
                      >
                        {isSavingOutreach ? 'Saving...' : 'Save Edits'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Track replies from mailbox: simulate good/bad response */}
                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Track replies from your mailbox (Gmail / Outlook)</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    In production you would track real candidate replies here. For testing, simulate a response as if the candidate replied to your outreach. Only good (interested) responses proceed to Follow-up and consent.
                  </p>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => handleSimulateOutreachReply('positive')}
                      disabled={isSimulatingOutreachReply}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {isSimulatingOutreachReply ? 'Simulating...' : 'Simulate good response'}
                    </button>
                    <button
                      onClick={() => handleSimulateOutreachReply('negative')}
                      disabled={isSimulatingOutreachReply}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                    >
                      Simulate bad response
                    </button>
                  </div>
                  {selected.outreach_reply && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">
                        Reply received · {selected.outreach_reply.sentiment} · {selected.outreach_reply.intent || ''}
                      </div>
                      <div className="text-sm whitespace-pre-wrap text-gray-800">
                        {selected.outreach_reply.content}
                      </div>
                      {selected.outreach_reply.analysis?.recommended_action && (
                        <div className="mt-2 text-xs text-gray-600">
                          Recommended action: {selected.outreach_reply.analysis.recommended_action}
                        </div>
                      )}
                      {selected.outreach_reply.sentiment !== 'positive' && !selected.not_pushing_forward && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={handleMarkAsNegative}
                            className="px-3 py-1.5 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                          >
                            Mark as negative
                          </button>
                          <span className="ml-2 text-xs text-gray-500">Candidate did not express interest to follow up</span>
                        </div>
                      )}
                      {selected.not_pushing_forward && (
                        <div className="mt-2 text-xs text-red-700 font-medium">Marked as negative (not pushing forward)</div>
                      )}
                    </div>
                  )}
                  {selected.column === 'outreach' && !selected.outreach_reply && !selected.not_pushing_forward && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={handleMarkAsNegative}
                        className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Mark as negative
                      </button>
                      <span className="ml-2 text-xs text-gray-500">If they won’t be followed up</span>
                    </div>
                  )}
                </div>

                {/* Consent section - only for follow-up candidates (after good outreach reply) */}
                {selected.column === 'follow-up' && (
                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <FiFileText className="w-4 h-4" />
                    Send Consent Form
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Candidate email</label>
                      <input
                        type="email"
                        value={candidateEmail}
                        onChange={(e) => setCandidateEmail(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        placeholder="candidate@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Consent content</label>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => {
                          setSelectedTemplateId(e.target.value);
                          const t = templates.find((x) => x.id === e.target.value);
                          if (t) setConsentContent(t.content);
                        }}
                        className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
                      >
                        <option value="">-- Select template or type below --</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <textarea
                        value={consentContent}
                        onChange={(e) => setConsentContent(e.target.value)}
                        placeholder="Or type/paste consent content..."
                        rows={8}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      onClick={handleSendConsent}
                      disabled={isSendingConsent || selected.consent_form_sent}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiSend className="w-4 h-4" />
                      {selected.consent_form_sent ? 'Already Sent' : 'Send Email with Consent'}
                    </button>
                  </div>
                </div>
                )}

                {/* Simulate response from candidate (I consent / I do not consent) - only in Follow-up */}
                {selected.column === 'follow-up' && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-900 mb-2">Simulate response from candidate</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Test the consent flow by simulating a candidate reply (I consent / I do not consent).
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSimulateReply('consented')}
                        disabled={isSimulating}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        I CONSENT
                      </button>
                      <button
                        onClick={() => handleSimulateReply('declined')}
                        disabled={isSimulating}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        I DO NOT CONSENT
                      </button>
                    </div>
                  </div>
                )}

                {/* Candidate reply (after real or simulated consent response) */}
                {(selected.consent_reply || selected.simulated_email) && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-900 mb-2">Candidate Reply</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm whitespace-pre-wrap">
                        {selected.consent_reply?.response || selected.simulated_email?.content}
                      </div>
                      {selected.simulated_email?.analysis && (
                        <div className="mt-2 text-xs text-gray-600">
                          <div>Sentiment: {selected.simulated_email.sentiment}</div>
                          {selected.simulated_email.analysis.recommended_action && (
                            <div>Action: {selected.simulated_email.analysis.recommended_action}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
