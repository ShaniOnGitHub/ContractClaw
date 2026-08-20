# Optional container image for the ContractClaw FastAPI service
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for PDF parsing and C++ extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies list
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Generate sample contracts on container build
RUN python generate_samples.py

# Default container port; Railway supplies its own PORT at runtime
EXPOSE 7860

# Run the FastAPI service on the container port
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "7860"]
