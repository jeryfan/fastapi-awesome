#!/bin/bash

set -e

source /workspace/.venv/bin/activate

function migrate() {
  echo "start migrate"
  alembic revision --autogenerate -m "update"
  alembic -c /workspace/app/alembic.ini upgrade head
  echo "end migrate"
}

function start_serve() {
  if [[ "${AUTO_MIGRATE}" == "true" ]]; then
    echo "Running migrations"
    migrate
  fi
  while true; do
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
  done
}

function start_worker() {
  while true; do
    celery -A app.celery_app worker --loglevel=info --logfile=- &
    celery -A app.celery_app beat --loglevel=info --logfile=- &

    wait -n
  done
}

case "${SERVICE_ROLE}" in
"server")
  echo "Starting server"
  start_serve &
  ;;
"worker")
  echo "Starting worker"
  start_worker &
  ;;
esac

wait
