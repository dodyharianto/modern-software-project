# AI Agents Summary - Agentic AI Recruiter App

This document provides a comprehensive overview of all AI agents created and used in the application.

## Overview

The application uses **9 specialized AI agents** built with CrewAI framework, each designed for specific recruitment tasks. All agents use OpenAI's GPT-4 model with varying temperature settings optimized for their specific roles.

---

## 1. JD Parser Agent (`jd_parser.py`)

**Role:** JD Parser  
**Purpose:** Extracts structured information from job description PDFs  
**Temperature:** 0.3 (low for accuracy)

### Key Features:
- Parses job description PDFs
- Extracts: job title, summary, responsibilities, requirements, skills, qualifications
- Structures data for use by other agents

### Usage:
- Triggered when uploading a job description PDF on the Role Page
- Output used by: Outreach Writer, Interview Assistant, Evaluation Agent

---

## 2. Candidate Parser Agent (`candidate_parser.py`)

**Role:** Resume Parser  
**Purpose:** Extracts structured information from candidate resume PDFs  
**Temperature:** 0.3 (low for accuracy)

### Key Features:
- Parses candidate resume/CV PDFs
- Extracts: name, summary, skills, experience, parsed insights (years of experience, current role, education, achievements, languages, certifications)
- **Critical:** Extracts candidate's full name (usually from resume header)

### Usage:
- Triggered when uploading a candidate PDF via "Upload Candidate PDF" button
- Creates candidate card in "Outreach" column
- Output used by: Outreach Writer, Interview Assistant, Evaluation Agent

### Special Configuration:
- Streaming disabled to avoid connection issues
- Timeout: 120 seconds
- Max retries: 3

---

## 3. HR Briefing Agent (`hr_briefing_agent.py`)

**Role:** HR Briefing Analyst  
**Purpose:** Transcribes and extracts key details from HR briefing audio  
**Temperature:** 0.3 (low for accuracy)

### Key Features:
- Processes HR briefing audio transcriptions
- Extracts: summary, priorities, constraints, special requirements, budget notes, timeline notes, team dynamics, culture fit notes
- Generates role-specific views when briefings are linked to roles
- Caches role-specific summaries for performance

### Usage:
- Triggered when uploading HR briefing audio on HR Briefings page
- Generates role-specific views when briefing is linked to a role
- Output used by: Interview Assistant, Evaluation Agent

---

## 4. Outreach Writer Agent (`outreach_writer.py`)

**Role:** Outreach Message Writer  
**Purpose:** Generates personalized outreach messages for candidates  
**Temperature:** 0.7 (higher for creativity)

### Key Features:
- Generates personalized, engaging outreach messages
- Uses job description, candidate profile, and role information
- Creates messages tailored to catch candidates' attention
- Highlights relevant opportunities based on candidate skills

### Usage:
- Triggered when clicking "Generate Outreach" button on:
  - Candidate card (in Kanban board)
  - Outreach & Consent page (/outreach-consent)
- Message displayed and can be used to initiate contact
- Helps recruiters personalize initial outreach
- Status tracking: Can mark outreach as "sent" to track communication

---

## 5. Interview Assistant Agent (`interview_assistant.py`)

**Role:** Interview Analyst  
**Purpose:** Provides real-time interview guidance and analyzes interview transcriptions  
**Temperature:** 0.3 (low for accuracy)

### Key Features:
- **Real-time Guidance:** Provides suggested questions during interviews
- **Interview Analysis:** Extracts structured information from interview transcriptions
- **Fit Assessment:** Analyzes candidate fit based on job requirements and evaluation criteria
- **Missing Fields Detection:** Identifies required candidate information not yet collected
- **Question Suggestions:** Provides behavioral probes, technical probes, and follow-up questions
- **Evaluation Summary:** Generates fit score, strengths, concerns, and recommendations

### Usage:
- Used in "Interview Helper" tab on Role Page
- Works with real-time recording or uploaded audio files
- Provides guidance during interviews and analysis after completion
- Uses: Job description, HR briefing, evaluation criteria, candidate profile

---

## 6. Evaluation Agent (`evaluation_agent.py`)

**Role:** Candidate Evaluation Specialist  
**Purpose:** Provides intelligent candidate evaluation through chat interface  
**Temperature:** 0.4 (balanced for analysis)

### Key Features:
- **Comprehensive Evaluation:** Evaluates candidates using multiple data sources
- **Comparison Analysis:** Compares multiple candidates side-by-side
- **Context-Aware:** Only evaluates candidates in "Evaluation" column with completed interviews
- **Uses Multiple Data Sources:**
  - Job description
  - HR briefing (role-specific view)
  - Candidate profiles
  - Interview data (fit scores, strengths, concerns, recommendations)
  - Evaluation criteria
  - Other candidates for comparison

### Usage:
- Used in "Evaluation Chat" tab on Role Page
- Answers questions like:
  - "Who is the best candidate?"
  - "Compare the top 3 candidates"
  - "What are the strengths of [candidate name]?"
- Only includes candidates in Evaluation column with completed interviews
- Provides detailed, actionable insights for final hiring decisions

---

## 7. Email Monitor Agent (`email_monitor.py`)

**Role:** Email Sentiment Analyzer  
**Purpose:** Analyzes candidate email replies for sentiment and intent  
**Temperature:** 0.2 (low for accuracy)

### Key Features:
- Analyzes email content for sentiment (positive, negative, neutral)
- Determines intent (interested, not interested, needs more info)
- Extracts key points from email
- Provides recommended actions

