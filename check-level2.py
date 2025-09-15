import chromadb
from chromadb.config import Settings
from typing import Optional, Dict, List, Any, Union
import json

def print_chunk_details(chunk_info: Dict[str, Any]) -> None:
    """Print details of a level 2 chunk"""
    if not chunk_info or not chunk_info['ids']:
        print("No chunk found")
        return

    print("\nChunk Details:")
    print("=============")
    
    # Print ID
    print(f"\nID: {chunk_info['ids'][0]}")
    
    # Print Metadata
    if chunk_info.get('metadatas'):
        print("\nMetadata:")
        for key, value in chunk_info['metadatas'][0].items():
            print(f"  {key}: {value}")
    
    # Print Document
    if chunk_info.get('documents'):
        print("\nDocument:")
        print("---------")
        print(chunk_info['documents'][0])

def main():
    try:
        # Connect to ChromaDB
        client = chromadb.HttpClient(
            host="localhost",
            port=8000,
            settings=Settings(anonymized_telemetry=False)
        )

        # Get collection
        collection = client.get_collection(name="level_2_chunks")
        
        # Get first chunk
        chunk = collection.get(
            limit=1,
            include=['metadatas', 'documents']
        )
        
        print_chunk_details(chunk)
            
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()
