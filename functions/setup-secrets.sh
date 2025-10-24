#!/bin/bash

# Firebase Functions Secrets Setup Script
# This script helps set up secrets for Firebase Functions v2

echo "🔧 Setting up Firebase Functions secrets..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please run:"
    echo "   firebase login"
    exit 1
fi

echo "✅ Firebase CLI is ready"

# Function to set a secret
set_secret() {
    local secret_name=$1
    local secret_value=$2
    
    if [ -z "$secret_value" ]; then
        echo "⚠️  Skipping $secret_name (no value provided)"
        return
    fi
    
    echo "🔐 Setting secret: $secret_name"
    if firebase functions:secrets:set "$secret_name" --data-file <(echo -n "$secret_value"); then
        echo "✅ Secret $secret_name set successfully"
    else
        echo "❌ Failed to set secret $secret_name"
    fi
}

# Read secrets from .env file if it exists
if [ -f ".env" ]; then
    echo "📄 Reading secrets from .env file..."
    
    # Source the .env file
    set -a
    source .env
    set +a
    
    # Set secrets
    set_secret "OPENAI_API_KEY" "$OPENAI_API_KEY"
    set_secret "LANGSMITH_API_KEY" "$LANGSMITH_API_KEY"
    set_secret "PINECONE_API_KEY" "$PINECONE_API_KEY"
else
    echo "⚠️  No .env file found. Please provide secrets manually:"
    echo ""
    echo "To set secrets manually, run:"
    echo "  firebase functions:secrets:set OPENAI_API_KEY"
    echo "  firebase functions:secrets:set LANGSMITH_API_KEY"
    echo "  firebase functions:secrets:set PINECONE_API_KEY"
    echo ""
    echo "Or create a .env file with your secrets:"
    echo "  OPENAI_API_KEY=your_openai_key_here"
    echo "  LANGSMITH_API_KEY=your_langsmith_key_here"
    echo "  PINECONE_API_KEY=your_pinecone_key_here"
fi

echo ""
echo "🚀 Next steps:"
echo "1. Deploy your functions: firebase deploy --only functions"
echo "2. Test your AI commands"
echo ""
echo "📚 For more info, see: https://firebase.google.com/docs/functions/config-env"
