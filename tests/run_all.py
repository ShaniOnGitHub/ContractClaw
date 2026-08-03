import os
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

def run_tests():
    print("=" * 70)
    print("        CONTRACTCLAW — COMPLETE RETRIEVER TEST SUITE")
    print("=" * 70)
    
    from tests.test_ingestion import test_samples
    from tests.test_similarity_retriever import test_similarity_retriever
    from tests.test_mmr_retriever import test_mmr_retriever
    from tests.test_multi_query import test_multi_query
    from tests.test_self_query import test_self_query
    from tests.test_parent_doc import test_parent_doc
    
    test_samples()
    test_similarity_retriever()
    test_mmr_retriever()
    test_multi_query()
    test_self_query()
    test_parent_doc()

    print("\n" + "=" * 70)
    print(" [OK] ALL CONTRACTCLAW RETRIEVER TESTS PASSED 100%!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
