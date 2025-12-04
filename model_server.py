#!/usr/bin/env python3
"""
Fire Extinguisher AI Detection Server
Local FastAPI server for YOLO model inference

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
import uvicorn

# Try to import YOLO - give helpful error if not installed
try:
    from ultralytics import YOLO
except ImportError:
    print("❌ Error: ultralytics not installed!")
    print("   Install with: pip install ultralytics pillow")
    sys.exit(1)

# ============================================================================
# CONFIGURATION
# ============================================================================

MODEL_PATH = "models/best.onnx"  # Default to ONNX for speed
PORT = 8000
HOST = "0.0.0.0"

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
    class_name: str  # Using class_name to avoid Python keyword
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
    description="YOLO-based fire extinguisher component detection",
    version="1.0.0"
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model variable
model = None

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def load_model(model_path: str):
    """Load YOLO model"""
    global model

    if not Path(model_path).exists():
        raise FileNotFoundError(
            f"Model file not found: {model_path}\n"
            f"Please ensure your trained model is in the correct location."
        )

    print(f"📦 Loading model: {model_path}")
    model = YOLO(model_path)
    print(f"✅ Model loaded successfully!")
    print(f"   Classes: {list(model.names.values())}")

    return model

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

def run_detection(image: Image.Image, min_confidence: float) -> List[Detection]:
    """Run YOLO detection on image"""
    if model is None:
        raise RuntimeError("Model not loaded")

    # Run inference
    results = model(image, conf=min_confidence, verbose=False)

    # Parse detections
    detections = []
    for result in results:
        boxes = result.boxes
        for box in boxes:
            cls_id = int(box.cls[0])
            confidence = float(box.conf[0])
            bbox = box.xyxy[0].tolist()  # [x1, y1, x2, y2]

            detections.append(Detection(
                class_name=model.names[cls_id],
                confidence=confidence,
                bbox=bbox
            ))

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
        "model_loaded": model is not None,
        "endpoints": {
            "health": "/health",
            "detect": "/detect (POST)"
        }
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    return {
        "status": "healthy",
        "model_loaded": True,
        "model_classes": list(model.names.values()) if model else []
    }

@app.post("/detect", response_model=DetectionResponse)
async def detect(request: DetectionRequest):
    """
    Main detection endpoint

    Accepts multiple images and returns YOLO detections for each
    """
    try:
        if model is None:
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
        help="Path to model file (best.pt or best.onnx)"
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
    print("🔥 Fire Extinguisher AI Detection Server")
    print("=" * 60)
    print(f"Model: {MODEL_PATH}")
    print(f"Server: http://{HOST}:{PORT}")
    print("=" * 60)
    print()

    # Run server
    uvicorn.run(
        app,
        host=HOST,
        port=PORT,
        log_level="info"
    )
