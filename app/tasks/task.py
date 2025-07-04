from app import crud
from app.celery_app import celery_app
import time
import asyncio
from app.models.db import get_db
from app.models.task import TaskStatus


async def task_execute(task_id, file_id):

    async with get_db() as db:

        task = await crud.task.get(db, filters={"task_id": task_id})
        await crud.task.update(db, task, {"status": TaskStatus.PROGRESS})
        time.sleep(5)
        file = await crud.file.get(db, filters={"id": file_id})
        print(f"Processing file: {file.name}")

        await crud.task.update(db, task, {"status": TaskStatus.SUCCESS})


@celery_app.task(bind=True)
def task_create(self, file_id):
    task_id = self.request.id

    asyncio.run(task_execute(task_id, file_id))
