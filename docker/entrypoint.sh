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


if [[ "${AUTO_MIGRATE}" == "true" ]]; then
  echo "Running migrations"
  migrate
fi


start_serve &

wait