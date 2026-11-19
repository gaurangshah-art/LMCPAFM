FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

COPY requirements.txt ./

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY alembic.ini ./
COPY main.py ./
COPY alembic ./alembic
COPY crud ./crud
COPY database ./database
COPY dependencies ./dependencies
COPY models ./models
COPY routers ./routers
COPY schemas ./schemas
COPY scripts ./scripts
COPY utils ./utils
COPY Docs ./Docs
COPY static ./static

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
    CMD ["python", "-c", "import os; from urllib.request import urlopen; p=os.environ.get('PORT','8000'); urlopen(f'http://127.0.0.1:{p}/health/ready').read()"]

RUN chmod +x /app/scripts/docker_entrypoint.sh

CMD ["/app/scripts/docker_entrypoint.sh"]