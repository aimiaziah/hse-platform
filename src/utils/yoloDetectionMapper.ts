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

  // VALIDATION: Check if this is actually a fire extinguisher
  // A real fire extinguisher MUST have certain core components detected
  const coreComponentTypes = ['shell', 'hose', 'nozzle', 'pressure_gauge', 'safety_pin', 'pin_seal'];
  const detectedCoreComponents = coreComponentTypes.filter(type =>
    componentDetections[type] && componentDetections[type].length > 0
  );

  // More strict validation:
  // 1. Must have at least 4 core components (increased from 3)
  // 2. Shell is MANDATORY (a fire extinguisher always has a body)
  const hasShell = componentDetections['shell'] && componentDetections['shell'].length > 0;
  const hasPressureGauge = componentDetections['pressure_gauge'] && componentDetections['pressure_gauge'].length > 0;
  const minimumComponentsDetected = detectedCoreComponents.length >= 4;

  const isLikelyFireExtinguisher = hasShell && minimumComponentsDetected;

  console.log('[YOLO Mapper] Validation:', {
    detectedCoreComponents,
    count: detectedCoreComponents.length,
    hasShell,
    hasPressureGauge,
    minimumComponentsDetected,
    isLikelyFireExtinguisher
  });

  // If this doesn't look like a fire extinguisher, return empty results with clear warning
  if (!isLikelyFireExtinguisher) {
    console.warn('[YOLO Mapper] ⚠️  VALIDATION FAILED - This is likely NOT a fire extinguisher');
    console.warn('[YOLO Mapper] Detected components:', detectedCoreComponents.join(', ') || 'NONE');

    let warningMessage = '';
    if (!hasShell) {
      warningMessage = '⚠️ No fire extinguisher detected in the image. The fire extinguisher body/shell was not found. Please take a clear photo of an actual fire extinguisher.';
    } else if (!minimumComponentsDetected) {
      warningMessage = `⚠️ Insufficient fire extinguisher components detected. Found only ${detectedCoreComponents.length} components (${detectedCoreComponents.join(', ')}). A valid fire extinguisher photo should show at least 4 core components clearly. Please retake the photo with a better angle.`;
    } else {
      warningMessage = `⚠️ This does not appear to be a fire extinguisher. Only ${detectedCoreComponents.length} components detected (${detectedCoreComponents.join(', ')}). Please ensure the photo shows a real fire extinguisher.`;
    }

    return {
      success: true,
      detections: [],
      extractedData: {},
      processingTime: 0,
      warning: warningMessage
    };
  }

  // Generate inspection results for each field
  const detections: AIDetectionResult[] = [];

  // 1. Shell condition
  const shellDetections = componentDetections['shell'] || [];
  if (shellDetections.length > 0) {
    const avgConfidence = average(shellDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    // AI can only detect PRESENCE, not CONDITION - mark as NA for manual inspection
    detections.push({
      field: 'shell',
      value: 'NA',
      confidence: avgConfidence,
      reasoning: `Shell detected at ${confidencePercent}% confidence - MANUAL INSPECTION REQUIRED to verify condition (rust, dents, damage)`
    });
  } else {
    detections.push({
      field: 'shell',
      value: 'X',
      confidence: 0.9,
      reasoning: 'Shell not detected in image - check if extinguisher is visible or may be missing'
    });
  }

  // 2. Hose condition
  const hoseDetections = componentDetections['hose'] || [];
  if (hoseDetections.length > 0) {
    const avgConfidence = average(hoseDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    // AI can only detect PRESENCE, not CONDITION - mark as NA for manual inspection
    detections.push({
      field: 'hose',
      value: 'NA',
      confidence: avgConfidence,
      reasoning: `Hose detected at ${confidencePercent}% confidence - MANUAL INSPECTION REQUIRED to verify integrity (cracks, leaks, attachment)`
    });
  } else {
    detections.push({
      field: 'hose',
      value: 'X',
      confidence: 0.9,
      reasoning: 'Hose not detected - may be missing, detached, or not visible in photo'
    });
  }

  // 3. Nozzle condition
  const nozzleDetections = componentDetections['nozzle'] || [];
  if (nozzleDetections.length > 0) {
    const avgConfidence = average(nozzleDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    // AI can only detect PRESENCE, not CONDITION - mark as NA for manual inspection
    detections.push({
      field: 'nozzle',
      value: 'NA',
      confidence: avgConfidence,
      reasoning: `Nozzle detected at ${confidencePercent}% confidence - MANUAL INSPECTION REQUIRED to verify attachment and condition`
    });
  } else {
    detections.push({
      field: 'nozzle',
      value: 'X',
      confidence: 0.9,
      reasoning: 'Nozzle not detected - may be missing, detached, or obscured in photo'
    });
  }

  // 4. Pressure gauge reading
  const gaugeDetections = componentDetections['pressure_gauge'] || [];
  if (gaugeDetections.length > 0) {
    const avgConfidence = average(gaugeDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    // AI can only detect PRESENCE, not READ the gauge - mark as NA for manual inspection
    detections.push({
      field: 'pressureGauge',
      value: 'NA',
      confidence: avgConfidence,
      reasoning: `Pressure gauge detected at ${confidencePercent}% confidence - MANUAL INSPECTION REQUIRED to read pressure level (green zone check)`
    });

    // CANNOT infer pressure status from gauge detection - need to READ the gauge
    detections.push({
      field: 'emptyPressureLow',
      value: 'NA',
      confidence: avgConfidence * 0.7,
      reasoning: `Pressure gauge detected but AI cannot read gauge value - MANUAL INSPECTION REQUIRED to verify pressure is in green zone`
    });
  } else {
    detections.push({
      field: 'pressureGauge',
      value: 'X',
      confidence: 0.9,
      reasoning: 'Pressure gauge not detected - verify gauge is present and visible in photo'
    });

    // If no gauge detected, also mark pressure check as not done
    detections.push({
      field: 'emptyPressureLow',
      value: 'X',
      confidence: 0.9,
      reasoning: 'Pressure gauge not visible - cannot verify pressure level'
    });
  }

  // 5. Safety pin
  const pinDetections = componentDetections['safety_pin'] || [];
  if (pinDetections.length > 0) {
    const avgConfidence = average(pinDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    // AI can only detect PRESENCE, not verify if properly installed - mark as NA
    detections.push({
      field: 'safetyPin',
      value: 'NA',
      confidence: avgConfidence,
      reasoning: `Safety pin detected at ${confidencePercent}% confidence - MANUAL INSPECTION REQUIRED to verify proper installation and condition`
    });
  } else {
    detections.push({
      field: 'safetyPin',
      value: 'X',
      confidence: 0.85,
      reasoning: 'Safety pin not detected - may be missing or not visible in photo'
    });
  }

  // 6. Pin seal
  const sealDetections = componentDetections['pin_seal'] || [];
  if (sealDetections.length > 0) {
    const avgConfidence = average(sealDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    // AI can only detect PRESENCE, not verify if intact/unbroken - mark as NA
    detections.push({
      field: 'pinSeal',
      value: 'NA',
      confidence: avgConfidence,
      reasoning: `Pin seal detected at ${confidencePercent}% confidence - MANUAL INSPECTION REQUIRED to verify seal is intact and unbroken`
    });
  } else {
    detections.push({
      field: 'pinSeal',
      value: 'X',
      confidence: 0.85,
      reasoning: 'Pin seal not detected - may be broken, missing, or not visible in photo'
    });
  }

  // 7. Service tags
  const serviceTagDetections = componentDetections['service_tag'] || [];
  if (serviceTagDetections.length > 0) {
    const avgConfidence = average(serviceTagDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    // AI can only detect PRESENCE, not read the tag - mark as NA
    detections.push({
      field: 'servicingTags',
      value: 'NA',
      confidence: avgConfidence,
      reasoning: `Service tag detected at ${confidencePercent}% confidence - MANUAL INSPECTION REQUIRED to verify dates and completeness`
    });
  } else {
    detections.push({
      field: 'servicingTags',
      value: 'X',
      confidence: 0.85,
      reasoning: 'Service tag not detected - may be missing, faded, or not visible in photo'
    });
  }

  // 8. Accessibility check - based on component visibility
  // We can make a GUESS about accessibility based on what's visible, but mark as NA
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

    // Even if all components visible, we can't verify actual site accessibility - mark NA
    detections.push({
      field: 'accessible',
      value: 'NA',
      confidence: overallConfidence,
      reasoning: `All components detected at ${confidencePercent}% confidence - MANUAL INSPECTION REQUIRED to verify on-site accessibility (nothing blocking access)`
    });
  } else {
    // Not all components detected - something might be blocking or missing
    const missingComponents = coreComponents
      .filter(c => c.detections.length === 0)
      .map(c => c.name);

    detections.push({
      field: 'accessible',
      value: 'NA',
      confidence: 0.70,
      reasoning: `Some components not visible (${missingComponents.join(', ')}) - MANUAL INSPECTION REQUIRED for accessibility`
    });
  }

  // 9. Missing/Not in place check
  // AI can see extinguisher but cannot verify if it's in the CORRECT location
  const bracketDetections = componentDetections['mounting_bracket'] || [];
  const hasBracket = bracketDetections.length > 0;

  if (hasBracket) {
    const avgConfidence = average(bracketDetections.map(d => d.confidence));
    const confidencePercent = Math.round(avgConfidence * 100);
    detections.push({
      field: 'missingNotInPlace',
      value: 'NA',
      confidence: avgConfidence,
      reasoning: `Mounting bracket detected at ${confidencePercent}% confidence - MANUAL INSPECTION REQUIRED to verify correct location per floor plan`
    });
  } else {
    // Bracket not detected - mark as needing inspection (could be wrong angle, or actually missing)
    detections.push({
      field: 'missingNotInPlace',
      value: 'NA',
      confidence: 0.70,
      reasoning: 'Mounting bracket not visible - MANUAL INSPECTION REQUIRED to verify extinguisher is in designated location'
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
