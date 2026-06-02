#!/bin/bash

# Verification script for HRMIS application

echo "==================================="
echo "HRMIS Verification Script"
echo "==================================="
echo ""

# Check Node.js version
echo "1. Checking Node.js version..."
node --version
echo ""

# Check if dependencies are installed
echo "2. Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "✓ node_modules found"
else
    echo "✗ node_modules not found - run: npm install"
fi
echo ""

# Check key files exist
echo "3. Checking key files..."
files=(
    "package.json"
    "tsconfig.json"
    "tailwind.config.ts"
    "app/layout.tsx"
    "app/page.tsx"
    "lib/types.ts"
    "lib/storage.ts"
    "hooks/useEmployees.ts"
    "components/Navigation.tsx"
    "app/api/employees/route.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file"
    else
        echo "✗ $file missing"
    fi
done
echo ""

# Count total files
echo "4. File count summary..."
echo "Total TypeScript/TSX files: $(find . -name '*.ts' -o -name '*.tsx' | grep -v node_modules | wc -l)"
echo "Components: $(find components -name '*.tsx' 2>/dev/null | wc -l)"
echo "Pages: $(find app -name 'page.tsx' 2>/dev/null | wc -l)"
echo "API routes: $(find app/api -name 'route.ts' 2>/dev/null | wc -l)"
echo ""

echo "5. Ready to start development server?"
echo "Run: npm run dev"
echo ""
echo "==================================="
echo "Verification Complete"
echo "==================================="
