# Pinecone Setup Instructions

## Step 1: Create Pinecone Account

1. Go to [https://www.pinecone.io/](https://www.pinecone.io/)
2. Sign up for a free account
3. Verify your email address

## Step 2: Create Vector Index

1. Log into Pinecone console: [https://app.pinecone.io/](https://app.pinecone.io/)
2. Click "Create Index"
3. Configure the index:
   - **Index Name**: `conversation-history`
   - **Dimensions**: `1024` (matches OpenAI text-embedding-3-small with custom dimensions)
   - **Metric**: `cosine` (recommended for text embeddings)
   - **Cloud Provider**: Choose your preferred provider (AWS/GCP/Azure)
   - **Region**: Choose closest to your Firebase region (us-central1)
   - **Pod Type**: `Starter` (free tier) or `s1` (paid)

4. Click "Create Index"

## Step 3: Get API Key

1. In Pinecone console, go to "API Keys"
2. Copy your API key (starts with `pc-...`)
3. Keep this secure - you'll need it for Firebase configuration

## Step 4: Configure Firebase Secret

### For Local Development:
1. Create `.env` file in `functions/` directory (if not exists):
   ```bash
   cd functions
   touch .env
   ```

2. Add Pinecone API key to `.env`:
   ```
   PINECONE_API_KEY=pc-your-api-key-here
   OPENAI_API_KEY=sk-your-openai-key-here
   LANGSMITH_API_KEY=your-langsmith-key-here
   ```

3. Ensure `.env` is in `.gitignore` (should already be there)

### For Production (Firebase):
1. Add secret to Firebase:
   ```bash
   firebase functions:secrets:set PINECONE_API_KEY
   ```
   
2. When prompted, paste your Pinecone API key

3. Verify secret is set:
   ```bash
   firebase functions:secrets:access PINECONE_API_KEY
   ```

## Step 5: Verify Configuration

Run the test script to verify everything is working:

```bash
cd functions
npm run test:rag
```

This will:
- ✅ Check environment variables
- ✅ Test OpenAI embedding generation
- ✅ Test Pinecone connection
- ✅ Test vector upsert and search
- ✅ Measure latency

## Troubleshooting

### Error: "PINECONE_API_KEY not found"
- Make sure `.env` file exists in `functions/` directory
- Check that the key is correctly formatted (starts with `pc-`)
- For production, ensure secret is set with `firebase functions:secrets:set`

### Error: "Index 'conversation-history' not found"
- Verify index name is exactly `conversation-history`
- Check that index creation completed (can take 1-2 minutes)
- Ensure you're using the correct Pinecone project

### Error: "Dimension mismatch"
- Index must be created with dimension `1024`
- This matches OpenAI's text-embedding-3-small model with custom dimensions
- If wrong, delete and recreate the index

### Slow Performance
- Check Pinecone region matches Firebase region
- Consider upgrading from Starter to s1 pod type
- Reduce `topK` parameter in search queries

## Cost Information

### Pinecone Free Tier:
- 1 index (enough for this project)
- 100,000 vectors
- Starter pod type
- Good for development and small-scale testing

### Estimated Usage (100 users):
- ~3,000 messages/month with embeddings
- ~500 searches/month
- Well within free tier limits

### When to Upgrade:
- More than 100,000 messages
- Need faster query performance
- Multiple indexes required
- Production scale (1000+ users)

## Next Steps

After Pinecone is configured:
1. ✅ Run test script (`npm run test:rag`)
2. ✅ Deploy Cloud Functions (`firebase deploy --only functions`)
3. ✅ Send test messages to generate embeddings
4. ✅ Test RAG-enhanced AI features

## Resources

- [Pinecone Documentation](https://docs.pinecone.io/)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Firebase Secrets Management](https://firebase.google.com/docs/functions/config-env)

