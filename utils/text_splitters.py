from langchain_text_splitters import RecursiveCharacterTextSplitter

def get_basic_text_splitter(chunk_size: int = 1000, chunk_overlap: int = 200) -> RecursiveCharacterTextSplitter:
    """
    Returns a standard RecursiveCharacterTextSplitter.
    Used for baseline chunking in similarity search, MMR, Multi-Query, and Self-Query.
    """
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""]
    )


def get_parent_child_splitters(
    parent_chunk_size: int = 2000,
    parent_chunk_overlap: int = 400,
    child_chunk_size: int = 400,
    child_chunk_overlap: int = 50
) -> tuple[RecursiveCharacterTextSplitter, RecursiveCharacterTextSplitter]:
    """
    Returns a tuple of (parent_splitter, child_splitter).
    - Parent Splitter: 2000 chars (preserves full legal section context)
    - Child Splitter: 400 chars (ensures precise vector similarity matching)
    """
    parent_splitter = RecursiveCharacterTextSplitter(
        chunk_size=parent_chunk_size,
        chunk_overlap=parent_chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    
    child_splitter = RecursiveCharacterTextSplitter(
        chunk_size=child_chunk_size,
        chunk_overlap=child_chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    
    return parent_splitter, child_splitter
