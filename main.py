"""
main.py — Portable entry point for the ContractClaw FastAPI server.

Why this file exists:
  Some deployment platforms (notably Railway, and some shell configurations)
  pass the start command through a shell that does NOT expand $PORT, or the
  command is stored as a literal string. Using `uvicorn ... --port $PORT`
  then crashes with:
      Error: Invalid value for '--port': '$PORT' is not a valid integer.

  This entry point reads PORT itself (Railway, Render, fly.io, Docker, local)
  and always supplies a valid integer to uvicorn, so the server starts on
  every platform without shell variable-expansion hacks.

Usage:
  python main.py            # uses $PORT if set, else 8000
  PORT=9000 python main.py  # explicit override
"""

import os
import uvicorn

PORT = int(os.environ.get("PORT", "8000"))

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=PORT)
