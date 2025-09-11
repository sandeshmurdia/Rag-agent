import chromadb
from chromadb.config import Settings
from typing import Optional, Dict, List, Any, Union
import numpy as np

def print_item_details(items: Dict[str, List[Any]], index: int) -> None:
    """Print details of a specific item safely"""
    print(f"\nItem {index + 1}:")
    print(f"ID: {items['ids'][index]}")
    
    # Safely print embeddings if they exist
    if 'embeddings' in items and items['embeddings'] is not None:
        embedding = items['embeddings'][index]
        if isinstance(embedding, (list, np.ndarray)) and len(embedding) > 0:
            # Convert to list if it's a numpy array
            embedding_list = embedding.tolist() if hasattr(embedding, 'tolist') else embedding
            print(f"Embedding: First 5 dimensions: {embedding_list[:5]}...")
            print(f"Embedding dimensions: {len(embedding_list)}")
        else:
            print("Embedding: None")
    else:
        print("Embeddings: Not available")

    # Safely print document
    if 'documents' in items and items['documents'] is not None:
        doc = items['documents'][index]
        if doc:
            print(f"Document preview: {doc[:200]}...")
        else:
            print("Document: None")
    else:
        print("Documents: Not available")

    # Safely print metadata
    if 'metadatas' in items and items['metadatas'] is not None:
        metadata = items['metadatas'][index]
        if metadata:
            print("Metadata:")
            for key, value in metadata.items():
                print(f"  {key}: {value}")
        else:
            print("Metadata: None")
    else:
        print("Metadata: Not available")

def get_chunk_by_id(collection_name: str, chunk_id: str) -> None:
    print(f"\nLooking for chunk: {chunk_id}")
    print("-" * 50)
    
    try:
        # Connect to ChromaDB
        client = chromadb.HttpClient(
            host="localhost",
            port=8000,
            settings=Settings(anonymized_telemetry=False)
        )

        # Get collection
        collection = client.get_collection(name=collection_name)
        
        # Get specific chunk with all data
        try:
            chunk_info = collection.get(
                ids=[chunk_id],
                include=['embeddings', 'documents', 'metadatas']
            )

            if not chunk_info or not chunk_info['ids'] or len(chunk_info['ids']) == 0:
                print(f"Error: Chunk with ID '{chunk_id}' not found")
                return

            # Print raw chunk data
            print("\nRaw Chunk Data:")
            print("==============")
            print("\nIDs:")
            print(chunk_info['ids'])
            
            print("\nDocuments:")
            print(chunk_info['documents'])
            
            print("\nMetadata:")
            print(chunk_info['metadatas'])
            
            if 'embeddings' in chunk_info and chunk_info['embeddings']:
                print("\nEmbeddings:")
                print(chunk_info['embeddings'])
            
        except Exception as e:
            print(f"Error retrieving chunk data: {str(e)}")
            print("Full chunk ID for reference:", chunk_id)

    except Exception as e:
        print(f"Error getting chunk: {str(e)}")

def check_collection(collection_name: str) -> None:
    print(f"\nChecking collection: {collection_name}")
    print("-" * 50)
    
    try:
        # Connect to ChromaDB
        client = chromadb.HttpClient(
            host="localhost",
            port=8000,
            settings=Settings(anonymized_telemetry=False)
        )

        # Get collection
        collection = client.get_collection(name=collection_name)
        
        # Get collection info
        collection_info = collection.get(limit=1000)
        if not collection_info or 'ids' not in collection_info:
            print("Error: Could not retrieve collection data")
            return

        total_items = len(collection_info['ids'])
        print(f"Total items: {total_items}")
        
        if total_items > 0:
            # Print details of first item
            print_item_details(collection_info, 0)
            
            # Print summary of all items
            print("\nAll items summary:")
            for i in range(total_items):
                id = collection_info['ids'][i]
                has_embedding = 'embeddings' in collection_info and collection_info['embeddings'] is not None and collection_info['embeddings'][i] is not None
                has_metadata = 'metadatas' in collection_info and collection_info['metadatas'] is not None and collection_info['metadatas'][i] is not None
                
                print(f"- ID: {id}")
                print(f"  Has embedding: {'✓' if has_embedding else '✗'}")
                print(f"  Has metadata: {'✓' if has_metadata else '✗'}")
        else:
            print("\nNo items found in collection!")
            
    except Exception as e:
        print(f"Error checking collection: {str(e)}")

def main():
    # Get specific chunk
    chunk_id = "645eabbe-a14a-4abf-b325-d4fab862996b-1756305381_chunk_12_1756305468850_1756305471583"
    get_chunk_by_id("semantic_chunks", chunk_id)

if __name__ == "__main__":
    main()