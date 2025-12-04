#!/usr/bin/env python3
"""
Quick test script for your trained YOLO fire extinguisher model.
Run this to verify your model works before deploying!

Usage:
    python test-model.py --model best.pt --image test-extinguisher.jpg
    python test-model.py --model best.onnx --image test-extinguisher.jpg
"""

import argparse
from pathlib import Path
from ultralytics import YOLO
from PIL import Image
import json

def test_model(model_path, image_path, confidence=0.5):
    """Test the YOLO model on a single image."""

    print("=" * 60)
    print("🔥 Fire Extinguisher Detection Test")
    print("=" * 60)

    # Check if model file exists
    if not Path(model_path).exists():
        print(f"❌ Error: Model file not found: {model_path}")
        print(f"   Please provide the path to your best.pt or best.onnx file")
        return False

    # Check if image file exists
    if not Path(image_path).exists():
        print(f"❌ Error: Image file not found: {image_path}")
        print(f"   Please provide a test image of a fire extinguisher")
        return False

    # Load model
    print(f"\n📦 Loading model: {model_path}")
    try:
        model = YOLO(model_path)
        print(f"✅ Model loaded successfully!")
        print(f"   Classes: {list(model.names.values())}")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return False

    # Load and display image info
    print(f"\n📸 Loading image: {image_path}")
    try:
        image = Image.open(image_path)
        print(f"✅ Image loaded successfully!")
        print(f"   Size: {image.size[0]}x{image.size[1]} pixels")
        print(f"   Format: {image.format}")
    except Exception as e:
        print(f"❌ Error loading image: {e}")
        return False

    # Run detection
    print(f"\n🔍 Running detection (confidence threshold: {confidence})...")
    try:
        results = model(image, conf=confidence, verbose=False)
        print("✅ Detection complete!")
    except Exception as e:
        print(f"❌ Error during detection: {e}")
        return False

    # Parse and display results
    print("\n" + "=" * 60)
    print("📊 DETECTION RESULTS")
    print("=" * 60)

    detections = []
    for r in results:
        boxes = r.boxes
        if len(boxes) == 0:
            print("\n⚠️  No objects detected!")
            print("   Tips:")
            print("   - Try lowering the confidence threshold (e.g., --confidence 0.3)")
            print("   - Ensure the image shows a fire extinguisher")
            print("   - Check if your model was trained on similar images")
            return False

        print(f"\n✅ Found {len(boxes)} detection(s):\n")

        for idx, box in enumerate(boxes, 1):
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            xyxy = box.xyxy[0].tolist()
            class_name = model.names[cls]

            detection = {
                'class': class_name,
                'confidence': conf,
                'bbox': xyxy
            }
            detections.append(detection)

            print(f"   {idx}. {class_name}")
            print(f"      Confidence: {conf:.2%}")
            print(f"      Bounding Box: [{xyxy[0]:.1f}, {xyxy[1]:.1f}, {xyxy[2]:.1f}, {xyxy[3]:.1f}]")
            print()

    # Save annotated image
    output_path = Path(image_path).stem + "_annotated.jpg"
    print(f"💾 Saving annotated image: {output_path}")
    try:
        annotated = results[0].plot()
        Image.fromarray(annotated).save(output_path)
        print(f"✅ Saved! Open '{output_path}' to see detections visualized.")
    except Exception as e:
        print(f"⚠️  Could not save annotated image: {e}")

    # Component analysis
    print("\n" + "=" * 60)
    print("🔧 COMPONENT ANALYSIS")
    print("=" * 60)

    components = {}
    for det in detections:
        comp = det['class']
        if comp not in components:
            components[comp] = []
        components[comp].append(det['confidence'])

    expected_components = [
        'shell', 'hose', 'nozzle', 'pressure_gauge',
        'safety_pin', 'pin_seal', 'service_tag',
        'expiry_date_tag', 'mounting_bracket'
    ]

    print("\nComponent Checklist:")
    for comp in expected_components:
        if comp in components:
            avg_conf = sum(components[comp]) / len(components[comp])
            count = len(components[comp])
            status = "✅" if avg_conf > 0.7 else "⚠️ "
            print(f"  {status} {comp}: Detected {count}x (avg conf: {avg_conf:.2%})")
        else:
            print(f"  ❌ {comp}: Not detected")

    if 'obstruction' in components:
        print(f"  ⚠️  obstruction: Detected {len(components['obstruction'])}x (accessibility issue!)")
    else:
        print(f"  ✅ obstruction: None (good accessibility)")

    # Inspection readiness
    print("\n" + "=" * 60)
    print("🎯 INTEGRATION READINESS")
    print("=" * 60)

    detected_count = len([c for c in expected_components if c in components])
    detection_rate = detected_count / len(expected_components)

    print(f"\nDetected {detected_count}/{len(expected_components)} expected components ({detection_rate:.0%})")

    if detection_rate >= 0.7:
        print("\n✅ Model looks good! Ready for integration.")
        print("   Next steps:")
        print("   1. Follow MODEL_INTEGRATION_GUIDE.md")
        print("   2. Deploy your model (Roboflow/AWS/Custom)")
        print("   3. Configure .env.local with your API endpoint")
        print("   4. Test in the web app!")
    elif detection_rate >= 0.5:
        print("\n⚠️  Model is working but could be better.")
        print("   Tips to improve:")
        print("   - Try different images or lighting conditions")
        print("   - Lower confidence threshold (--confidence 0.3)")
        print("   - Collect more training data for missing components")
        print("   - Retrain with more epochs")
    else:
        print("\n⚠️  Low detection rate - model may need improvement.")
        print("   Recommendations:")
        print("   - Verify image quality (clear, well-lit fire extinguisher)")
        print("   - Check if model classes match expected components")
        print("   - Consider retraining with more diverse data")
        print("   - Review training metrics (mAP, precision, recall)")

    # Export detection data as JSON
    json_path = Path(image_path).stem + "_detections.json"
    print(f"\n💾 Exporting detection data: {json_path}")
    try:
        with open(json_path, 'w') as f:
            json.dump({
                'image': str(image_path),
                'model': str(model_path),
                'confidence_threshold': confidence,
                'detections': detections,
                'component_summary': {
                    comp: {
                        'count': len(components.get(comp, [])),
                        'avg_confidence': sum(components.get(comp, [0])) / len(components.get(comp, [1])) if comp in components else 0
                    }
                    for comp in expected_components + ['obstruction']
                }
            }, f, indent=2)
        print(f"✅ Saved! Use this JSON to debug API integration.")
    except Exception as e:
        print(f"⚠️  Could not save JSON: {e}")

    print("\n" + "=" * 60)
    print("🎉 Test Complete!")
    print("=" * 60)

    return True


def main():
    parser = argparse.ArgumentParser(
        description="Test your trained YOLO fire extinguisher detection model"
    )
    parser.add_argument(
        '--model',
        type=str,
        default='best.pt',
        help='Path to model file (best.pt or best.onnx)'
    )
    parser.add_argument(
        '--image',
        type=str,
        required=True,
        help='Path to test image of a fire extinguisher'
    )
    parser.add_argument(
        '--confidence',
        type=float,
        default=0.5,
        help='Confidence threshold (0.0-1.0, default: 0.5)'
    )

    args = parser.parse_args()

    # Run test
    success = test_model(args.model, args.image, args.confidence)

    if not success:
        exit(1)


if __name__ == '__main__':
    main()
