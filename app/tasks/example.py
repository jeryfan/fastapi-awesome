from app.celery_app import celery_app
import time


@celery_app.task(name="add_task", priority=0)
def add(x, y):
    time.sleep(5)
    return x + y


@celery_app.task(name="subtract_task", priority=9)
def subtract(x, y):
    time.sleep(5)
    return x - y
