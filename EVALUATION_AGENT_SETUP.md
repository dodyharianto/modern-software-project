# Evaluation Agent Setup

## Overview
The Evaluation Agent is an AI-powered chatbot that helps recruiters evaluate candidates by answering questions about candidates, their interviews, and comparing them against job requirements and other candidates.

**Where to use it:** On the **Role page** (open a role, then the **Evaluation** tab). The **Outreach & Consent** page has only Outreach and Follow-up tabs; evaluation is done per role from the role detail view.

## Architecture

### Agent Configuration
- **Model**: GPT-4
- **Temperature**: 0.4 (balanced between creativity and consistency)
- **Framework**: CrewAI
- **Role**: "Candidate Evaluation Specialist"

### Key Features
1. **Context-Aware Evaluation**: Uses multiple data sources:
   - Job Description (JD)
   - HR Briefing (role-specific insights)
   - Candidate profiles (resume data)
   - Interview data (transcription, summary, analysis)
   - Evaluation criteria
   - Recruiter's remarks

2. **Multi-Candidate Comparison**: Can compare multiple candidates simultaneously

3. **Status Awareness**: Knows which candidates are:
   - Actively being evaluated
   - Already sent to client (won't re-recommend)
   - Not pushing forward (excluded)

## Data Flow

### 1. Endpoint: `/api/roles/{role_id}/candidates/evaluate`
```python
# Filters candidates to only those in "evaluation" column with completed interviews
evaluation_candidates = [candidates in evaluation column with completed interviews]
sent_to_client_candidates = [candidates already sent to client, for reference only]

# Passes to agent:
evaluation_agent.evaluate(
    question,
    role,           # Role details + evaluation criteria
    None,           # Single candidate (not used in general evaluation)
    jd,             # Job description
    briefing,       # HR briefing (role-specific view)
    None,           # Single interview (not used in general evaluation)
    all_candidates, # All candidates with interviews
    sent_to_client_candidates  # For reference only
)
```

### 2. Context Building
The agent builds context from:

#### Role Information
- Role title
- **Evaluation Criteria** (critical for scoring)

#### Job Description
- Job title
- Summary
- Requirements
- Skills

#### HR Briefing
- Summary
- Extracted fields (priorities, constraints, special requirements)

#### Candidate Data (for each candidate)
- Name
- Summary
- Skills
- Experience
- Parsed insights (years of experience, current role, education, achievements)
- Pipeline status

#### Interview Data (for each candidate) ⭐ **NOW INCLUDES TRANSCRIPTION**
- **Summary**: AI-generated interview summary
- **Key Points**: Important discussion points
- **Strengths**: Candidate strengths identified
- **Concerns**: Areas of concern
- **Fit Score**: Numerical score (0-100)
- **Recommendation**: AI recommendation
- **Full Transcription**: ⭐ Complete interview transcript (if available)
- **Transcript with Speakers**: ⭐ Speaker-labeled transcript (if available)
- **Candidate Responses**: ⭐ Structured candidate answers (if available)
- **Recruiter's Remarks**: Additional notes from recruiter

## Interview Data Handling: Summary vs Transcription

### Data Structure
The evaluation agent receives interview data in a prioritized hierarchy:

1. **PRIMARY: Interview Summary** ⭐
   - AI-generated summary of the interview
   - Used for general evaluation and overview questions
   - Clean, concise, and focused on key information

2. **SECONDARY: Structured Analysis**
   - Key Points: Important discussion topics
   - Strengths: Candidate strengths identified
   - Concerns: Areas of concern
   - Fit Score: Numerical assessment (0-100)
   - Recommendation: AI recommendation

3. **REFERENCE: Full Transcription**
   - Complete interview transcript (if available)
   - Truncated to 20,000 characters if too long to avoid overwhelming context
   - Used only when specific quotes or exact wording is needed
   - Speaker-labeled version available if diarization was performed

4. **ADDITIONAL: Candidate Responses & Recruiter Remarks**
   - Structured responses to specific questions
   - Recruiter's manual notes and observations

### Why This Approach?

**Problem**: Raw transcriptions can be:
- Very long (thousands of words)
- Contain filler words, repetitions, "um", "uh"
- Overwhelm the LLM context window
- Confuse the agent with too much information

**Solution**: 
- **Prioritize the summary** - it's already processed and condensed
- **Include transcription as reference** - available when specific details are needed
- **Truncate long transcripts** - prevents context overflow
- **Clear instructions** - agent knows when to use summary vs transcription

### Code Changes
```python
# Single candidate evaluation
if interview:
    # Truncate transcription if too long (max 20,000 chars)
    raw_transcript = interview.get('transcription') or interview.get('transcript_with_speakers')
    if raw_transcript:
        max_length = 20000
        if len(raw_transcript) > max_length:
            truncated = raw_transcript[:max_length]
            transcription_text = f"\nFull Transcription (truncated - first {max_length} chars, use for specific quotes/details): {truncated}... [TRUNCATED]"
        else:
            transcription_text = f"\nFull Transcription (use for specific quotes/details when needed): {raw_transcript}"
    
    # Include in context with clear priority markers
    context_parts.append(f"""
    Interview:
    Summary: {interview.get('summary', '')}  [PRIMARY SOURCE - Use this for general evaluation]
    ...
    {transcription_text}  # Only included if available, marked as reference
    ...
    """)
```

### Instructions to Agent
Clear priority system:
```
10. INTERVIEW DATA PRIORITY: 
    - PRIMARY: Use the Interview Summary for general evaluation and overview questions
    - SECONDARY: Use the Interview Key Points, Strengths, and Concerns for structured analysis
    - REFERENCE ONLY: Use the Full Transcription only when asked for specific quotes, exact wording, or detailed discussion points
    - When transcription is provided, it's for reference when specific details are needed - don't repeat everything from it if the summary already covers it
...
16. If asked about specific interview content (e.g., "What did they say about X?"), reference the transcription. For general questions, use the summary.
```

## Example Questions the Agent Can Answer

### General Questions (Uses Summary)
- ✅ "How did the interview go?" → Uses summary
- ✅ "What are the candidate's strengths?" → Uses strengths from summary
- ✅ "What concerns were raised?" → Uses concerns from summary
- ✅ "What's the fit score?" → Uses fit score

### Specific Detail Questions (Uses Transcription)
- ✅ "What did the candidate say about their Python experience?" → References transcription for exact quote
- ✅ "What specific projects did they mention?" → Quotes from transcript
- ✅ "How did they respond to the question about teamwork?" → Uses exact response from transcript
- ✅ "What were their exact words when discussing salary expectations?" → References transcription

### Smart Behavior
- For general questions, the agent uses the summary (faster, cleaner)
- For specific quote requests, the agent references the transcription
- The agent doesn't repeat everything from the transcription if the summary already covers it

## Usage Example

### Frontend Request
```typescript
// User asks: "What did John Smith say about his experience with machine learning?"

const response = await axios.post(`/api/roles/${roleId}/candidates/evaluate`, {
  question: "What did John Smith say about his experience with machine learning?"
});
```

### Backend Processing
1. Fetches all candidates in "evaluation" column
2. Filters to only those with completed interviews
3. Loads interview data including transcription
4. Passes to evaluation agent with full context

### Agent Response
```
"Based on the interview transcription, John Smith mentioned that he has 3 years of experience with machine learning, specifically working with TensorFlow and PyTorch. He discussed a project where he built a recommendation system for an e-commerce platform, which improved click-through rates by 15%. When asked about his approach to model selection, he explained that he prefers to start with simpler models and iterate based on performance metrics."
```

## Debugging

The agent includes debug logging:
```python
print(f"DEBUG Evaluation Agent - Question: {question}")
print(f"DEBUG Evaluation Agent - Number of candidates: {len(other_candidates)}")
for cand in other_candidates:
    print(f"DEBUG Candidate: Name='{name}', Has Interview: {bool(cand.get('interview'))}")
```

Check backend logs to verify:
- Questions are received correctly
- Candidates are being passed
- Interview data is included

## Limitations

1. **Only Evaluates Completed Interviews**: Candidates must have:
   - `interview_completed: True`, OR
   - Interview transcription/summary exists

2. **Only Evaluation Column**: Only considers candidates in the "evaluation" column

3. **Excludes "Not Pushing Forward"**: Candidates marked as "not pushing forward" are excluded

4. **No Re-Recommendation**: Won't re-recommend candidates already "sent to client"

## Best Practices

1. **Complete Interviews First**: Ensure interviews are marked as completed before asking detailed questions

2. **Use Specific Questions**: 
   - ✅ "What did [Candidate Name] say about [topic]?"
   - ✅ "Compare [Candidate A] and [Candidate B] on [criteria]"
   - ❌ "Tell me about the candidates" (too vague)

3. **Reference Evaluation Criteria**: The agent uses evaluation criteria for scoring, so ensure they're set on the role

4. **Check Transcription Availability**: If asking detailed interview questions, verify the interview has a transcription saved

