/**
 * Format extracted_fields from HR briefings into human-readable text
 */
const LABELS: Record<string, string> = {
  priorities: 'Priorities',
  constraints: 'Constraints',
  special_requirements: 'Special Requirements',
  budget_notes: 'Budget Notes',
  timeline_notes: 'Timeline',
  team_dynamics: 'Team Dynamics',
  culture_fit_notes: 'Culture Fit',
};

function formatValue(value: unknown): string {
  if (value == null || value === '') return '';
  if (Array.isArray(value)) {
    return value
      .filter((v) => v != null && String(v).trim())
      .map((v) => `• ${String(v).trim()}`)
      .join('\n');
  }
  return String(value).trim();
}

export function formatExtractedFields(fields: Record<string, unknown> | null | undefined): string {
  if (!fields || typeof fields !== 'object') return 'No extracted fields';
  const entries = Object.entries(fields)
    .filter(([, v]) => v != null && (Array.isArray(v) ? v.length > 0 : String(v).trim()))
    .map(([key, value]) => {
      const label = LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const formatted = formatValue(value);
      return formatted ? `${label}\n${formatted}` : '';
    })
    .filter(Boolean);
  return entries.length > 0 ? entries.join('\n\n') : 'No extracted fields';
}
