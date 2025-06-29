from fastapi import APIRouter, Depends, HTTPException


router = APIRouter(prefix="/task", tags=["task"])


@router.post("/")
async def create_task(task: dict):
    """
    Create a new task.
    """
    # Here you would typically add logic to save the task to a database
    return {"message": "Task created successfully", "task": task}
