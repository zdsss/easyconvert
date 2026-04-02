// File attribute classifier - classifies before parsing
export type FileSize = 'tiny' | 'small' | 'medium' | 'large' | 'xlarge';
export type FileComplexity = 'simple' | 'standard' | 'complex';
export type ImageEstimate = 'low' | 'multi' | 'high';

export interface FileClassification {
  size: FileSize;
  complexity: FileComplexity;
  estimatedImages: ImageEstimate;
  fileSizeBytes: number;
}

export function classifyFile(file: File): FileClassification {
  const bytes = file.size;

  // Size classification (based on file size)
  let size: FileSize;
  if (bytes < 50 * 1024) size = 'tiny';
  else if (bytes < 200 * 1024) size = 'small';
  else if (bytes < 500 * 1024) size = 'medium';
  else if (bytes < 2 * 1024 * 1024) size = 'large';
  else size = 'xlarge';

  // Complexity estimation
  let complexity: FileComplexity;
  if (bytes < 100 * 1024) complexity = 'simple';
  else if (bytes < 800 * 1024) complexity = 'standard';
  else complexity = 'complex';

  // Image estimation
  let estimatedImages: ImageEstimate;
  if (bytes < 150 * 1024) estimatedImages = 'low';
  else if (bytes < 600 * 1024) estimatedImages = 'multi';
  else estimatedImages = 'high';

  return { size, complexity, estimatedImages, fileSizeBytes: bytes };
}
