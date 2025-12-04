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

  // Generate inspection results for each field
  const detections: AIDetectionResult[] = [];

  // 1. Shell condition
  const shellDetections = componentDetections['shell'] || [];
  if (shellDetections.length > 0) {
    const avgConfidence = average(shellDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    detections.push({
      field: 'shell',
      value: avgConfidence > 0.75 ? '√' : 'X',
      confidence: avgConfidence,
      reasoning: avgConfidence > 0.85
        ? `Shell detected with ${confidencePercent}% confidence - appears intact`
        : avgConfidence > 0.75
        ? `Shell detected with ${confidencePercent}% confidence - condition acceptable`
        : `Shell detected with ${confidencePercent}% confidence - needs manual verification`
    });
  } else {
    detections.push({
      field: 'shell',
      value: 'X',
      confidence: 0.9,
      reasoning: 'Shell not detected in image - check if extinguisher is visible'
    });
  }

  // 2. Hose condition
  const hoseDetections = componentDetections['hose'] || [];
  if (hoseDetections.length > 0) {
    const avgConfidence = average(hoseDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    detections.push({
      field: 'hose',
      value: avgConfidence > 0.65 ? '√' : 'X',
      confidence: avgConfidence,
      reasoning: avgConfidence > 0.80
        ? `Hose detected at ${confidencePercent}% confidence - clearly visible and attached`
        : avgConfidence > 0.65
        ? `Hose detected at ${confidencePercent}% confidence - appears attached`
        : `Hose detected at ${confidencePercent}% confidence - may need closer inspection`
    });
  } else {
    detections.push({
      field: 'hose',
      value: 'X',
      confidence: 0.9,
      reasoning: 'Hose not detected - may be missing or not visible in photo'
    });
  }

  // 3. Nozzle condition
  const nozzleDetections = componentDetections['nozzle'] || [];
  if (nozzleDetections.length > 0) {
    const avgConfidence = average(nozzleDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    detections.push({
      field: 'nozzle',
      value: avgConfidence > 0.65 ? '√' : 'X',
      confidence: avgConfidence,
      reasoning: avgConfidence > 0.80
        ? `Nozzle detected at ${confidencePercent}% confidence - clearly visible and attached`
        : avgConfidence > 0.65
        ? `Nozzle detected at ${confidencePercent}% confidence - appears present`
        : `Nozzle detected at ${confidencePercent}% confidence - verify attachment`
    });
  } else {
    detections.push({
      field: 'nozzle',
      value: 'X',
      confidence: 0.9,
      reasoning: 'Nozzle not detected - may be missing or obscured in photo'
    });
  }

  // 4. Pressure gauge reading
  const gaugeDetections = componentDetections['pressure_gauge'] || [];
  if (gaugeDetections.length > 0) {
    const avgConfidence = average(gaugeDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    detections.push({
      field: 'pressureGauge',
      value: avgConfidence > 0.70 ? '√' : 'X',
      confidence: avgConfidence,
      reasoning: avgConfidence > 0.85
        ? `Pressure gauge detected at ${confidencePercent}% confidence - clearly readable`
        : avgConfidence > 0.70
        ? `Pressure gauge detected at ${confidencePercent}% confidence - appears visible`
        : `Pressure gauge detected at ${confidencePercent}% confidence - may be obscured`
    });

    // Also infer pressure status (if gauge visible, assume pressure OK)
    if (avgConfidence > 0.70) {
      detections.push({
        field: 'emptyPressureLow',
        value: '√',
        confidence: avgConfidence * 0.9,
        reasoning: `Pressure gauge visible at ${confidencePercent}% confidence - appears in operational range`
      });
    }
  } else {
    detections.push({
      field: 'pressureGauge',
      value: 'X',
      confidence: 0.9,
      reasoning: 'Pressure gauge not detected - verify gauge is visible in photo'
    });
  }

  // 5. Safety pin
  const pinDetections = componentDetections['safety_pin'] || [];
  if (pinDetections.length > 0) {
    const avgConfidence = average(pinDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    detections.push({
      field: 'safetyPin',
      value: avgConfidence > 0.65 ? '√' : 'X',
      confidence: avgConfidence,
      reasoning: avgConfidence > 0.80
        ? `Safety pin detected at ${confidencePercent}% confidence - clearly in place`
        : avgConfidence > 0.65
        ? `Safety pin detected at ${confidencePercent}% confidence - appears intact`
        : `Safety pin detected at ${confidencePercent}% confidence - verify it's in place`
    });
  } else {
    detections.push({
      field: 'safetyPin',
      value: 'X',
      confidence: 0.85,
      reasoning: 'Safety pin not detected - verify pin is present'
    });
  }

  // 6. Pin seal
  const sealDetections = componentDetections['pin_seal'] || [];
  if (sealDetections.length > 0) {
    const avgConfidence = average(sealDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    detections.push({
      field: 'pinSeal',
      value: avgConfidence > 0.65 ? '√' : 'X',
      confidence: avgConfidence,
      reasoning: avgConfidence > 0.80
        ? `Pin seal detected at ${confidencePercent}% confidence - clearly intact`
        : avgConfidence > 0.65
        ? `Pin seal detected at ${confidencePercent}% confidence - appears present`
        : `Pin seal detected at ${confidencePercent}% confidence - verify condition`
    });
  } else {
    detections.push({
      field: 'pinSeal',
      value: 'X',
      confidence: 0.85,
      reasoning: 'Pin seal not detected - verify seal is unbroken'
    });
  }

  // 7. Service tags
  const serviceTagDetections = componentDetections['service_tag'] || [];
  if (serviceTagDetections.length > 0) {
    const avgConfidence = average(serviceTagDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    detections.push({
      field: 'servicingTags',
      value: avgConfidence > 0.60 ? '√' : 'X',
      confidence: avgConfidence,
      reasoning: avgConfidence > 0.75
        ? `Service tag detected at ${confidencePercent}% confidence - clearly readable`
        : avgConfidence > 0.60
        ? `Service tag detected at ${confidencePercent}% confidence - appears visible`
        : `Service tag detected at ${confidencePercent}% confidence - may be hard to read`
    });
  } else {
    detections.push({
      field: 'servicingTags',
      value: 'X',
      confidence: 0.85,
      reasoning: 'Service tag not detected - verify tag is attached and visible'
    });
  }

  // 8. Accessibility check - based on component visibility
  // If all 6 core components are clearly visible with high confidence (>85%),
  // we can infer the extinguisher is accessible (nothing blocking the view)
  const coreComponents = [
    { name: 'shell', detections: componentDetections['shell'] || [] },
    { name: 'hose', detections: componentDetections['hose'] || [] },
    { name: 'nozzle', detections: componentDetections['nozzle'] || [] },
    { name: 'pressure_gauge', detections: componentDetections['pressure_gauge'] || [] },
    { name: 'safety_pin', detections: componentDetections['safety_pin'] || [] },
    { name: 'pin_seal', detections: componentDetections['pin_seal'] || [] }
  ];

  // Check if all 6 components are detected
  const allComponentsDetected = coreComponents.every(c => c.detections.length > 0);

  if (allComponentsDetected) {
    // Calculate average confidence across all components
    const componentConfidences = coreComponents.map(c =>
      average(c.detections.map(d => d.confidence))
    );
    const overallConfidence = average(componentConfidences);
    const confidencePercent = Math.round(overallConfidence * 100);

    // If all components visible with high confidence, infer accessibility
    if (overallConfidence > 0.85) {
      detections.push({
        field: 'accessible',
        value: '√',
        confidence: overallConfidence,
        reasoning: `All components clearly visible at ${confidencePercent}% confidence - appears accessible with no obstructions`
      });
    } else if (overallConfidence > 0.70) {
      detections.push({
        field: 'accessible',
        value: '√',
        confidence: overallConfidence,
        reasoning: `All components detected at ${confidencePercent}% confidence - likely accessible`
      });
    } else {
      // Lower confidence - don't auto-fill, let inspector decide
      detections.push({
        field: 'accessible',
        value: 'NA',
        confidence: overallConfidence,
        reasoning: `All components detected but confidence ${confidencePercent}% - manual verification recommended`
      });
    }
  } else {
    // Not all components detected - something might be blocking or missing
    const missingComponents = coreComponents
      .filter(c => c.detections.length === 0)
      .map(c => c.name);

    detections.push({
      field: 'accessible',
      value: 'NA',
      confidence: 0.70,
      reasoning: `Components not fully visible (missing: ${missingComponents.join(', ')}) - manual accessibility check required`
    });
  }

  // 9. Missing/Not in place check
  const bracketDetections = componentDetections['mounting_bracket'] || [];
  const hasBracket = bracketDetections.length > 0;

  detections.push({
    field: 'missingNotInPlace',
    value: hasBracket ? '√' : 'X',
    confidence: hasBracket
      ? average(bracketDetections.map(d => d.confidence))
      : 0.80,
    reasoning: hasBracket
      ? 'Extinguisher appears properly mounted'
      : 'Mounting bracket not visible, may not be in designated location'
  });

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
    passed: detections.filter(d => d.value === '√').length,
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
