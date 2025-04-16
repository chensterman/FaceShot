/**
 * Utility functions for face detection using TensorFlow.js and face-api.js
 */
import * as faceapi from 'face-api.js';

// Face detection settings
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
const FACE_MATCH_THRESHOLD = 0.6; // Lower = more strict matching

// Tracking state
let modelsLoaded = false;

/**
 * Loads all required face-api.js models
 * @returns {Promise<boolean>} True if models loaded successfully
 */
export const loadFaceDetectionModels = async () => {
  if (modelsLoaded) return true;
  
  try {
    console.log('Loading face-api.js models...');
    
    // Load face detection model
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    
    // Load additional models for face recognition
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    
    modelsLoaded = true;
    console.log('Face-api.js models loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading face-api.js models:', error);
    return false;
  }
};




