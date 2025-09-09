# Agent Zipy - Product Catalog AI Assistant

An AI-powered product catalog assistant that uses ChromaDB for vector search and OpenAI for natural language understanding.

## Prerequisites

- Node.js (v16 or higher)
- Docker (for running ChromaDB)
- OpenAI API key

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agent-zipy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example env file
   cp .env.example .env

   # Edit .env file with your values:
   PORT=3000
   OPENAI_API_KEY=your_openai_api_key_here
   CHROMA_URL=http://localhost:8000
   CHROMA_COLLECTION=users_embeddings
   EMBEDDING_MODEL=text-embedding-ada-002
   OPENAI_CHAT_MODEL=gpt-4o-mini
   ```

4. **Start ChromaDB**
   ```bash
   # Pull and run ChromaDB container
   docker pull chromadb/chroma
   docker run -p 8000:8000 chromadb/chroma
   ```

## Running the Application

1. **Ingest Product Data**
   ```bash
   # Ingest sample product data
   npm run ingest-optimized ./sample.json
   ```

2. **Start the Server**
   ```bash
   # Start in development mode
   npm run dev
   ```

## Testing the API

1. **Using the Test Script**
   ```bash
   # Run the automated test script
   node test.js
   ```

2. **Using cURL**
   ```bash
   # Create a new chat session
   curl -X POST http://localhost:3000/api/chat/session

   # Send a message (replace SESSION_ID with the ID from previous response)
   curl -X POST http://localhost:3000/api/chat/SESSION_ID \
   -H "Content-Type: application/json" \
   -d '{"message": "Show me laptops under $1500"}'

   # Get chat history
   curl -X GET http://localhost:3000/api/chat/SESSION_ID/history
   ```

## API Endpoints

- `POST /api/chat/session` - Create a new chat session
- `POST /api/chat/:sessionId` - Send a message in a session
- `GET /api/chat/:sessionId/history` - Get chat history for a session

## Example Queries

- "What laptops are available?"
- "Show me products under $100"
- "Compare gaming accessories"
- "Tell me about kitchen appliances"
- "Find products with specific features"

## Project Structure

```
agent-zipy/
├── src/
│   ├── services/
│   │   ├── agent.ts    # AI agent service
│   │   └── memory.ts   # Chat session management
│   ├── chroma.ts       # ChromaDB integration
│   ├── config.ts       # Configuration management
│   ├── embeddings.ts   # Vector embeddings
│   ├── index.ts        # Main server
│   └── types/          # TypeScript types
├── test.js            # API test script
└── sample.json        # Sample product data
```

## Error Handling

The system includes comprehensive error handling:
- Invalid queries are rejected with appropriate messages
- ChromaDB connection issues are handled gracefully
- OpenAI API errors are caught and reported
- Session management errors are properly handled

## Development

To modify the system:
1. Update product data in `sample.json`
2. Modify AI prompts in `agent.ts`
3. Adjust embedding settings in `config.ts`
4. Update ChromaDB configuration as needed

## Troubleshooting

1. **ChromaDB Connection Issues**
   - Ensure Docker is running
   - Check if ChromaDB container is up
   - Verify CHROMA_URL in .env

2. **OpenAI API Issues**
   - Verify API key in .env
   - Check API rate limits
   - Ensure proper model names

3. **Data Ingestion Issues**
   - Check JSON format
   - Verify file paths
   - Monitor ChromaDB logs