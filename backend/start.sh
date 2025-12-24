#!/bin/bash
set -e

# Start the FastAPI server
exec uvicorn server:app --host 0.0.0.0 --port 8001 --reload
