from app.celery_app import celery_app
from celery.schedules import crontab


@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # Executes every Monday morning at 7:30 a.m.
    sender.add_periodic_task(
        crontab(hour=7, minute=30, day_of_week=1),
        print_task.s("Happy Mondays!"),
    )

    # Executes every 10 seconds
    sender.add_periodic_task(10.0, print_task.s("Hello World"))


@celery_app.task
def print_task(text):
    print(text)
