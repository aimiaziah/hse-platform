# Fire Extinguisher YOLO Training - Google Colab Notebook
# Upload this to Google Colab and run all cells

"""
SETUP INSTRUCTIONS:
1. Go to https://colab.research.google.com/
2. Create new notebook
3. Copy this code into cells
4. Runtime > Change runtime type > GPU (T4)
5. Run cells in order
"""

# ============================================================================
# CELL 1: Install Dependencies
# ============================================================================
!pip install ultralytics roboflow pillow

import torch
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"CUDA device: {torch.cuda.get_device_name(0)}")

# ============================================================================
# CELL 2: Mount Google Drive (Optional - to save results)
# ============================================================================
from google.colab import drive
drive.mount('/content/drive')

# Create output directory
import os
os.makedirs('/content/drive/MyDrive/fire_extinguisher_model', exist_ok=True)

# ============================================================================
# CELL 3: Download Dataset from Roboflow
# ============================================================================
"""
If you used Roboflow for labeling:
1. Go to your Roboflow project
2. Click "Generate" > "YOLOv8"
3. Click "Show download code"
4. Copy the code snippet and replace below
"""

from roboflow import Roboflow

# Replace with your actual API key and workspace
rf = Roboflow(api_key="YOUR_ROBOFLOW_API_KEY")
project = rf.workspace("YOUR_WORKSPACE").project("fire-extinguisher-detection")
dataset = project.version(1).download("yolov8")

print(f"Dataset downloaded to: {dataset.location}")

# ============================================================================
# CELL 4: Verify Dataset Structure
# ============================================================================
import os
import glob

dataset_path = dataset.location

# Check structure
print("Dataset structure:")
print(f"Training images: {len(glob.glob(os.path.join(dataset_path, 'train/images/*')))}")
print(f"Validation images: {len(glob.glob(os.path.join(dataset_path, 'valid/images/*')))}")
print(f"Test images: {len(glob.glob(os.path.join(dataset_path, 'test/images/*')))}")

# View a sample image
from IPython.display import Image, display
sample_img = glob.glob(os.path.join(dataset_path, 'train/images/*'))[0]
print(f"\nSample image: {sample_img}")
display(Image(filename=sample_img, width=400))

# ============================================================================
# CELL 5: Start Training
# ============================================================================
from ultralytics import YOLO

# Choose model size:
# yolov8n.pt - Nano (fastest, smallest, less accurate)
# yolov8s.pt - Small (good balance)
# yolov8m.pt - Medium (more accurate, slower)
# yolov8l.pt - Large (most accurate, slowest)

model = YOLO('yolov8s.pt')  # Starting with small model

# Train
results = model.train(
    data=f'{dataset_path}/data.yaml',
    epochs=100,              # Number of training epochs
    imgsz=640,               # Image size
    batch=16,                # Batch size (reduce if out of memory)
    patience=20,             # Early stopping patience
    save=True,
    project='/content/drive/MyDrive/fire_extinguisher_model',
    name='exp1',

    # Data augmentation
    augment=True,
    hsv_h=0.015,
    hsv_s=0.7,
    hsv_v=0.4,
    degrees=10,
    translate=0.1,
    scale=0.5,
    fliplr=0.5,
    mosaic=1.0,
    mixup=0.1,

    # Performance
    workers=2,               # Reduce if memory issues
    device=0,                # Use GPU
    verbose=True,
    plots=True
)

print("\n✓ Training complete!")

# ============================================================================
# CELL 6: Evaluate Model
# ============================================================================
# Evaluate on validation set
metrics = model.val()

print(f"\n{'='*50}")
print(f"MODEL PERFORMANCE METRICS")
print(f"{'='*50}")
print(f"mAP@50:     {metrics.box.map50:.4f}")
print(f"mAP@50-95:  {metrics.box.map:.4f}")
print(f"Precision:  {metrics.box.mp:.4f}")
print(f"Recall:     {metrics.box.mr:.4f}")
print(f"{'='*50}")

