# ContractClaw

[![CI](https://github.com/ShaniOnGitHub/ContractClaw/actions/workflows/ci.yml/badge.svg)](https://github.com/ShaniOnGitHub/ContractClaw/actions/workflows/ci.yml)
[![Live app](https://img.shields.io/badge/try%20the%20live%20app-contractclaw.up.railway.app-111827?logo=railway&logoColor=white)](https://contractclaw.up.railway.app)
[![License](https://img.shields.io/badge/license-MIT-16a34a.svg)](LICENSE)

## Review contracts without the legal fog

**ContractClaw** turns a dense contract PDF into a clear first-pass review. Upload a document, get an easy-to-read risk score, understand the clauses that deserve attention, and see what to consider doing next.

[**Open the live app →**](https://contractclaw.up.railway.app) · [Report a problem](https://github.com/ShaniOnGitHub/ContractClaw/issues)

> ContractClaw is an analysis aid, not a substitute for advice from a qualified lawyer.

## What you can do

| Need | ContractClaw helps you |
|---|---|
| Get oriented quickly | See one overall score and a short summary before reading the details. |
| Understand the important issues | Read plain-English explanations instead of dense technical output. |
| Know what deserves attention | See a direct next step for each flagged clause. |
| Keep your reviews together | Upload contracts and return to them in your private library. |
| Ask better questions | Compare relevant passages and investigate a contract with retrieval tools. |
| Prepare for a conversation | Add private notes, flag concerns, and create proposed redlines. |

## A simpler review flow

```text
Upload a PDF  →  Get a score  →  Understand the key findings  →  Decide what to review next
```

The result is designed for scanning. The score and recommendation come first; deeper explanations, source passages, notes, and redlines are available when you need them.

## Built for useful answers

ContractClaw combines a responsive web interface with a FastAPI service, document extraction, clause retrieval, and risk analysis. It uses a React frontend, Python services, and a retrieval layer backed by ChromaDB. The application is deployed as one Railway service, so the interface and API work from the same public URL.

## Run it locally

```bash
git clone https://github.com/ShaniOnGitHub/ContractClaw.git
cd ContractClaw
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env
```

Build the interface and start the application:

```bash
cd frontend
npm install
npm run build
cd ..
python main.py
```

Then open [http://localhost:8000](http://localhost:8000).

## Check the project

Generate the sample contracts and run the focused retrieval checks:

```bash
python generate_samples.py
pytest -q tests/test_ingestion.py tests/test_similarity_retriever.py tests/test_mmr_retriever.py
```

The complete regression suite is also available:

```bash
pytest -q
```

## Project map

```text
frontend/            User-facing React application
api.py               Application routes and frontend serving
services/            Authentication, analysis, redlines, and review services
retrievers/          Clause and document retrieval strategies
tests/               Regression and feature checks
main.py              Production entry point
generate_samples.py  Sample-contract generator for local checks and CI
railway.json         Railway build and health-check configuration
```

## License

ContractClaw is available under the [MIT License](LICENSE).

## Disclaimer

ContractClaw does not provide legal advice. Always have a qualified legal professional review important agreements before signing or relying on an automated analysis.

---

Made for clearer contract conversations.
