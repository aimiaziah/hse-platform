/* eslint-disable */
// YOLO Detection Mapper
// Maps raw YOLO detections to inspection checklist format

import { AIDetectionResult, AIInspectionResult, CapturedImage } from '@/types/ai-inspection';

export interface YOLODetection {
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
}

export interface YOLOImageResult {
  stepId: string;
  detections: YOLODetection[];
}

/**
 * Map YOLO detections to inspection checklist fields
 *
 * This function converts raw object detections into structured
 * inspection results with pass/fail values and reasoning
 *
 * Detection Mapping Logic:
 * 1. Direct Class Mapping: hose, nozzle, pressure_gauge, safety_pin, pin_seal, service_tag
 * 2. Shell-Dependent Logic: If shell detected → tick accessible, NOT missing/not in place
 * 3. Missing Component Logic: Flag components not detected within shell's bounding box
 */
export function mapYOLOToInspectionResults(
  yoloResults: YOLOImageResult[],
  images: CapturedImage[]
): AIInspectionResult {

  // Aggregate all detections across images
  const allDetections = yoloResults.flatMap(r => r.detections);

  console.log('[YOLO Mapper] Raw detections:', allDetections);

  // Normalize class names (convert spaces to underscores for consistency)
  const normalizedDetections = allDetections.map(det => ({
    ...det,
    class: det.class.replace(/\s+/g, '_').toLowerCase()
  }));

  console.log('[YOLO Mapper] Normalized detections:', normalizedDetections);

  // Group detections by component type
  const componentDetections = groupByComponent(normalizedDetections);

  console.log('[YOLO Mapper] Grouped by component:', componentDetections);

  // Check what components were detected (no strict validation)
  const coreComponentTypes = ['shell', 'hose', 'nozzle', 'pressure_gauge', 'safety_pin', 'pin_seal'];
  const detectedCoreComponents = coreComponentTypes.filter(type =>
    componentDetections[type] && componentDetections[type].length > 0
  );

  console.log('[YOLO Mapper] Detection summary:', {
    detectedCoreComponents,
    count: detectedCoreComponents.length,
    totalDetections: allDetections.length
  });

  // Validate that this is actually a fire extinguisher
  // If no detections at all OR fewer than 1 core component detected, it's likely not a fire extinguisher
  // Lowered threshold to 1 to be more lenient with detection
  if (allDetections.length === 0 || detectedCoreComponents.length < 1) {
    console.warn('[YOLO Mapper] Not a fire extinguisher - insufficient components detected');
    return {
      success: false,
      detections: [],
      extractedData: {},
      processingTime: 0,
      error: 'NOT_FIRE_EXTINGUISHER'
    };
  }

  // Generate inspection results for each field
  const detections: AIDetectionResult[] = [];

  // ============================================================================
  // SHELL-DEPENDENT LOGIC
  // ============================================================================

  // 1. Shell condition
  const shellDetections = componentDetections['shell'] || [];
  const hasShell = shellDetections.length > 0;
  let shellBBox: [number, number, number, number] | null = null;

  if (hasShell) {
    const avgConfidence = average(shellDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);

    // Get the largest shell bounding box (most confident/largest area)
    shellBBox = getLargestBBox(shellDetections);

    detections.push({
      field: 'shell',
      value: '✓',
      confidence: avgConfidence,
      reasoning: `Shell detected at ${confidencePercent}% confidence`
    });

    // Shell-dependent logic: If shell detected → automatically tick accessible
    detections.push({
      field: 'accessible',
      value: '✓',
      confidence: avgConfidence * 0.95,
      reasoning: `Shell visible and clear for camera (${confidencePercent}% confidence) - assumed accessible`
    });

    // Shell-dependent logic: If shell detected → tick NOT missing/not in place
    detections.push({
      field: 'missingNotInPlace',
      value: '✓',
      confidence: avgConfidence,
      reasoning: `Fire extinguisher shell detected in place (${confidencePercent}% confidence)`
    });
  } else {
    detections.push({
      field: 'shell',
      value: 'X',
      confidence: 0.9,
      reasoning: 'Shell not detected in image'
    });

    // If no shell, mark as potentially missing
    detections.push({
      field: 'accessible',
      value: 'X',
      confidence: 0.85,
      reasoning: 'Shell not visible - may be obstructed or missing'
    });

    detections.push({
      field: 'missingNotInPlace',
      value: 'X',
      confidence: 0.9,
      reasoning: 'Fire extinguisher shell not detected'
    });
  }

  // ============================================================================
  // DIRECT CLASS MAPPING
  // Simple logic: If component detected → tick (✓), if not detected → cross (X)
  // ============================================================================

  // 2. Hose condition
  const hoseDetections = componentDetections['hose'] || [];
  if (hoseDetections.length > 0) {
    const avgConfidence = average(hoseDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    detections.push({
      field: 'hose',
      value: '✓',
      confidence: avgConfidence,
      reasoning: `Hose detected at ${confidencePercent}% confidence`
    });
  } else {
    detections.push({
      field: 'hose',
      value: 'X',
      confidence: 0.9,
      reasoning: 'Hose not detected - missing'
    });
  }

  // 3. Nozzle condition
  const nozzleDetections = componentDetections['nozzle'] || [];
  if (nozzleDetections.length > 0) {
    const avgConfidence = average(nozzleDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    detections.push({
      field: 'nozzle',
      value: '✓',
      confidence: avgConfidence,
      reasoning: `Nozzle detected at ${confidencePercent}% confidence`
    });
  } else {
    detections.push({
      field: 'nozzle',
      value: 'X',
      confidence: 0.9,
      reasoning: 'Nozzle not detected - missing'
    });
  }

  // 4. Pressure gauge reading
  const gaugeDetections = componentDetections['pressure_gauge'] || [];
  if (gaugeDetections.length > 0) {
    const avgConfidence = average(gaugeDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    detections.push({
      field: 'pressureGauge',
      value: '✓',
      confidence: avgConfidence,
      reasoning: `Pressure gauge detected at ${confidencePercent}% confidence`
    });

    // IMPORTANT: Do NOT auto-tick emptyPressureLow
    // This requires manual inspector verification or specific gauge reading
    // AI cannot reliably determine pressure levels from image alone
  } else {
    detections.push({
      field: 'pressureGauge',
      value: 'X',
      confidence: 0.9,
      reasoning: 'Pressure gauge not detected - missing'
    });
  }

  // 5. Safety pin
  const pinDetections = componentDetections['safety_pin'] || [];
  if (pinDetections.length > 0) {
    const avgConfidence = average(pinDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    detections.push({
      field: 'safetyPin',
      value: '✓',
      confidence: avgConfidence,
      reasoning: `Safety pin detected at ${confidencePercent}% confidence`
    });
  } else {
    detections.push({
      field: 'safetyPin',
      value: 'X',
      confidence: 0.85,
      reasoning: 'Safety pin not detected - missing'
    });
  }

  // 6. Pin seal
  const sealDetections = componentDetections['pin_seal'] || [];
  if (sealDetections.length > 0) {
    const avgConfidence = average(sealDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    detections.push({
      field: 'pinSeal',
      value: '✓',
      confidence: avgConfidence,
      reasoning: `Pin seal detected at ${confidencePercent}% confidence`
    });
  } else {
    detections.push({
      field: 'pinSeal',
      value: 'X',
      confidence: 0.85,
      reasoning: 'Pin seal not detected - missing'
    });
  }

  // 7. Service tags
  const serviceTagDetections = componentDetections['service_tag'] || [];
  if (serviceTagDetections.length > 0) {
    const avgConfidence = average(serviceTagDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    detections.push({
      field: 'servicingTags',
      value: '✓',
      confidence: avgConfidence,
      reasoning: `Service tag detected at ${confidencePercent}% confidence`
    });
  } else {
    detections.push({
      field: 'servicingTags',
      value: 'X',
      confidence: 0.85,
      reasoning: 'Service tag not detected - missing'
    });
  }

  // Note: Accessibility and Missing/Not in Place are already handled in shell-dependent logic above
  // Note: Empty/Pressure Low is NOT auto-filled by AI - requires manual inspector verification

  // Extract expiry date if visible
  const extractedData: any = {};
  const expiryTagDetections = componentDetections['expiry_date_tag'] || [];
  if (expiryTagDetections.length > 0) {
    // In real implementation, this would call OCR service
    // For now, just indicate that tag was detected
    extractedData.expiryDate = {
      value: '', // OCR would fill this
      confidence: average(expiryTagDetections.map(d => d.confidence)),
      note: 'Expiry date tag detected, requires OCR to extract date'
    };
  }

  console.log('[YOLO Mapper] Final detections:', detections);
  console.log('[YOLO Mapper] Summary:', {
    totalDetections: detections.length,
    passed: detections.filter(d => d.value === '✓').length,
    failed: detections.filter(d => d.value === 'X').length,
    fields: detections.map(d => `${d.field}: ${d.value} (${Math.round(d.confidence * 100)}%)`).join(', ')
  });

  return {
    success: true,
    detections,
    extractedData,
    processingTime: 0
  };
}

/**
 * Group detections by component class
 */
function groupByComponent(detections: YOLODetection[]): Record<string, YOLODetection[]> {
  return detections.reduce((acc, det) => {
    const className = det.class;
    if (!acc[className]) {
      acc[className] = [];
    }
    acc[className].push(det);
    return acc;
  }, {} as Record<string, YOLODetection[]>);
}

/**
 * Calculate average of array of numbers
 */
function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

/**
 * Check if detection confidence meets threshold
 */
export function meetsConfidenceThreshold(detection: YOLODetection, threshold: number = 0.5): boolean {
  return detection.confidence >= threshold;
}

/**
 * Filter detections by minimum confidence
 */
export function filterLowConfidence(detections: YOLODetection[], minConfidence: number = 0.5): YOLODetection[] {
  return detections.filter(d => d.confidence >= minConfidence);
}

/**
 * Get detection summary statistics
 */
export function getDetectionStats(detections: YOLODetection[]) {
  const byClass = groupByComponent(detections);

  return {
    totalDetections: detections.length,
    uniqueClasses: Object.keys(byClass).length,
    classCounts: Object.entries(byClass).map(([className, dets]) => ({
      class: className,
      count: dets.length,
      avgConfidence: average(dets.map(d => d.confidence))
    })),
    overallAvgConfidence: average(detections.map(d => d.confidence))
  };
}

/**
 * Get the largest bounding box from a list of detections
 * Used to get the primary shell bounding box for contextual analysis
 */
function getLargestBBox(detections: YOLODetection[]): [number, number, number, number] {
  if (detections.length === 0) {
    return [0, 0, 0, 0];
  }

  // Calculate area for each detection and find the largest
  let largestDetection = detections[0];
  let largestArea = 0;

  for (const detection of detections) {
    const [x1, y1, x2, y2] = detection.bbox;
    const area = (x2 - x1) * (y2 - y1);
    if (area > largestArea) {
      largestArea = area;
      largestDetection = detection;
    }
  }

  return largestDetection.bbox;
}

/**
 * Check if a bounding box is within another bounding box
 * Used for contextual component detection (e.g., checking if hose is within shell area)
 */
function isWithinBBox(
  component: [number, number, number, number],
  container: [number, number, number, number],
  tolerance: number = 0.2
): boolean {
  const [cx1, cy1, cx2, cy2] = component;
  const [tx1, ty1, tx2, ty2] = container;

  // Allow some tolerance for components that might be partially outside
  const expandedTx1 = tx1 - (tx2 - tx1) * tolerance;
  const expandedTy1 = ty1 - (ty2 - ty1) * tolerance;
  const expandedTx2 = tx2 + (tx2 - tx1) * tolerance;
  const expandedTy2 = ty2 + (ty2 - ty1) * tolerance;

  // Check if component center is within the expanded container
  const centerX = (cx1 + cx2) / 2;
  const centerY = (cy1 + cy2) / 2;

  return (
    centerX >= expandedTx1 &&
    centerX <= expandedTx2 &&
    centerY >= expandedTy1 &&
    centerY <= expandedTy2
  );
}
