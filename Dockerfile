FROM ubuntu:22.04


RUN apt-get update && apt-get install -y --no-install-recommends curl wget gcc libpq-dev build-essential ca-certificates pipx && \
    pipx ensurepath

RUN pipx install uv
ENV PATH="/root/.local/bin:$PATH"
COPY ./ /

WORKDIR /

RUN uv sync


CMD ["/.venv/bin/python","-m","uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


