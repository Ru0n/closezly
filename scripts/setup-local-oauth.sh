#!/bin/bash

# Local OAuth Setup Script for Closezly
echo "🚀 Setting up Local OAuth for Closezly..."

# Check if .env files exist
if [ ! -f ".env" ]; then
    echo "❌ .env file not found in root directory"
    echo "Please create .env file with OAuth credentials"
    exit 1
fi

if [ ! -f "apps/web-portal/.env.local" ]; then
    echo "❌ .env.local file not found in web-portal directory"
    echo "Please create apps/web-portal/.env.local file"
    exit 1
fi

# Check if OAuth credentials are set
if grep -q "your-google-client-id" .env; then
    echo "⚠️  Please update OAuth credentials in .env file"
    echo "Replace placeholder values with actual OAuth app credentials"
    exit 1
fi

echo "✅ Environment files found"

# Stop any existing Supabase instance
echo "🛑 Stopping existing Supabase instance..."
npx supabase stop

# Start Supabase with OAuth configuration
echo "🔄 Starting Supabase with OAuth configuration..."
npx supabase start

# Check if Supabase started successfully
if [ $? -eq 0 ]; then
    echo "✅ Supabase started successfully!"
    echo ""
    echo "🌐 Access points:"
    echo "   - API URL: http://127.0.0.1:54321"
    echo "   - Studio: http://127.0.0.1:54323"
    echo "   - Web Portal: http://localhost:3000 (after npm run dev)"
    echo ""
    echo "📝 Next steps:"
    echo "1. Start web portal: cd apps/web-portal && npm run dev"
    echo "2. Test OAuth at: http://localhost:3000/login"
    echo "3. Monitor users in Studio: http://127.0.0.1:54323"
else
    echo "❌ Failed to start Supabase"
    echo "Check the error messages above"
    exit 1
fi