### Usage:
- Used when simulating candidate email replies (both outreach and consent)
- Analyzes outreach replies for sentiment (positive/negative/neutral) and intent (interested/not_interested)
- Candidates who do not express interest can be **marked as negative** (not pushing forward) from the Outreach & Consent page
- Analyzes consent form replies ("I CONSENT" / "I DO NOT CONSENT")
- Helps determine if candidate should move to "Follow-up" column (positive reply) or stay in Outreach
- Used in email simulation workflow on **Outreach & Consent** page (tabs: **Outreach** and **Follow-up** only)
- Reply analysis displayed in "Candidate Reply" section for user confirmation

---

## 8. Simulation Agent (`simulation_agent.py`)

**Role:** Candidate Simulator  
**Purpose:** Simulates candidate replies and generates mock interview audio  
**Temperature:** 0.8 (high for variety and realism)

### Key Features:
- Generates realistic candidate email replies
- Simulates different sentiment types (positive, neutral, negative)
- Creates mock interview conversation scripts
- Generates varied, realistic responses

### Usage:
- Used in email simulation workflow
- Generates candidate replies for testing
- Creates interview simulation scripts for practice
- Used in Simulation page for generating mock interview audio

---

## 9. Recruiter Assistant Agent (`recruiter_assistant.py`)

**Role:** Recruiter Assistant (Chatbot)  
**Purpose:** AI chatbot that helps recruiters understand the app and find information  
**Model:** OpenAI GPT-4 with Function Calling  
**Temperature:** 0.3 (low for accuracy)

### Key Features:
- **Context-Aware:** Understands the application structure and provides specific instructions
- **Function Calling:** Can perform actions like:
  - Get roles and candidates
  - Get pipeline summaries
  - Get dashboard statistics
  - Find candidates and consent forms
  - Get app help and instructions
- **System Updates:** Monitors and notifies about pipeline changes
- **Help System:** Provides detailed step-by-step instructions for app features

### Available Functions:
1. `get_roles` - List/search roles
2. `get_candidates` - Get candidates for a role
3. `get_role_details` - Get detailed role information
4. `create_role` - Create new roles
5. `get_candidate_status` - Get candidate status
6. `get_pipeline_summary` - Get pipeline breakdown (by role_id or role_name)
7. `get_dashboard_stats` - Get overall statistics
8. `send_consent_form` - Find candidates and consent forms
9. `get_app_help` - Get detailed help for app features

### Usage:
- Accessible via floating chat button (bottom-right) on all pages
- Provides guidance on how to use the app
- Answers questions about candidates, roles, and pipeline
- Explains the recruitment flow from start to finish
- Helps find information and navigate the application
- **Context-Aware:** Knows about:
  - Outreach & Consent page (/outreach-consent) for managing outreach and consent
  - Search functionality for finding candidates
  - Candidate reply display and confirmation
  - Updated workflow with outreach generation and tracking

---

## Agent Architecture

### Technology Stack:
- **Framework:** CrewAI
- **LLM:** OpenAI GPT-4
- **Language:** Python
- **Integration:** FastAPI backend

### Temperature Settings:
- **Low (0.2-0.3):** JD Parser, Candidate Parser, HR Briefing, Interview Assistant, Email Monitor, Recruiter Assistant
- **Medium (0.4):** Evaluation Agent
- **High (0.7-0.8):** Outreach Writer, Simulation Agent

### Data Flow:
```
1. JD Parser → Job Description → Used by multiple agents
2. Candidate Parser → Candidate Profile → Used by multiple agents
3. HR Briefing → Role Context → Used by Interview & Evaluation
4. Interview Assistant → Interview Data → Used by Evaluation
5. Evaluation Agent → Final Assessment → Hiring Decision
```

---

## Agent Usage by Feature

### Role Management:
- **JD Parser:** Parse job descriptions
- **HR Briefing Agent:** Process HR briefings and generate role-specific views

### Candidate Management:
- **Candidate Parser:** Parse candidate resumes
- **Outreach Writer:** Generate outreach messages (on cards and Outreach & Consent page)
- **Email Monitor:** Analyze candidate replies (outreach and consent)
  - Sentiment analysis for outreach replies
  - Consent status detection ("I CONSENT" / "I DO NOT CONSENT")
  - Reply display and confirmation on Outreach & Consent page

### Interview Process:
- **Interview Assistant:** Real-time guidance and interview analysis

### Evaluation:
- **Evaluation Agent:** Comprehensive candidate evaluation and comparison

### Simulation & Testing:
- **Simulation Agent:** Generate mock candidate responses and interview scripts

### User Assistance:
- **Recruiter Assistant:** Help users navigate and use the application
  - Context-aware of Outreach & Consent page (/outreach-consent)
  - Knows about search functionality, candidate reply display, and updated workflow

---

## Summary

The application uses **9 specialized AI agents** that work together to automate and enhance the recruitment process:

1. **Data Extraction:** JD Parser, Candidate Parser, HR Briefing Agent
2. **Communication:** Outreach Writer, Email Monitor
3. **Interview Support:** Interview Assistant
4. **Decision Making:** Evaluation Agent
5. **Testing:** Simulation Agent
6. **User Support:** Recruiter Assistant

All agents are built with CrewAI and use GPT-4, with temperature settings optimized for their specific tasks. They work together to provide a comprehensive, AI-powered recruitment solution.

