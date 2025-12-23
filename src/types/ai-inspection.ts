// AI Inspection Types and Interfaces

export interface AIDetectionResult {
  field: string;
  value: '✓' | 'X' | 'NA';
  confidence: number; // 0-1 scale
  reasoning?: string;
}

export interface AIExtractedData {
  serialNumber?: {
    value: string;
    confidence: number;
  };
  expiryDate?: {
    value: string;
    confidence: number;
  };
  location?: {
    value: string;
    confidence: number;
  };
}

export interface AIInspectionResult {
  success: boolean;
  detections: AIDetectionResult[];
  extractedData: AIExtractedData;
  visualizations?: {
    stepId: string;
    annotatedImage: string; // Base64 with detection boxes
    detectedComponents: string[]; // e.g., ['shell', 'hose', 'nozzle']
  }[];
  processingTime?: number;
  error?: string;
  warning?: string;
}

export interface CapturedImage {
  stepId: string;
  dataUrl: string;
  timestamp: number;
}

export interface AIProcessingRequest {
  images: CapturedImage[];
  extinguisherInfo: {
    serialNo: string;
    location: string;
    typeSize: string;
  };
}

// Confidence level helpers
export const getConfidenceLevel = (confidence: number): 'high' | 'medium' | 'low' => {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
};

export const getConfidenceColor = (confidence: number): string => {
  const level = getConfidenceLevel(confidence);
  return {
    high: 'text-green-600 bg-green-50 border-green-300',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-300',
    low: 'text-red-600 bg-red-50 border-red-300',
  }[level];
};

export const getConfidenceIcon = (confidence: number): string => {
  const level = getConfidenceLevel(confidence);
  return {
    high: '✓',
    medium: '⚠',
    low: '!',
  }[level];
};
