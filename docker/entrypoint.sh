#!/bin/bash

set -e


source /workspace/.venv/bin/activate
function migrate(){
    echo "start migrate"
    alembic -c /workspace/app/alembic.ini upgrade head
    alembic -c /workspace/app/alembic.ini revision --autogenerate -m "auto update"
    alembic -c /workspace/app/alembic.ini upgrade head
    echo "end migrate"
}

function start_serve(){
    while true; do
        uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    done
}

function start_worker(){
    while true; do
        celery -A app.celery_app worker --loglevel=info --logfile=- &
        celery -A app.celery_app beat --loglevel=info --logfile=- &
    done
}


if [[ "${AUTO_MIGRATE}" == "true" ]]; then
  echo "Running migrations"
  migrate
fi

case "${SERVICE_ROLE}" in
  "server")
    echo "Starting server"
    start_serve &
    ;;
  "worker")
    echo "Starting worker"
    celery -A app.worker worker --loglevel=info
    ;;
esac



wait