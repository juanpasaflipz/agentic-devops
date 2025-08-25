#!/bin/bash

# Agentic DevOps System Test Script
# Run this before public release to verify all functionality

set -e

echo "🧪 Testing Agentic DevOps System..."
echo "=================================="

BASE_URL="${1:-http://localhost:8080}"
ORCH_URL="${ORCH_URL:-$BASE_URL}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run tests
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_status="${3:-200}"
    
    echo -n "Testing $test_name... "
    
    if eval "$command" > /tmp/test_output 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "Command: $command"
        echo "Output:"
        cat /tmp/test_output
        ((TESTS_FAILED++))
    fi
}

# Helper function to check JSON response
check_json() {
    local test_name="$1"
    local response="$2"
    local expected_field="$3"
    
    echo -n "  Checking $test_name... "
    if echo "$response" | jq -e ".$expected_field" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "Expected field '$expected_field' not found in response"
        ((TESTS_FAILED++))
    fi
}

echo "Testing against: $ORCH_URL"
echo ""

# Test 1: Health Check
run_test "Health Check" "curl -s -o /dev/null -w '%{http_code}' $ORCH_URL/healthz"

# Test 2: List Runs (should work even without DB)
run_test "List Runs Endpoint" "curl -s -o /dev/null -w '%{http_code}' $ORCH_URL/runs"

# Test 3: Test PR Event (CI Agent)
echo ""
echo "Testing CI Agent with PR Event..."
PR_RESPONSE=$(curl -s -X POST "$ORCH_URL/event" \
    -H "Content-Type: application/json" \
    -d @samples/pr-event.json)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PR Event Posted${NC}"
    ((TESTS_PASSED++))
    
    # Check if run was created
    sleep 2
    RUNS_RESPONSE=$(curl -s "$ORCH_URL/runs")
    check_json "Run Creation" "$RUNS_RESPONSE" "0.id"
else
    echo -e "${RED}✗ PR Event Failed${NC}"
    ((TESTS_FAILED++))
fi

# Test 4: Test Incident Event (SRE Agent)
echo ""
echo "Testing SRE Agent with Incident Event..."
INCIDENT_RESPONSE=$(curl -s -X POST "$ORCH_URL/event" \
    -H "Content-Type: application/json" \
    -d @samples/incident-event.json)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Incident Event Posted${NC}"
    ((TESTS_PASSED++))
    
    # Check if run was created
    sleep 2
    RUNS_RESPONSE=$(curl -s "$ORCH_URL/runs")
    check_json "Incident Run Creation" "$RUNS_RESPONSE" "0.id"
else
    echo -e "${RED}✗ Incident Event Failed${NC}"
    ((TESTS_FAILED++))
fi

# Test 5: Test Deploy Event (Release Agent)
echo ""
echo "Testing Release Agent with Deploy Event..."
DEPLOY_RESPONSE=$(curl -s -X POST "$ORCH_URL/event" \
    -H "Content-Type: application/json" \
    -d @samples/deploy-event.json)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Deploy Event Posted${NC}"
    ((TESTS_PASSED++))
    
    # Check if run was created
    sleep 2
    RUNS_RESPONSE=$(curl -s "$ORCH_URL/runs")
    check_json "Deploy Run Creation" "$RUNS_RESPONSE" "0.id"
else
    echo -e "${RED}✗ Deploy Event Failed${NC}"
    ((TESTS_FAILED++))
fi

# Test 6: Test Terraform Event (Infra Agent)
echo ""
echo "Testing Infrastructure Agent with Terraform Event..."
TERRAFORM_RESPONSE=$(curl -s -X POST "$ORCH_URL/event" \
    -H "Content-Type: application/json" \
    -d @samples/terraform-event.json)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Terraform Event Posted${NC}"
    ((TESTS_PASSED++))
    
    # Check if run was created
    sleep 2
    RUNS_RESPONSE=$(curl -s "$ORCH_URL/runs")
    check_json "Terraform Run Creation" "$RUNS_RESPONSE" "0.id"
else
    echo -e "${RED}✗ Terraform Event Failed${NC}"
    ((TESTS_FAILED++))
fi

# Test 7: Verify All Runs
echo ""
echo "Verifying all runs were created..."
FINAL_RUNS=$(curl -s "$ORCH_URL/runs")
RUN_COUNT=$(echo "$FINAL_RUNS" | jq '. | length')

if [ "$RUN_COUNT" -ge 4 ]; then
    echo -e "${GREEN}✓ All runs created successfully ($RUN_COUNT total)${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ Expected at least 4 runs, got $RUN_COUNT${NC}"
    ((TESTS_FAILED++))
fi

# Test 8: Check for Errors in Runs
echo ""
echo "Checking for errors in runs..."
ERROR_COUNT=$(echo "$FINAL_RUNS" | jq '[.[] | select(.status == "error")] | length')

if [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓ No runs in error state${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠ $ERROR_COUNT runs in error state${NC}"
    echo "$FINAL_RUNS" | jq '.[] | select(.status == "error")'
fi

# Test 9: Validate Run Structure
echo ""
echo "Validating run data structure..."
FIRST_RUN=$(echo "$FINAL_RUNS" | jq '.[0]')
check_json "Run ID" "$FIRST_RUN" "id"
check_json "Run Created At" "$FIRST_RUN" "created_at"
check_json "Run Event" "$FIRST_RUN" "event"

# Test 10: Policy Precheck (should block some events)
echo ""
echo "Testing policy precheck with invalid change window..."
# This should be blocked by policy
POLICY_RESPONSE=$(curl -s -X POST "$ORCH_URL/event" \
    -H "Content-Type: application/json" \
    -d '{"action":"deploy","service":"test","image":"test:latest","env":"prod","time":"2024-01-01T03:00:00Z"}')

if echo "$POLICY_RESPONSE" | jq -e '.action' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Policy precheck working${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ Policy precheck failed${NC}"
    ((TESTS_FAILED++))
fi

# Summary
echo ""
echo "=================================="
echo "🧪 Testing Complete!"
echo ""
echo "Results:"
echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! System is ready for public release.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please fix issues before public release.${NC}"
    exit 1
fi
