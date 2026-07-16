# Use official uv image to copy binary
FROM ghcr.io/astral-sh/uv:latest AS uv_setup

# Base Python build
FROM python:3.13-slim

WORKDIR /app

# Set env configurations
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_SYSTEM_PYTHON=1

# Copy uv binaries
COPY --from=uv_setup /uv /uvx /bin/

# Copy dependencies metadata
COPY pyproject.toml uv.lock ./

# Install python dependencies ignoring strict python version constraint if base is 3.13
RUN uv pip install --system --ignore-requires-python -r pyproject.toml

# Copy project files
COPY . .

# Expose backend API port
EXPOSE 8000

CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
