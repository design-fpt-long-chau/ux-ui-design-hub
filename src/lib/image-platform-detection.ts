export type DetectedImagePlatform = "mobile" | "web" | null;

export interface ImagePlatformDetection {
  platform: DetectedImagePlatform;
  confidence: "high" | "ambiguous";
  width: number;
  height: number;
}

export function detectPlatformFromImageDimensions(width: number, height: number): ImagePlatformDetection {
  const platform = width <= 480 && height > width
    ? "mobile"
    : width >= 1024 && width > height
      ? "web"
      : null;

  return {
    platform,
    confidence: platform ? "high" : "ambiguous",
    width,
    height,
  };
}
