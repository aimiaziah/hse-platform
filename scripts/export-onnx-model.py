#!/usr/bin/env python3
"""
Re-export YOLO model to ONNX with compatible opset version.

The issue: Your model was exported with ONNX opset 22, but onnxruntime 1.20.x
only officially supports up to opset 21.

Solution: Re-export the model with opset=21

Usage:
    pip install ultralytics
    python scripts/export-onnx-model.py
"""

import sys
import os
from pathlib import Path

# Fix encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def main():
    try:
        from ultralytics import YOLO
    except ImportError:
        print("[ERROR] ultralytics not installed")
        print("   Run: pip install ultralytics")
        sys.exit(1)

    # Paths
    pt_model_path = Path("models/best.pt")
    onnx_output_path = Path("models/best.onnx")

    if not pt_model_path.exists():
        print(f"[ERROR] PyTorch model not found at {pt_model_path}")
        print("   Please ensure models/best.pt exists")
        sys.exit(1)

    print("=" * 60)
    print("YOLO Model ONNX Export Tool")
    print("=" * 60)
    print(f"Input model:  {pt_model_path}")
    print(f"Output model: {onnx_output_path}")
    print(f"ONNX opset:   21 (compatible with onnxruntime 1.20.x)")
    print("=" * 60)
    print()

    # Load the PyTorch model
    print("[INFO] Loading PyTorch model...")
    model = YOLO(str(pt_model_path))

    # Export to ONNX with opset 21
    print("[INFO] Exporting to ONNX format (opset 21)...")
    model.export(
        format='onnx',
        opset=21,  # Use opset 21 for compatibility
        simplify=True,  # Simplify the model for better performance
        dynamic=False,  # Use static input size
        imgsz=640,  # Standard YOLO input size
    )

    # Check if export was successful
    if onnx_output_path.exists():
        size_mb = onnx_output_path.stat().st_size / (1024 * 1024)
        print()
        print("=" * 60)
        print(f"[SUCCESS] Export successful!")
        print(f"   Output: {onnx_output_path}")
        print(f"   Size:   {size_mb:.2f} MB")
        print("=" * 60)
        print()
        print("Next steps:")
        print("  1. Commit the new model: git add models/best.onnx")
        print("  2. Push to GitHub: git commit -m \"fix: Re-export ONNX model with opset 21\"")
        print("  3. git push")
        print("  4. Wait for DigitalOcean to redeploy")
    else:
        print("[ERROR] Export failed - output file not found")
        sys.exit(1)

if __name__ == "__main__":
    main()