# Target metrics:
# mAP@50 > 0.70 (Good)
# mAP@50 > 0.80 (Excellent)

# ============================================================================
# CELL 7: Test on Sample Images
# ============================================================================
import cv2
import matplotlib.pyplot as plt
from PIL import Image

# Get test images
test_images = glob.glob(os.path.join(dataset_path, 'test/images/*'))[:5]

# Run inference
for img_path in test_images:
    results = model(img_path)

    # Visualize
    result = results[0]
    img = result.plot()

    plt.figure(figsize=(12, 8))
    plt.imshow(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    plt.axis('off')
    plt.title(f"Detections: {len(result.boxes)}")
    plt.show()

    # Print detections
    for i, box in enumerate(result.boxes):
        cls = int(box.cls[0])
        conf = float(box.conf[0])
        print(f"  {i+1}. {model.names[cls]}: {conf:.2%}")

# ============================================================================
# CELL 8: Export Model for Deployment
# ============================================================================
# Export to different formats

# 1. ONNX (for cloud deployment - AWS, GCP, Azure)
print("Exporting to ONNX...")
model.export(format='onnx')

# 2. TensorFlow.js (for client-side inference)
print("Exporting to TensorFlow.js...")
model.export(format='tfjs')

# 3. TensorFlow Lite (for mobile apps)
print("Exporting to TFLite...")
model.export(format='tflite')

# 4. CoreML (for iOS)
print("Exporting to CoreML...")
model.export(format='coreml')

print("\n✓ All exports complete!")
print(f"Exported models saved to: /content/drive/MyDrive/fire_extinguisher_model/exp1/")

# ============================================================================
# CELL 9: Download Best Model
# ============================================================================
# Download the best model weights to your local machine

from google.colab import files

best_model_path = '/content/drive/MyDrive/fire_extinguisher_model/exp1/weights/best.pt'
files.download(best_model_path)

print("✓ Model downloaded! Use this file for deployment.")

# ============================================================================
# CELL 10: Generate Deployment Code
# ============================================================================
print("""
✓ TRAINING COMPLETE!

NEXT STEPS:
===========

1. VERIFY PERFORMANCE:
   - Check mAP@50 > 0.70 (if lower, collect more data or train longer)
   - Review predictions on test images above
   - Check confusion matrix in results folder

2. DOWNLOAD MODEL:
   - Download 'best.pt' from the files panel
   - Save to a secure location

3. DEPLOY MODEL:
   Choose one option:

   A) Roboflow Hosted (Easiest):
      - Upload best.pt to Roboflow
      - Use Roboflow API endpoint
      - Update .env: ROBOFLOW_API_KEY=your_key

   B) AWS Lambda:
      - Follow deployment guide in AI_YOLO_IMPLEMENTATION_GUIDE.md
      - Deploy lambda_function.py with best.pt
      - Update .env: AI_API_ENDPOINT=your_lambda_url

   C) Client-Side (Offline):
      - Use the exported TensorFlow.js model
      - Copy to public/models/ in your Next.js app
      - Implement browser-based inference

4. UPDATE YOUR APP:
   - Update src/pages/api/ai/analyze-extinguisher.ts
   - Replace mock detection with real API calls
   - Test with live fire extinguisher photos

5. ITERATE:
   - Collect more images of failure cases
   - Retrain with additional data
   - Adjust confidence thresholds based on real usage

Need help? Check the full guide:
AI_YOLO_IMPLEMENTATION_GUIDE.md
""")

# ============================================================================
# OPTIONAL: Confusion Matrix and Class Performance
# ============================================================================
from IPython.display import Image as IPImage, display

results_path = '/content/drive/MyDrive/fire_extinguisher_model/exp1'

print("\nTraining Results:")
display(IPImage(filename=f'{results_path}/results.png'))

print("\nConfusion Matrix:")
display(IPImage(filename=f'{results_path}/confusion_matrix.png'))

print("\nValidation Predictions:")
display(IPImage(filename=f'{results_path}/val_batch0_pred.jpg'))
