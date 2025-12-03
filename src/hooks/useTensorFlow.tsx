import { useState, useEffect, useCallback, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

interface FaceDetection {
  topLeft: [number, number];
  bottomRight: [number, number];
  probability: number;
  landmarks: number[][];
}

interface ImageAnalysis {
  faces: FaceDetection[];
  dominantColors: string[];
  brightness: number;
  contrast: number;
  hasText: boolean;
  aspectRatio: number;
  resolution: { width: number; height: number };
  qualityScore: number;
}

export function useTensorFlow() {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const faceModelRef = useRef<blazeface.BlazeFaceModel | null>(null);

  // Load TensorFlow and BlazeFace model
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        await tf.ready();
        console.log('TensorFlow.js backend:', tf.getBackend());
        
        // Load BlazeFace model for face detection
        faceModelRef.current = await blazeface.load();
        setIsModelLoaded(true);
        console.log('BlazeFace model loaded successfully');
      } catch (err) {
        console.error('Error loading TensorFlow models:', err);
        setError(err instanceof Error ? err.message : 'Failed to load models');
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();

    return () => {
      // Cleanup
      if (faceModelRef.current) {
        faceModelRef.current = null;
      }
    };
  }, []);

  // Detect faces in image
  const detectFaces = useCallback(async (imageUrl: string): Promise<FaceDetection[]> => {
    if (!faceModelRef.current) {
      throw new Error('Face detection model not loaded');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = async () => {
        try {
          const predictions = await faceModelRef.current!.estimateFaces(img, false);
          const faces: FaceDetection[] = predictions.map((pred: any) => ({
            topLeft: pred.topLeft as [number, number],
            bottomRight: pred.bottomRight as [number, number],
            probability: pred.probability[0],
            landmarks: pred.landmarks as number[][],
          }));
          resolve(faces);
        } catch (err) {
          reject(err);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }, []);

  // Extract dominant colors from image
  const extractColors = useCallback(async (imageUrl: string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        canvas.width = 100; // Resize for performance
        canvas.height = 100;
        ctx.drawImage(img, 0, 0, 100, 100);

        const imageData = ctx.getImageData(0, 0, 100, 100);
        const pixels = imageData.data;
        
        // Color quantization using simple binning
        const colorMap = new Map<string, number>();
        
        for (let i = 0; i < pixels.length; i += 4) {
          const r = Math.round(pixels[i] / 32) * 32;
          const g = Math.round(pixels[i + 1] / 32) * 32;
          const b = Math.round(pixels[i + 2] / 32) * 32;
          const key = `${r},${g},${b}`;
          colorMap.set(key, (colorMap.get(key) || 0) + 1);
        }

        // Sort by frequency and get top 5 colors
        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([color]) => {
            const [r, g, b] = color.split(',').map(Number);
            return `rgb(${r}, ${g}, ${b})`;
          });

        resolve(sortedColors);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }, []);

  // Calculate brightness and contrast
  const analyzeImageQuality = useCallback(async (imageUrl: string): Promise<{ brightness: number; contrast: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        let totalBrightness = 0;
        const brightnessValues: number[] = [];
        
        for (let i = 0; i < pixels.length; i += 4) {
          // Calculate perceived brightness (weighted average)
          const brightness = (0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]) / 255;
          brightnessValues.push(brightness);
          totalBrightness += brightness;
        }
        
        const avgBrightness = totalBrightness / brightnessValues.length;
        
        // Calculate contrast (standard deviation)
        const variance = brightnessValues.reduce((sum, b) => sum + Math.pow(b - avgBrightness, 2), 0) / brightnessValues.length;
        const contrast = Math.sqrt(variance);

        resolve({
          brightness: Math.round(avgBrightness * 100),
          contrast: Math.round(contrast * 100),
        });
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }, []);

  // Full image analysis
  const analyzeImage = useCallback(async (imageUrl: string): Promise<ImageAnalysis> => {
    setIsLoading(true);
    setError(null);

    try {
      const [faces, colors, quality] = await Promise.all([
        detectFaces(imageUrl).catch(() => [] as FaceDetection[]),
        extractColors(imageUrl),
        analyzeImageQuality(imageUrl),
      ]);

      // Get image dimensions
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
      });

      // Calculate quality score based on multiple factors
      let qualityScore = 50; // Base score
      
      // Face bonus (faces typically improve thumbnails)
      if (faces.length > 0 && faces.length <= 3) {
        qualityScore += 15;
      }
      
      // Contrast bonus
      if (quality.contrast > 20 && quality.contrast < 50) {
        qualityScore += 15; // Good contrast range
      } else if (quality.contrast > 10) {
        qualityScore += 10;
      }
      
      // Brightness bonus (not too dark, not too bright)
      if (quality.brightness > 30 && quality.brightness < 70) {
        qualityScore += 10;
      }
      
      // Resolution bonus
      if (dimensions.width >= 1280 && dimensions.height >= 720) {
        qualityScore += 10;
      }

      return {
        faces,
        dominantColors: colors,
        brightness: quality.brightness,
        contrast: quality.contrast,
        hasText: false, // Would need OCR for proper text detection
        aspectRatio: dimensions.width / dimensions.height,
        resolution: dimensions,
        qualityScore: Math.min(100, qualityScore),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [detectFaces, extractColors, analyzeImageQuality]);

  return {
    isModelLoaded,
    isLoading,
    error,
    detectFaces,
    extractColors,
    analyzeImageQuality,
    analyzeImage,
  };
}
