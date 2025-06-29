from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    """
    Task creation model.
    """

    name: str = Field(..., description="Name of the task")
    cron: str = Field(..., description="Cron expression for scheduling the task")
    command: str = Field(..., description="Command to be executed by the task")
    args: str = Field("", description="Arguments for the command (optional)")
    kwargs: str = Field("", description="Keyword arguments for the command (optional)")
