# Multi-runtime, non-root worker. Each upstream OSINT tool has its own venv
# to avoid the dependency conflicts between SpiderFoot, theHarvester and newer tools.
FROM ghcr.io/astral-sh/uv:0.8.22 AS uvbin
FROM python:3.12-slim-bookworm AS worker-build

ENV UV_LINK_MODE=copy UV_COMPILE_BYTECODE=1 UV_PYTHON_INSTALL_DIR=/opt/python UV_CACHE_DIR=/opt/uv-cache
COPY --from=uvbin /uv /uvx /usr/local/bin/
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates git build-essential util-linux libffi-dev libssl-dev libxml2-dev libxslt1-dev \
      libpcap-dev libmagic1 libjpeg62-turbo-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/* \
    && uv python install 3.10 3.12 3.13 \
    && mkdir -p /opt/tools /opt/venvs /app /tmp/apex-spiderfoot-home \
    && chmod 0777 /tmp/apex-spiderfoot-home

# SpiderFoot is pinned to upstream packaged release v4.0.
RUN git clone --depth 1 --branch v4.0 https://github.com/smicallef/spiderfoot.git /opt/tools/spiderfoot \
    && uv venv --python 3.10 /opt/venvs/spiderfoot \
    && uv pip install --python /opt/venvs/spiderfoot/bin/python -r /opt/tools/spiderfoot/requirements.txt

# Holehe uses an immutable upstream commit because the repository has no versioned
# release contract. It runs via its Python API, avoiding its updater side channel.
RUN git clone https://github.com/megadose/holehe.git /opt/tools/holehe \
    && git -C /opt/tools/holehe checkout 14da70f588538936b20d238783c5e28a0772a2b3 \
    && uv venv --python 3.12 /opt/venvs/holehe \
    && uv pip install --python /opt/venvs/holehe/bin/python /opt/tools/holehe

RUN uv venv --python 3.12 /opt/venvs/maigret \
    && uv pip install --python /opt/venvs/maigret/bin/python maigret==0.6.6 \
    && uv venv --python 3.12 /opt/venvs/sherlock \
    && uv pip install --python /opt/venvs/sherlock/bin/python sherlock-project==0.16.2

# theHarvester 4.11.1 is installed separately on Python 3.14.
RUN git clone --depth 1 --branch 4.11.1 https://github.com/laramies/theHarvester.git /opt/tools/theharvester \
    && uv venv --python 3.13 /opt/venvs/theharvester \
    && uv pip install --python /opt/venvs/theharvester/bin/python /opt/tools/theharvester

COPY services/apex-python-osint-worker/requirements.txt /app/requirements.txt
RUN uv venv --python /usr/local/bin/python /opt/venvs/worker-api \
    && uv pip install --python /opt/venvs/worker-api/bin/python /app/requirements.txt

COPY services/apex-python-osint-worker/app.py /app/app.py
COPY services/apex-python-osint-worker/tool_runner.py /app/tool_runner.py
WORKDIR /app
ENV PATH=/opt/venvs/worker-api/bin:/usr/bin:/bin PYTHONPATH=/app PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
RUN /opt/venvs/holehe/bin/python -c "import holehe.core, trio, httpx" \
    && /opt/venvs/maigret/bin/maigret --help >/dev/null \
    && /opt/venvs/sherlock/bin/sherlock --help >/dev/null \
    && /opt/venvs/theharvester/bin/theHarvester --help >/dev/null \
    && cd /opt/tools/spiderfoot && /opt/venvs/spiderfoot/bin/python -c "import sf"
EXPOSE 8080
USER 10001:10001
ENTRYPOINT ["/opt/venvs/worker-api/bin/uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1", "--no-access-log"]
