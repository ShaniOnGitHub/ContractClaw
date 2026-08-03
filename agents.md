# ContractClaw - Project Blueprint & Memory

## Project Overview
- **Project Name:** ContractClaw
- **Type:** Streamlit Web Application for AI-Powered Contract Analysis
- **Goal:** Teach LangChain retrievers interactively through a production-grade contract review product.

## Tech Stack
- **Language & Core Framework:** Python 3.11+, Streamlit
- **AI & RAG Framework:** LangChain, ChromaDB (local, zero-config)
- **Models:** OpenAI / GroqCloud API (Free tier compatible, e.g., GPT-4o-mini / Llama-3.3-70b)
- **Embeddings:** OpenAI `text-embedding-3-small` / HuggingFace fallback
- **PDF Parsing:** `pdfplumber` / `PyPDF2`

## File Structure Architecture
```text
contractclaw/
├── agents.md             # Project blueprint, state tracker, and memory file
├── .cursorrules          # IDE & Agent development guidelines
├── CLAUDE.md             # Quick commands & architectural summary
├── .env                  # API keys and environment configuration
├── requirements.txt      # Python dependencies
├── app.py                # Main Streamlit dashboard application
├── config.py             # Global application configuration & paths
├── utils/
│   ├── pdf_parser.py     # PDF text extraction & metadata extraction utilities
│   └── text_splitters.py # Text chunking utilities (Parent/Child splitters)
├── retrievers/
│   ├── base.py           # VectorStore manager & base retriever interfaces
│   ├── similarity.py     # Standard Cosine Similarity Retriever module
│   ├── mmr.py            # Maximal Marginal Relevance (MMR) Retriever module
│   ├── multi_query.py    # Multi-Query Generation Retriever module
│   ├── self_query.py     # Self-Querying Metadata Filtering Retriever module
│   └── parent_doc.py     # Parent Document / Small-to-Big Retriever module
├── ui/
│   └── components.py     # Custom Streamlit UI components & visual cards
└── sample_contracts/     # Sample PDF contracts for testing & demonstration
```

## Key Engineering Decisions
1. **Vector Store:** Local ChromaDB (zero-config, persistent on disk).
2. **LLM Provider:** GroqCloud / OpenAI API integration via standard `.env`.
3. **Parent-Child Chunking Strategy:**
   - **Parent Splitter:** 2,000 characters (preserves full clause context)
   - **Child Splitter:** 400 characters (ensures precise vector similarity match)
4. **Pedagogical Workflow:** Always teach concept & mechanics BEFORE writing code for each module.
5. **Incremental Execution:** Build one module at a time. Wait for explicit user approval before advancing.

## Metadata Schema (For Self-Query & Filtering)
- `contract_type`: `string` (`NDA`, `Employment`, `SOW`, `Service Agreement`, `Other`)
- `upload_date`: `ISO 8601 Date String` (e.g. `YYYY-MM-DD`)
- `filename`: `string`
- `parties`: `string` (Detected entity names / involved parties)

## Module Roadmap & Status Tracker
- [x] **Module 0:** Memory Files Setup (`agents.md`, `.cursorrules`, `CLAUDE.md`)
- [x] **Module 1:** Project Scaffolding & PDF Ingestion Pipeline
- [x] **Module 2:** Standard Similarity Search Retriever (Concepts & Code)
- [x] **Module 3:** Maximal Marginal Relevance (MMR) Retriever (Concepts & Code)
- [ ] **Module 4:** Multi-Query Retriever (Concepts & Code)
- [ ] **Module 5:** Self-Query Retriever with Metadata Filtering (Concepts & Code)
- [ ] **Module 6:** Parent Document Retriever (Small-to-Big Retrieval) (Concepts & Code)
- [ ] **Module 7:** Master Streamlit UI Integration & Interactive Labs
- [ ] **Module 8:** Monetization Hooks, Export Reports & Deployment Readiness

