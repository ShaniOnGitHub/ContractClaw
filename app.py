"""
app.py — Entrypoint for Hugging Face Spaces (Gradio SDK)
Mounts ContractClaw FastAPI server onto Gradio app engine for 100% free hosting.
"""
import os
import gradio as gr
from api import app as fastapi_app

# Create a clean Gradio Blocks interface
with gr.Blocks(title="ContractClaw API Engine") as blocks:
    gr.Markdown("# 🦅 ContractClaw API Server")
    gr.Markdown("Contract intelligence & risk reasoning engine API is running live.")
    gr.Markdown("- **Health Endpoint**: `/api/health`")
    gr.Markdown("- **Auth API**: `/api/v1/auth/login`")
    gr.Markdown("- **Analysis API**: `/api/v1/contracts/analyze`")

# Mount FastAPI application onto Gradio
app = gr.mount_gradio_app(
    app=fastapi_app,
    blocks=blocks,
    path="/"
)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 7860))
    app.launch(server_name="0.0.0.0", server_port=port)
