/**
 * Clears all stored faces from Chrome storage
 * @returns {Promise<boolean>} True if faces were cleared successfully
 */
export const clearStoredFaces = async () => {
  try {
    return new Promise((resolve) => {
      chrome.storage.local.remove(['uniqueFaces'], () => {
        if (chrome.runtime.lastError) {
          console.error('Error clearing stored faces:', chrome.runtime.lastError);
          resolve(false);
        } else {
          console.log('All stored faces cleared successfully');
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('Error clearing stored faces:', error);
    return false;
  }
};

/**
 * Stores unique faces in Chrome storage
 * @param {Array} faces - Array of face objects to store
 * @returns {Promise<boolean>} True if faces were stored successfully
 */
export const storeUniqueFaces = async (faces) => {
  try {
    return new Promise((resolve) => {
      chrome.storage.local.set({ uniqueFaces: faces }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error storing unique faces:', chrome.runtime.lastError);
          resolve(false);
        } else {
          console.log(`Stored ${faces.length} unique faces`);
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('Error storing unique faces:', error);
    return false;
  }
};

/**
 * Loads stored faces from Chrome storage
 * @returns {Promise<Array>} Array of stored faces or empty array if none found
 */
export const loadStoredFaces = async () => {
  try {
    return new Promise((resolve) => {
      chrome.storage.local.get(['uniqueFaces'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Error loading stored faces:', chrome.runtime.lastError);
          resolve([]);
          return;
        }
        
        if (result.uniqueFaces && result.uniqueFaces.length > 0) {
          console.log(`Loaded ${result.uniqueFaces.length} stored faces`);
          resolve(result.uniqueFaces);
        } else {
          console.log('No stored faces found');
          resolve([]);
        }
      });
    });
  } catch (error) {
    console.error('Error loading stored faces:', error);
    return [];
  }
};

/**
 * Updates the recording state in Chrome storage
 * @param {boolean} isRecording - Current recording state
 * @returns {Promise<boolean>} True if state was updated successfully
 */
export const updateRecordingState = async (isRecording) => {
  try {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'updateRecordingState', isRecording },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error updating recording state:', chrome.runtime.lastError);
            resolve(false);
          } else {
            console.log('Recording state updated in background:', response);
            resolve(true);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error updating recording state:', error);
    return false;
  }
};

/**
 * Gets the current recording state from Chrome storage
 * @returns {Promise<boolean>} Current recording state
 */
export const getRecordingState = async () => {
  try {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getRecordingState' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting recording state:', chrome.runtime.lastError);
          resolve(false);
        } else if (response && response.isRecording !== undefined) {
          console.log('Retrieved recording state:', response.isRecording);
          resolve(response.isRecording);
        } else {
          console.warn('Received invalid response for recording state');
          resolve(false);
        }
      });
    });
  } catch (error) {
    console.error('Error getting recording state:', error);
    return false;
  }
};
