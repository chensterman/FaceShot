import * as faceapi from 'face-api.js';

// Face detection settings
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
const FACE_MATCH_THRESHOLD = 0.6; // Lower = more strict matching

/**
 * Loads all required face-api.js models
 * @returns {Promise<boolean>} True if models loaded successfully
 */
export const loadFaceDetectionModels = async () => {
  try {
    console.log('Loading face-api.js models...');
    
    // Load face detection model
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    
    // Load additional models for face recognition
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    
    console.log('Face-api.js models loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading face-api.js models:', error);
    return false;
  }
};

/**
 * Detects faces in an image and extracts face images
 * @param {string} imageData - Base64 encoded image data
 * @returns {Promise<Array>} Array of detected faces with extracted images
 */
export const detectFacesInImage = async (imageData) => {
  try {
    // Defensive: Ensure model is loaded
    if (!faceapi.nets.tinyFaceDetector.params) {
      console.error('TinyFaceDetector model not loaded!');
      return [];
    }
    
    // Create an HTMLImageElement from the base64 image data
    const img = new Image();
    img.src = imageData;
    
    // Wait for the image to load
    await new Promise(resolve => {
      img.onload = resolve;
    });
    
    console.log('Running face detection on image:', img.width, 'x', img.height);
    
    // Run face detection with face-api.js - using TinyFaceDetector for better performance
    const detectionOptions = new faceapi.TinyFaceDetectorOptions({ 
      inputSize: 320, // smaller input size for faster processing
      scoreThreshold: 0.5 // minimum confidence threshold
    });
    
    // Detect faces and compute face descriptors for recognition
    const detections = await faceapi.detectAllFaces(img, detectionOptions)
      .withFaceLandmarks()
      .withFaceDescriptors();
    
    console.log(`Detected ${detections.length} faces with descriptors`);
    
    // Extract face images
    const extractedFaces = extractFaceImages(img, detections);
    
    return extractedFaces;
  } catch (error) {
    console.error('Error detecting faces:', error);
    return [];
  }
};

/**
 * Extracts face images from the original image
 * @param {HTMLImageElement} img - Original image
 * @param {Array} detections - Face detections from face-api.js
 * @returns {Array} Extracted face data with images
 */
const extractFaceImages = (img, detections) => {
  const extractedFaces = [];
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Process each detected face
  for (let i = 0; i < detections.length; i++) {
    const detection = detections[i];
    const box = detection.detection.box;
    
    // Create a prediction object
    const prediction = {
      topLeft: [box.x, box.y],
      bottomRight: [box.x + box.width, box.y + box.height],
      probability: detection.detection.score,
      descriptor: Array.from(detection.descriptor) // Convert Float32Array to regular array for storage
    };
    
    // Extract the face image
    // Add some padding around the face (20%)
    const padding = {
      x: box.width * 0.2,
      y: box.height * 0.2
    };
    
    // Calculate padded coordinates, ensuring they stay within image bounds
    const x = Math.max(0, box.x - padding.x);
    const y = Math.max(0, box.y - padding.y);
    const width = Math.min(img.width - x, box.width + (padding.x * 2));
    const height = Math.min(img.height - y, box.height + (padding.y * 2));
    
    // Set canvas size to the face dimensions
    canvas.width = width;
    canvas.height = height;
    
    // Draw only the face region to the canvas
    ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
    
    // Convert canvas to data URL
    const faceImageUrl = canvas.toDataURL('image/jpeg');
    
    // Add to extracted faces
    extractedFaces.push({
      ...prediction,
      imageUrl: faceImageUrl
    });
  }
  
  return extractedFaces;
};

/**
 * Compares a face descriptor with stored faces to find matches
 * @param {Array} newDescriptor - Face descriptor to compare
 * @param {Array} uniqueFaces - Array of stored unique faces
 * @returns {Object} Match result with isNewFace, matchIndex, and distance
 */
export const findMatchingFace = (newDescriptor, uniqueFaces) => {
  if (!uniqueFaces || uniqueFaces.length === 0) {
    return { isNewFace: true, matchIndex: -1, distance: 1.0 };
  }
  
  // Convert the descriptor back to Float32Array for comparison
  const newDescriptorFloat32 = new Float32Array(newDescriptor);
  
  let bestMatch = { index: -1, distance: 1.0 };
  
  // Compare with all stored faces
  for (let i = 0; i < uniqueFaces.length; i++) {
    const storedDescriptor = new Float32Array(uniqueFaces[i].descriptor);
    const distance = faceapi.euclideanDistance(newDescriptorFloat32, storedDescriptor);
    
    if (distance < bestMatch.distance) {
      bestMatch = { index: i, distance };
    }
  }
  
  // Determine if this is a new face based on distance threshold
  const isNewFace = bestMatch.distance > FACE_MATCH_THRESHOLD;
  
  return {
    isNewFace,
    matchIndex: bestMatch.index,
    distance: bestMatch.distance
  };
};
