FROM python:3.10-slim

WORKDIR /app

# Copy all project files
COPY . .

# No pip install needed - stdlib only

# Expose port (Render provides PORT env var)
EXPOSE 3001

# Run the BFF server (serves API + static files)
CMD ["python3", "bff/server.py"]
