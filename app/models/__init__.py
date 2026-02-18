from app.db.db import Base
from .roles import Role
from .candidates import Candidate
from .interviews import Interview
from .job_descriptions import JobDescription
from .hr_briefings import HRBriefing
from .role_hr_briefings import RoleHRBriefing
from .evaluation_chats import EvaluationChat

__all__ = ["Base", "Role", "Candidate", "Interview", "JobDescription", "HRBriefing", "RoleHRBriefing", "EvaluationChat"]