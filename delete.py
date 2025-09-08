import chromadb
client = chromadb.HttpClient(host="localhost", port=8000)
client.delete_collection("semantic_chunks")