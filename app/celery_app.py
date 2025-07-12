from celery import Celery
from app.config import settings

celery_app = Celery(
    "tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.example", "app.schedule.periodic", "app.tasks.task"],
)

celery_app.conf.update(
    task_queues={
        "high_priority": {"exchange": "high_priority", "routing_key": "high_priority"},
        "default": {"exchange": "default", "routing_key": "default"},
        "low_priority": {"exchange": "low_priority", "routing_key": "low_priority"},
    },
    task_default_queue="default",
    task_default_exchange="default",
    task_default_routing_key="default",
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    timezone="Asia/Shanghai",
    enable_utc=False,
)
