FROM ubuntu:22.04


RUN apt-get update && apt-get install -y --no-install-recommends curl wget gcc libpq-dev build-essential ca-certificates pipx && \
    pipx ensurepath

RUN pipx install uv
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /workspace

COPY pyproject.toml uv.lock ./
COPY app/ ./app/

RUN uv sync
ENV PYTHON=/workspace/.venv/bin/python3

COPY docker/entrypoint.sh ./
RUN chmod +x ./entrypoint*.sh
ENTRYPOINT ["./entrypoint.sh"]


