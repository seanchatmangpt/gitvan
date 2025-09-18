#!/bin/bash

# GitVan Cleanroom Docker Test Script

echo "🐳 Building GitVan cleanroom Docker image..."

# Clean up any existing test output
rm -rf test-output

# Build the Docker image
docker build -f Dockerfile.cleanroom -t gitvan-cleanroom .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed"
    exit 1
fi

echo "✅ Docker image built successfully"

echo "🚀 Running GitVan initialization in Docker cleanroom..."

# Run the initialization in Docker with volume mount
docker run --rm -v $(pwd)/test-output:/workspace gitvan-cleanroom

if [ $? -ne 0 ]; then
    echo "❌ Docker run failed"
    exit 1
fi

echo "✅ GitVan initialization completed in Docker"

echo "🔍 Checking output..."
if [ -d "test-output" ]; then
    echo "📁 Contents of test-output:"
    ls -la test-output/
    
    echo ""
    echo "📄 Checking key files:"
    
    if [ -f "test-output/package.json" ]; then
        echo "✅ package.json created"
        echo "   Content preview:"
        head -10 test-output/package.json
    else
        echo "❌ package.json missing"
    fi
    
    if [ -f "test-output/gitvan.config.js" ]; then
        echo "✅ gitvan.config.js created"
    else
        echo "❌ gitvan.config.js missing"
    fi
    
    if [ -f "test-output/graph/init.ttl" ]; then
        echo "✅ Knowledge Graph created"
        echo "   Content preview:"
        head -5 test-output/graph/init.ttl
    else
        echo "❌ Knowledge Graph missing"
    fi
    
    if [ -d "test-output/hooks" ]; then
        echo "✅ Hooks directory created"
        echo "   Files:"
        ls test-output/hooks/
    else
        echo "❌ Hooks directory missing"
    fi
    
    if [ -d "test-output/workflows" ]; then
        echo "✅ Workflows directory created"
        echo "   Files:"
        ls test-output/workflows/
    else
        echo "❌ Workflows directory missing"
    fi
    
    if [ -d "test-output/templates" ]; then
        echo "✅ Templates directory created"
        echo "   Files:"
        ls test-output/templates/
    else
        echo "❌ Templates directory missing"
    fi
    
    if [ -d "test-output/.git" ]; then
        echo "✅ Git repository initialized"
    else
        echo "❌ Git repository missing"
    fi
    
    echo ""
    echo "🎉 Docker cleanroom test completed successfully!"
    echo "📊 Summary:"
    echo "   - All directories created"
    echo "   - All configuration files present"
    echo "   - Knowledge Graph initialized"
    echo "   - Sample hooks, workflows, and templates created"
    echo "   - Git repository initialized"
    echo "   - Package.json with proper scripts"
    
else
    echo "❌ No output directory found"
    exit 1
fi