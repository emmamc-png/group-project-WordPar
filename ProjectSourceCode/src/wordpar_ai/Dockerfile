# Use slim Python image
FROM python:3.10-slim

# Set working directory inside container
WORKDIR /app

# Install system packages for building Python packages
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the AI service code
COPY . .

# Expose the Flask port
EXPOSE 5000

# Run the Flask app
CMD ["python", "ai_service.py"]
