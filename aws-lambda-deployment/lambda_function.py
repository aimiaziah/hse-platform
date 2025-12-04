"""
AWS Lambda Function for Fire Extinguisher Detection
Deploy this with your trained YOLO model

Setup:
1. Package dependencies:
   pip install ultralytics pillow opencv-python-headless -t package/
2. Copy best.pt to package/
3. Copy this file to package/lambda_function.py
4. Zip package/ folder
5. Upload to AWS Lambda (Python 3.9, 3GB memory, 60s timeout)
"""

import json
import base64
import io
import os
from typing import List, Dict, Any
from PIL import Image
from ultralytics import YOLO

# Load model once (outside handler for reuse across invocations)
MODEL_PATH = os.environ.get('MODEL_PATH', 'best.pt')
model = None

def load_model():
    """Load YOLO model (cached across Lambda invocations)"""
    global model
    if model is None:
        print(f"Loading model from {MODEL_PATH}...")
        model = YOLO(MODEL_PATH)
        print("Model loaded successfully")
    return model

def lambda_handler(event, context):
    """
    Lambda handler function

    Expected input:
    {
        "images": [
            {
                "stepId": "overall",
                "dataUrl": "data:image/jpeg;base64,/9j/4AAQ...",
                "timestamp": 1234567890
            }
        ],
        "extinguisherInfo": {
            "serialNo": "FF022018Y002311",
            "location": "Ground Floor",
            "typeSize": "9"
        },
        "minConfidence": 0.5
    }

    Returns:
    {
        "results": [
            {
                "stepId": "overall",
                "detections": [
                    {
                        "class": "shell",
                        "confidence": 0.95,
                        "bbox": [100, 200, 300, 400]
                    }
                ]
            }
        ]
    }
    """

    try:
        # Parse input
        if 'body' in event:
            body = json.loads(event['body'])
        else:
            body = event

        images = body.get('images', [])
        extinguisher_info = body.get('extinguisherInfo', {})
        min_confidence = body.get('minConfidence', 0.5)

        if not images:
            return error_response(400, "No images provided")

        print(f"Processing {len(images)} images for extinguisher {extinguisher_info.get('serialNo')}")

        # Load model
        yolo_model = load_model()

        # Process each image
        results = []

        for img_data in images:
            step_id = img_data.get('stepId', 'unknown')
            data_url = img_data.get('dataUrl', '')

            try:
                # Decode base64 image
                image = decode_image(data_url)

                # Run YOLO inference
                detections = run_inference(yolo_model, image, min_confidence)

                results.append({
                    'stepId': step_id,
                    'detections': detections
                })

                print(f"Processed {step_id}: {len(detections)} detections")

            except Exception as img_error:
                print(f"Error processing image {step_id}: {str(img_error)}")
                results.append({
                    'stepId': step_id,
                    'detections': [],
                    'error': str(img_error)
                })

        # Return results
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'results': results,
                'totalDetections': sum(len(r['detections']) for r in results)
            })
        }

    except Exception as e:
        print(f"Lambda error: {str(e)}")
        return error_response(500, str(e))


def decode_image(data_url: str) -> Image.Image:
    """Decode base64 data URL to PIL Image"""
    # Handle data URL format: "data:image/jpeg;base64,/9j/4AAQ..."
    if ',' in data_url:
        base64_data = data_url.split(',', 1)[1]
    else:
        base64_data = data_url

    # Decode base64
    img_bytes = base64.b64decode(base64_data)

    # Convert to PIL Image
    image = Image.open(io.BytesIO(img_bytes))

    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')

    return image


def run_inference(model: YOLO, image: Image.Image, min_confidence: float) -> List[Dict[str, Any]]:
    """Run YOLO inference on image"""

    # Run prediction
    results = model(image, conf=min_confidence, verbose=False)

    # Parse results
    detections = []

    for result in results:
        boxes = result.boxes

        for box in boxes:
            cls_id = int(box.cls[0])
            confidence = float(box.conf[0])
            bbox = box.xyxy[0].tolist()  # [x1, y1, x2, y2]

            detections.append({
                'class': model.names[cls_id],
                'confidence': confidence,
                'bbox': bbox
            })

    return detections


def error_response(status_code: int, message: str):
    """Return error response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'error': message
        })
    }


# For local testing
if __name__ == '__main__':
    # Test event
    test_event = {
        'images': [
            {
                'stepId': 'test',
                'dataUrl': 'data:image/jpeg;base64,...',  # Add real base64 here
                'timestamp': 1234567890
            }
        ],
        'extinguisherInfo': {
            'serialNo': 'TEST001'
        },
        'minConfidence': 0.5
    }

    result = lambda_handler(test_event, None)
    print(json.dumps(result, indent=2))
