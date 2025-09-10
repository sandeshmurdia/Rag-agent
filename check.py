import chromadb
from chromadb.config import Settings

def check_collection(collection_name):
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
        
        # Get all items
        items = collection.get(limit=1000)
        
        # Print collection info
        print(f"Total items: {len(items['ids'])}")
        
        if len(items['ids']) > 0:
            print("\nSample item:")
            print(f"ID: {items['ids'][0]}")
            print(f"Document: {items['documents'][0][:200]}...")  # Show first 200 chars
            print(f"Metadata: {items['metadatas'][0]}")
        else:
            print("\nNo items found in collection!")
            
        # Print all IDs
        print("\nAll IDs:")
        for id in items['ids']:
            print(f"- {id}")
            
    except Exception as e:
        print(f"Error checking collection: {str(e)}")

def main():
    print("ChromaDB Collection Check")
    print("=" * 50)
    
    # Connect to ChromaDB
    client = chromadb.HttpClient(
        host="localhost",
        port=8000,
        settings=Settings(anonymized_telemetry=False)
    )
    
    # List all collections
    collections = client.list_collections()
    print(f"\nFound {len(collections)} collections:")
    for collection in collections:
        print(f"- {collection.name}")
    
    # Check semantic_chunks collection
    check_collection("semantic_chunks")

if __name__ == "__main__":
    main()