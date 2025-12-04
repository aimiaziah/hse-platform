#!/bin/bash
# AWS Lambda Deployment Script for Fire Extinguisher AI Detection
# Run this script to package and deploy your model to AWS Lambda

set -e  # Exit on error

echo "========================================"
echo "Fire Extinguisher AI - AWS Lambda Deploy"
echo "========================================"

# Check if best.pt exists
if [ ! -f "best.pt" ]; then
    echo "❌ Error: best.pt not found!"
    echo "Please copy your trained YOLO model (best.pt) to this directory"
    exit 1
fi

echo "✓ Found model file: best.pt"

# Create package directory
echo "Creating package directory..."
rm -rf package
mkdir -p package
cd package

# Install Python dependencies
echo "Installing Python dependencies..."
pip install \
    ultralytics \
    pillow \
    opencv-python-headless \
    -t . \
    --platform manylinux2014_x86_64 \
    --only-binary=:all:

# Copy model and Lambda function
echo "Copying model and function..."
cp ../best.pt .
cp ../lambda_function.py .

# Create deployment package
echo "Creating deployment package..."
zip -r ../fire-extinguisher-ai.zip . -q

cd ..

echo ""
echo "✓ Package created: fire-extinguisher-ai.zip"
echo "  Size: $(du -h fire-extinguisher-ai.zip | cut -f1)"
echo ""
echo "========================================"
echo "Next Steps:"
echo "========================================"
echo ""
echo "1. Create Lambda function in AWS Console:"
echo "   - Runtime: Python 3.9"
echo "   - Memory: 3008 MB (maximum)"
echo "   - Timeout: 60 seconds"
echo "   - Architecture: x86_64"
echo ""
echo "2. Upload the package:"
echo "   - If < 50MB: Upload fire-extinguisher-ai.zip directly"
echo "   - If > 50MB: Upload to S3 first, then link to Lambda"
echo ""
echo "3. Configure Lambda:"
echo "   - Handler: lambda_function.lambda_handler"
echo "   - Environment variables:"
echo "     MODEL_PATH=best.pt"
echo ""
echo "4. Create API Gateway trigger:"
echo "   - Type: HTTP API"
echo "   - CORS: Enabled"
echo "   - Copy the API endpoint URL"
echo ""
echo "5. Update your .env.local:"
echo "   AI_DEPLOYMENT_TYPE=aws"
echo "   AWS_LAMBDA_ENDPOINT=<your-api-gateway-url>"
echo ""
echo "Or use this one-liner to deploy with AWS CLI:"
echo ""
echo "aws lambda create-function \\"
echo "  --function-name fire-extinguisher-ai \\"
echo "  --runtime python3.9 \\"
echo "  --handler lambda_function.lambda_handler \\"
echo "  --memory-size 3008 \\"
echo "  --timeout 60 \\"
echo "  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \\"
echo "  --zip-file fileb://fire-extinguisher-ai.zip"
echo ""
echo "========================================"
