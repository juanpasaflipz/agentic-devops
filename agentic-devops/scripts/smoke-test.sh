#!/bin/bash

# Quick smoke test for Agentic DevOps
# Use this for fast validation during development

set -e

echo "🚀 Quick Smoke Test for Agentic DevOps"
echo "======================================"

BASE_URL="${1:-http://localhost:8080}"

# Test health endpoint
echo "Testing health endpoint..."
if curl -s -f "$BASE_URL/healthz" > /dev/null; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi

# Test runs endpoint
echo "Testing runs endpoint..."
if curl -s -f "$BASE_URL/runs" > /dev/null; then
    echo "✅ Runs endpoint working"
else
    echo "❌ Runs endpoint failed"
    exit 1
fi

# Test a simple event
echo "Testing event processing..."
RESPONSE=$(curl -s -X POST "$BASE_URL/event" \
    -H "Content-Type: application/json" \
    -d '{"action":"test","service":"smoke-test"}')

if [ $? -eq 0 ]; then
    echo "✅ Event processing working"
else
    echo "❌ Event processing failed"
    exit 1
fi

echo ""
echo "🎉 Smoke test passed! Basic functionality is working."
echo "Run 'make test' for comprehensive testing."
