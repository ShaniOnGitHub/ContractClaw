# ContractClaw Development Guide

## Project Summary
ContractClaw is an interactive Streamlit application that acts both as a contract analysis tool and an educational laboratory for mastering 5 key LangChain retrieval strategies:
1. Similarity Search Retriever
2. Maximal Marginal Relevance (MMR) Retriever
3. Multi-Query Retriever
4. Self-Query Retriever (Metadata Filtering)
5. Parent Document Retriever (Small-to-Big Retrieval)

## Commands
- Run Streamlit App: `streamlit run app.py`
- Install Dependencies: `pip install -r requirements.txt`

## Core Architecture
- `app.py`: Main Streamlit app entry point.
- `config.py`: Centralized configuration, API key setup, ChromaDB paths.
- `utils/pdf_parser.py`: PDF loading via `pdfplumber`/`PyPDF2` + Metadata extraction.
- `utils/text_splitters.py`: Recursive character splitters (Parent: 2000, Child: 400).
- `retrievers/`: Standardized modules for each LangChain retriever implementation.
- `ui/components.py`: Dynamic visual cards, comparison views, and interactive controls.

## Development Workflow
- Build one module at a time.
- Teach retriever concepts before implementation.
- Maintain persistent ChromaDB collection in `./chroma_db`.
