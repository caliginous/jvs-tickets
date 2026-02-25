#!/bin/bash

echo "Checking for MUI usage in the codebase..."
echo "=========================================="

# Check for @mui imports
echo "🔍 Searching for @mui/ imports..."
mui_imports=$(grep -r "@mui/" src 2>/dev/null | wc -l)

if [ $mui_imports -gt 0 ]; then
    echo "❌ Found $mui_imports @mui/ imports:"
    grep -r "@mui/" src 2>/dev/null | head -20
    if [ $mui_imports -gt 20 ]; then
        echo "... and $((mui_imports - 20)) more"
    fi
    echo ""
    echo "🚨 MUI usage found - migration not complete!"
    exit 1
else
    echo "✅ No @mui/ imports found"
fi

# Check for @emotion imports
echo ""
echo "🔍 Searching for @emotion/ imports..."
emotion_imports=$(grep -r "@emotion/" src 2>/dev/null | wc -l)

if [ $emotion_imports -gt 0 ]; then
    echo "❌ Found $emotion_imports @emotion/ imports:"
    grep -r "@emotion/" src 2>/dev/null | head -20
    if [ $emotion_imports -gt 20 ]; then
        echo "... and $((emotion_imports - 20)) more"
    fi
    echo ""
    echo "🚨 Emotion usage found - migration not complete!"
    exit 1
else
    echo "✅ No @emotion/ imports found"
fi

# Check for JSS usage
echo ""
echo "🔍 Searching for JSS usage..."
jss_usage=$(grep -r "makeStyles\|@mui/styles" src 2>/dev/null | wc -l)

if [ $jss_usage -gt 0 ]; then
    echo "❌ Found $jss_usage JSS usage:"
    grep -r "makeStyles\|@mui/styles" src 2>/dev/null | head -20
    if [ $jss_usage -gt 20 ]; then
        echo "... and $((jss_usage - 20)) more"
    fi
    echo ""
    echo "🚨 JSS usage found - migration not complete!"
    exit 1
else
    echo "✅ No JSS usage found"
fi

echo ""
echo "🎉 All MUI/Emotion/JSS usage has been migrated!"
echo "✅ Migration to Tailwind + Headless UI is complete!"
exit 0
