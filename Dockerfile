from ubuntu:22.04


RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates pipx

RUN pipx install uv

COPY ./ /

WORKDIR /

RUN uv sync


CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


