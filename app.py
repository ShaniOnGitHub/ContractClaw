"""
app.py — Entrypoint for Hugging Face Spaces (Gradio / Python SDK)
Executes FastAPI backend server on port 7860 for 100% free hosting.
"""
import os
import uvicorn
from api import app

if __name__ == "__main__":
    port = int(os.getenv("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
