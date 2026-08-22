# Contributing to ContractClaw

Thank you for helping make contract review clearer and more approachable.

## Before you start

ContractClaw is a working contract-review application. Please open an issue before making a large change so the scope and user benefit are clear. Do not commit real contracts, credentials, API keys, database files, or other private information.

## Local checks

Create a virtual environment, install the Python dependencies, and build the interface before opening a pull request:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cd frontend
npm install
npm run build
cd ..

python generate_samples.py
pytest -q
```

## Good contributions

Useful contributions improve the clarity, reliability, accessibility, or safety of contract review. Changes should preserve the existing upload, analysis, library, comparison, playbook, account, and settings flows unless the change explicitly addresses one of them.

For analysis changes, prefer plain language and an obvious next step. For interface changes, check both a desktop-width and narrow mobile viewport. For backend changes, add or update a focused regression test.

## Pull requests

Describe the user problem, explain the change in plain English, and include the checks you ran. Keep pull requests focused; separate unrelated cleanup or visual changes into separate pull requests. Do not include generated databases, local uploads, or build caches.

## Reporting a problem

Please include the page or action where the problem occurred, the expected behavior, the observed behavior, and the smallest reproducible steps. Remove private contract content and personal information before sharing screenshots or logs.

## Important notice

ContractClaw is an analysis aid and does not provide legal advice. Contributions must not describe automated output as a substitute for qualified legal review.
