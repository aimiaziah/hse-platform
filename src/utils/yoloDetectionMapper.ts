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
    class: det.class.replace(/\s+/g, '_')
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

  // 1. Shell condition
  const shellDetections = componentDetections['shell'] || [];
  if (shellDetections.length > 0) {
    const avgConfidence = average(shellDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    detections.push({
      field: 'shell',
      value: '✓',
      confidence: avgConfidence,
      reasoning: `Shell detected at ${confidencePercent}% confidence`
    });
  } else {
    detections.push({
      field: 'shell',
      value: 'X',
      confidence: 0.9,
      reasoning: 'Shell not detected in image'
    });
  }

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
      reasoning: 'Hose not detected'
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
      reasoning: 'Nozzle not detected'
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

    // Assume pressure is OK if gauge is detected
    detections.push({
      field: 'emptyPressureLow',
      value: '✓',
      confidence: avgConfidence * 0.7,
      reasoning: `Pressure gauge visible (${confidencePercent}% confidence)`
    });
  } else {
    detections.push({
      field: 'pressureGauge',
      value: 'X',
      confidence: 0.9,
      reasoning: 'Pressure gauge not detected'
    });

    detections.push({
      field: 'emptyPressureLow',
      value: 'X',
      confidence: 0.9,
      reasoning: 'Pressure gauge not visible'
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
      reasoning: 'Safety pin not detected'
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
      reasoning: 'Pin seal not detected'
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
      reasoning: 'Service tag not detected'
    });
  }

  // 8. Accessibility check - based on component visibility
  const coreComponents = [
    { name: 'shell', detections: componentDetections['shell'] || [] },
    { name: 'hose', detections: componentDetections['hose'] || [] },
    { name: 'nozzle', detections: componentDetections['nozzle'] || [] },
    { name: 'pressure_gauge', detections: componentDetections['pressure_gauge'] || [] },
    { name: 'safety_pin', detections: componentDetections['safety_pin'] || [] },
    { name: 'pin_seal', detections: componentDetections['pin_seal'] || [] }
  ];

  // Check if components are detected (lowered threshold to 2 for better detection)
  const detectedCount = coreComponents.filter(c => c.detections.length > 0).length;

  if (detectedCount >= 2) {
    // Calculate average confidence across detected components
    const componentConfidences = coreComponents
      .filter(c => c.detections.length > 0)
      .map(c => average(c.detections.map(d => d.confidence)));
    const overallConfidence = average(componentConfidences);
    const confidencePercent = Math.round(overallConfidence * 100);

    detections.push({
      field: 'accessible',
      value: '✓',
      confidence: overallConfidence,
      reasoning: `Components visible at ${confidencePercent}% confidence`
    });
  } else {
    detections.push({
      field: 'accessible',
      value: 'X',
      confidence: 0.70,
      reasoning: `Few components visible - may be obstructed or not accessible`
    });
  }

  // 9. Missing/Not in place check - if any components detected, assume it's in place
  if (detectedCount >= 1) {
    detections.push({
      field: 'missingNotInPlace',
      value: '✓',
      confidence: 0.80,
      reasoning: 'Fire extinguisher detected in image'
    });
  } else {
    detections.push({
      field: 'missingNotInPlace',
      value: 'X',
      confidence: 0.90,
      reasoning: 'Fire extinguisher not detected'
    });
  }

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
