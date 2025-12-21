#!/usr/bin/env python3
"""
Fire Extinguisher AI Detection Server
FastAPI server for YOLO ONNX model inference using onnxruntime

This version uses onnxruntime directly instead of ultralytics to avoid
pulling in PyTorch and CUDA dependencies (~2GB+).

Usage:
    python model_server.py

    Or with custom settings:
    python model_server.py --model models/best.onnx --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import base64
import io
import argparse
import sys
from pathlib import Path
from PIL import Image
import numpy as np
import uvicorn

# Try to import onnxruntime - give helpful error if not installed
try:
    import onnxruntime as ort
    import cv2
except ImportError as e:
    print("❌ Error: Required package not installed!")
    print(f"   Missing: {e.name}")
    print("   Install with: pip install onnxruntime opencv-python-headless pillow numpy")
    sys.exit(1)

# ============================================================================
# CONFIGURATION
# ============================================================================

MODEL_PATH = "models/best.onnx"  # ONNX model for CPU inference
PORT = 8000
HOST = "0.0.0.0"

# YOLO class names (update based on your model)
CLASS_NAMES = {
    0: "shell",
    1: "hose",
    2: "nozzle",
    3: "gauge",
    4: "pin",
    5: "seal",
    6: "tag",
}

# ============================================================================
# DATA MODELS
# ============================================================================

class ImageData(BaseModel):
    stepId: str
    dataUrl: str
    timestamp: int

class DetectionRequest(BaseModel):
    images: List[ImageData]
    extinguisherInfo: Optional[dict] = {}
    minConfidence: Optional[float] = 0.5

class Detection(BaseModel):
    class_name: str
    confidence: float
    bbox: List[float]

class ImageResult(BaseModel):
    stepId: str
    detections: List[Detection]

class DetectionResponse(BaseModel):
    success: bool
    results: List[ImageResult]
    error: Optional[str] = None

# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(
    title="Fire Extinguisher AI Detection API",
    description="YOLO ONNX-based fire extinguisher component detection",
    version="2.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model variables
ort_session = None
input_name = None
input_shape = None

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def load_model(model_path: str):
    """Load ONNX model using onnxruntime"""
    global ort_session, input_name, input_shape

    if not Path(model_path).exists():
        raise FileNotFoundError(
            f"Model file not found: {model_path}\n"
            f"Please ensure your trained ONNX model is in the correct location."
        )

    print(f"📦 Loading ONNX model: {model_path}")

    # Create ONNX runtime session (CPU only)
    ort_session = ort.InferenceSession(
        model_path,
        providers=['CPUExecutionProvider']
    )

    # Get input details
    input_name = ort_session.get_inputs()[0].name
    input_shape = ort_session.get_inputs()[0].shape

    print(f"✅ Model loaded successfully!")
    print(f"   Input name: {input_name}")
    print(f"   Input shape: {input_shape}")
    print(f"   Classes: {list(CLASS_NAMES.values())}")

def decode_base64_image(data_url: str) -> Image.Image:
    """Decode base64 data URL to PIL Image"""
    try:
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
    except Exception as e:
        raise ValueError(f"Failed to decode image: {str(e)}")

def preprocess_image(image: Image.Image, input_shape: tuple) -> np.ndarray:
    """Preprocess image for YOLO ONNX model"""
    # Get target size from model input shape (typically [1, 3, 640, 640])
    target_height = input_shape[2] if len(input_shape) > 2 else 640
    target_width = input_shape[3] if len(input_shape) > 3 else 640

    # Convert PIL to numpy array
    img_array = np.array(image)

    # Resize image
    img_resized = cv2.resize(img_array, (target_width, target_height))

    # Convert BGR to RGB if needed
    if len(img_resized.shape) == 3 and img_resized.shape[2] == 3:
        img_resized = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)

    # Normalize to [0, 1]
    img_normalized = img_resized.astype(np.float32) / 255.0

    # Transpose to [C, H, W]
    img_transposed = np.transpose(img_normalized, (2, 0, 1))

    # Add batch dimension [1, C, H, W]
    img_batch = np.expand_dims(img_transposed, axis=0)

    return img_batch

def postprocess_detections(
    outputs: np.ndarray,
    min_confidence: float,
    img_width: int,
    img_height: int
) -> List[Detection]:
    """Postprocess YOLO ONNX outputs to detection objects"""
    detections = []

    # YOLO output format varies by model version
    # Typically: [1, num_detections, 85] or [1, 85, num_detections]
    # where 85 = x, y, w, h, objectness, 80 class scores

    if len(outputs.shape) == 3:
        # Transpose if needed to get [num_detections, 85]
        if outputs.shape[1] > outputs.shape[2]:
            outputs = np.transpose(outputs[0], (1, 0))
        else:
            outputs = outputs[0]

    # Get model input size for scaling
    model_size = input_shape[2] if input_shape else 640

    for detection in outputs:
        # Extract box coordinates and scores
        x_center, y_center, width, height = detection[:4]
        objectness = detection[4] if len(detection) > 4 else 1.0
        class_scores = detection[5:] if len(detection) > 5 else detection[4:]

        # Get class with highest score
        class_id = int(np.argmax(class_scores))
        class_confidence = float(class_scores[class_id])

        # Combined confidence
        confidence = objectness * class_confidence

        if confidence < min_confidence:
            continue

        # Convert from center format to corner format
        x1 = (x_center - width / 2) * img_width / model_size
        y1 = (y_center - height / 2) * img_height / model_size
        x2 = (x_center + width / 2) * img_width / model_size
        y2 = (y_center + height / 2) * img_height / model_size

        # Clip to image boundaries
        x1 = max(0, min(x1, img_width))
        y1 = max(0, min(y1, img_height))
        x2 = max(0, min(x2, img_width))
        y2 = max(0, min(y2, img_height))

        detections.append(Detection(
            class_name=CLASS_NAMES.get(class_id, f"class_{class_id}"),
            confidence=confidence,
            bbox=[float(x1), float(y1), float(x2), float(y2)]
        ))

    return detections

def run_detection(image: Image.Image, min_confidence: float) -> List[Detection]:
    """Run ONNX inference on image"""
    if ort_session is None:
        raise RuntimeError("Model not loaded")

    # Store original image size
    img_width, img_height = image.size

    # Preprocess image
    input_data = preprocess_image(image, input_shape)

    # Run inference
    outputs = ort_session.run(None, {input_name: input_data})

    # Postprocess outputs
    detections = postprocess_detections(
        outputs[0],
        min_confidence,
        img_width,
        img_height
    )

    return detections

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint - API info"""
    return {
        "message": "Fire Extinguisher AI Detection API",
        "status": "running",
        "model_loaded": ort_session is not None,
        "runtime": "ONNX Runtime (CPU)",
        "endpoints": {
            "health": "/health",
            "detect": "/detect (POST)"
        }
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    if ort_session is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    return {
        "status": "healthy",
        "model_loaded": True,
        "runtime": "ONNX Runtime",
        "model_classes": list(CLASS_NAMES.values())
    }

@app.post("/detect", response_model=DetectionResponse)
async def detect(request: DetectionRequest):
    """
    Main detection endpoint

    Accepts multiple images and returns YOLO detections for each
    """
    try:
        if ort_session is None:
            raise HTTPException(status_code=503, detail="Model not loaded")

        print(f"\n🔍 Processing {len(request.images)} images (confidence: {request.minConfidence})")

        results_list = []

        for idx, img_data in enumerate(request.images, 1):
            try:
                # Decode image
                image = decode_base64_image(img_data.dataUrl)
                print(f"   [{idx}/{len(request.images)}] Processing {img_data.stepId} ({image.size[0]}x{image.size[1]})")

                # Run detection
                detections = run_detection(image, request.minConfidence)

                print(f"      → Found {len(detections)} detection(s)")
                for det in detections:
                    print(f"         - {det.class_name}: {det.confidence:.2%}")

                results_list.append(ImageResult(
                    stepId=img_data.stepId,
                    detections=detections
                ))

            except Exception as img_error:
                print(f"      ❌ Error: {str(img_error)}")
                # Continue processing other images even if one fails
                results_list.append(ImageResult(
                    stepId=img_data.stepId,
                    detections=[]
                ))

        total_detections = sum(len(r.detections) for r in results_list)
        print(f"✅ Complete! Total detections: {total_detections}\n")

        return DetectionResponse(success=True, results=results_list)

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# STARTUP
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    try:
        load_model(MODEL_PATH)
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        print("   Server will start but /detect will fail until model is loaded")

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fire Extinguisher AI Detection Server")
    parser.add_argument(
        "--model",
        type=str,
        default="models/best.onnx",
        help="Path to ONNX model file"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to run server on"
    )
    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="Host to bind to"
    )

    args = parser.parse_args()

    # Update global config
    MODEL_PATH = args.model
    PORT = args.port
    HOST = args.host

    print("=" * 60)
    print("🔥 Fire Extinguisher AI Detection Server (ONNX Runtime)")
    print("=" * 60)
    print(f"Model: {MODEL_PATH}")
    print(f"Server: http://{HOST}:{PORT}")
    print(f"Runtime: ONNX Runtime (CPU-only, no CUDA)")
    print("=" * 60)
    print()

    # Run server
    uvicorn.run(
        app,
        host=HOST,
        port=PORT,
        log_level="info"
    )
