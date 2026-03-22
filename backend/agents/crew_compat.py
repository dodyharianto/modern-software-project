"""CrewAI v1+: Task.execute() was removed; use execute_sync / aexecute_sync and read TaskOutput.raw."""
from __future__ import annotations

import asyncio
from typing import Any


def _patch_crewai_task_execute_alias() -> None:
    """Map legacy Task.execute() -> execute_sync() for CrewAI v1+ (tutorials / stale code)."""
    try:
        import crewai.task as crew_task_mod
        CrewTask = crew_task_mod.Task
    except ImportError:
        return
    if not hasattr(CrewTask, "execute_sync"):
        return

    def execute(self, *args: Any, **kwargs: Any):  # type: ignore[no-untyped-def]
        return self.execute_sync(*args, **kwargs)

    CrewTask.execute = execute  # type: ignore[assignment]


_patch_crewai_task_execute_alias()


async def run_crew_task_async(task: Any) -> Any:
    """Run a standalone CrewAI Task using the sync executor in a worker thread.

    Avoids ``task.aexecute_sync()``: some CrewAI/langchain stacks hit
    ``'Task' object has no attribute 'execute'`` on the async path. The sync
    path (``execute_sync``) stays off the event loop so FastAPI remains responsive.
    """
    return await asyncio.to_thread(task.execute_sync)


def task_output_to_str(output: Any) -> str:
    if output is None:
        return ""
    if isinstance(output, str):
        return output
    raw = getattr(output, "raw", None)
    if raw is not None and str(raw).strip() != "":
        return str(raw)
    return str(output) if output is not None else ""
