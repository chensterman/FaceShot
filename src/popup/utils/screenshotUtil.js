/**
 * Utility functions for taking screenshots and processing them
 */
import * as faceapi from 'face-api.js';
import { loadFaceDetectionModels } from './faceDetection';

/**
 * Take a screenshot of the current tab
 * @returns {Promise<string>} A promise that resolves with the screenshot data URL
 */
export const captureScreenshot = async () => {
  try {
    // Get the active tab
    const tabs = await new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs);
      });
    });
    
    if (!tabs || tabs.length === 0) {
      throw new Error('No active tab found');
    }
    
    const activeTab = tabs[0];
    
    // Check if we can capture this tab
    const url = activeTab.url || '';
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://')) {
      throw new Error(`Cannot capture screenshots of ${url}`);
    }
    
    // Capture the visible tab
    const dataUrl = await new Promise((resolve, reject) => {
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(dataUrl);
        }
      });
    });
    
    return dataUrl;
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    throw error;
  }
};

/**
 * Process a screenshot to detect faces and extract individual face images
 * @param {string} screenshotDataUrl - The screenshot data URL
 * @param {boolean} leftHalfOnly - Whether to process only the left half of the image
 * @returns {Promise<Object>} A promise that resolves with the detection results and extracted face images
 */
export const processScreenshotForFaces = async (screenshotDataUrl, leftHalfOnly = true) => {
  try {
    // Load face detection models if not already loaded
    await loadFaceDetectionModels();
    
    // Create an image element from the screenshot
    const img = new Image();
    img.src = screenshotDataUrl;
    
    // Wait for the image to load
    await new Promise((resolve) => {
      img.onload = resolve;
    });
    
    // Create a canvas to process the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    let sourceX = 0;
    let sourceWidth = img.width;
    
    // If we only want the left half, adjust the width
    if (leftHalfOnly) {
      sourceWidth = Math.floor(img.width / 2);
    }
    
    canvas.width = sourceWidth;
    canvas.height = img.height;
    
    // Draw the image (or left half) onto the canvas
    ctx.drawImage(
      img,
      sourceX, 0, sourceWidth, img.height, // Source rectangle
      0, 0, canvas.width, canvas.height    // Destination rectangle
    );
    
    // Get the processed image data URL
    const processedImageDataUrl = canvas.toDataURL('image/png');
    
    // Detect faces in the processed image
    const detections = await faceapi.detectAllFaces(
      canvas, 
      new faceapi.TinyFaceDetectorOptions()
    )
    .withFaceLandmarks();
    
    // Extract individual face images
    const faceImages = [];
    const padding = 50; // Add padding around the face
    
    for (const detection of detections) {
      const box = detection.detection.box;
      
      // Create a canvas for each face
      const faceCanvas = document.createElement('canvas');
      const faceCtx = faceCanvas.getContext('2d');
      
      // Calculate dimensions with padding
      const x = Math.max(0, box.x - padding);
      const y = Math.max(0, box.y - padding);
      const width = Math.min(canvas.width - x, box.width + padding * 2);
      const height = Math.min(canvas.height - y, box.height + padding * 2);
      
      // Set face canvas dimensions
      faceCanvas.width = width;
      faceCanvas.height = height;
      
      // Draw just the face region to the face canvas
      faceCtx.drawImage(
        canvas,
        x, y, width, height, // Source rectangle
        0, 0, width, height  // Destination rectangle
      );
      
      // Get the face image data URL
      const faceImageDataUrl = faceCanvas.toDataURL('image/png');
      
      // Add to face images array
      faceImages.push({
        imageUrl: faceImageDataUrl,
        box: { x, y, width, height }
      });
    }
    
    return {
      detections,
      processedImageDataUrl,
      faceImages,
      imageWidth: canvas.width,
      imageHeight: canvas.height,
      totalFaces: detections.length
    };
  } catch (error) {
    console.error('Error processing screenshot for faces:', error);
    throw error;
  }
};


