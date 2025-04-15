import { findMatchingFace } from './faceDetectionService';
import { storeUniqueFaces } from './storageService';

/**
 * Processes detected faces and manages unique face collection
 * @param {Array} extractedFaces - Array of detected faces with descriptors
 * @param {Array} uniqueFaces - Current collection of unique faces
 * @returns {Object} Updated faces information
 */
export const processFaces = (extractedFaces, uniqueFaces) => {
  // Create a deep copy of the unique faces to avoid mutation issues
  const uniqueFacesCopy = uniqueFaces ? JSON.parse(JSON.stringify(uniqueFaces)) : [];
  
  if (!extractedFaces || extractedFaces.length === 0) {
    // If no faces detected, just mark all as not present but keep them in the collection
    return {
      currentFaces: [],
      updatedUniqueFaces: markAllFacesAsNotPresent(uniqueFacesCopy)
    };
  }
  
  // First, mark all faces as not present
  let updatedUniqueFaces = markAllFacesAsNotPresent(uniqueFacesCopy);
  const processedFaces = [];
  
  // Process each detected face
  for (const face of extractedFaces) {
    // Check if this is a new unique face or one we've seen before
    const { isNewFace, matchIndex, distance } = findMatchingFace(face.descriptor, updatedUniqueFaces);
    
    // Add metadata to the face
    const processedFace = {
      ...face,
      faceId: isNewFace ? updatedUniqueFaces.length + 1 : updatedUniqueFaces[matchIndex].faceId,
      isNewFace: isNewFace,
      matchDistance: distance
    };
    
    processedFaces.push(processedFace);
    
    // Update unique faces collection
    updatedUniqueFaces = updateUniqueFacesCollection(
      processedFace, 
      updatedUniqueFaces, 
      isNewFace, 
      matchIndex
    );
  }
  
  // Store the updated unique faces
  storeUniqueFaces(updatedUniqueFaces);
  
  return {
    currentFaces: processedFaces,
    updatedUniqueFaces
  };
};

/**
 * Marks all faces as not present
 * @param {Array} uniqueFaces - Collection of unique faces
 * @returns {Array} Updated unique faces with isPresent=false
 */
const markAllFacesAsNotPresent = (uniqueFaces) => {
  if (!uniqueFaces || uniqueFaces.length === 0) return [];
  
  // Mark all faces as not present but preserve all other properties
  return uniqueFaces.map(face => ({
    ...face,
    isPresent: false,
    // Ensure these properties exist even if they didn't before
    seenCount: face.seenCount || 1,
    lastSeen: face.lastSeen || new Date().toISOString(),
    firstSeen: face.firstSeen || new Date().toISOString(),
    lastConfidence: face.lastConfidence || 0.5
  }));
};

/**
 * Updates the unique faces collection with a new or existing face
 * @param {Object} face - Processed face with descriptor and image
 * @param {Array} uniqueFaces - Current collection of unique faces
 * @param {boolean} isNewFace - Whether this is a new face
 * @param {number} matchIndex - Index of matching face if not new
 * @returns {Array} Updated unique faces collection
 */
const updateUniqueFacesCollection = (face, uniqueFaces, isNewFace, matchIndex) => {
  const updatedFaces = [...uniqueFaces];
  
  if (isNewFace) {
    // Add new face to collection
    const newUniqueFace = {
      faceId: uniqueFaces.length + 1,
      imageUrl: face.imageUrl,
      descriptor: face.descriptor,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      seenCount: 1,
      lastConfidence: face.probability,
      isPresent: true
    };
    
    updatedFaces.push(newUniqueFace);
  } else {
    // Update existing face
    const shouldUpdateImage = face.probability > 0.7 && 
      face.probability > (updatedFaces[matchIndex].lastConfidence || 0);
    
    updatedFaces[matchIndex] = {
      ...updatedFaces[matchIndex],
      imageUrl: shouldUpdateImage ? face.imageUrl : updatedFaces[matchIndex].imageUrl,
      lastSeen: new Date().toISOString(),
      seenCount: updatedFaces[matchIndex].seenCount + 1,
      lastConfidence: face.probability,
      isPresent: true
    };
  }
  
  return updatedFaces;
};
