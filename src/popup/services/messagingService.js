/**
 * Sends a message to the content script in the active tab
 * @param {string} action - Action to perform
 * @param {Object} data - Additional data to send
 * @returns {Promise<Object>} Response from the content script
 */
export const sendMessageToActiveTab = async (action, data = {}) => {
  try {
    // Get the active tab
    const tabs = await new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs);
      });
    });
    
    // Make sure we have a valid tab
    if (!tabs || tabs.length === 0) {
      console.error('No active tab found');
      return null;
    }
    
    const activeTab = tabs[0];
    
    // Check if we can inject content scripts into this tab
    const url = activeTab.url || '';
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://')) {
      console.warn('Cannot inject content scripts into', url);
      return null;
    }
    
    // Send message to content script
    return new Promise((resolve) => {
      try {
        chrome.tabs.sendMessage(
          activeTab.id,
          { action, ...data },
          (response) => {
            if (chrome.runtime.lastError) {
              // Handle the error silently - content script might not be loaded
              console.log('Error sending message:', chrome.runtime.lastError.message);
              resolve(null);
            } else {
              console.log('Response from content script:', response);
              resolve(response);
            }
          }
        );
      } catch (error) {
        console.error('Failed to send message:', error);
        resolve(null);
      }
    });
  } catch (error) {
    console.error('Error sending message to active tab:', error);
    return null;
  }
};

/**
 * Starts the screen capture in the content script
 * @returns {Promise<boolean>} True if capture started successfully
 */
export const startCapture = async () => {
  const response = await sendMessageToActiveTab('startCapture');
  return response && response.status === 'Streaming started';
};

/**
 * Stops the screen capture in the content script
 * @returns {Promise<boolean>} True if capture stopped successfully
 */
export const stopCapture = async () => {
  const response = await sendMessageToActiveTab('stopCapture');
  return response && response.status === 'Streaming stopped';
};

/**
 * Sets up a message listener for incoming frames
 * @param {Function} callback - Function to call when a frame is received
 * @returns {Function} Function to remove the listener
 */
export const setupFrameListener = (callback) => {
  const handleMessage = (message, sender, sendResponse) => {
    if (message.action === 'frameData' && message.data) {
      callback(message.data);
      sendResponse({ status: 'Frame received' });
    }
    return true; // Keep the message channel open for async responses
  };
  
  // Add the message listener
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Return a function to remove the listener
  return () => {
    chrome.runtime.onMessage.removeListener(handleMessage);
  };
};

/**
 * Gets the active tab ID
 * @returns {Promise<number>} Active tab ID or null if not found
 */
export const getActiveTabId = async () => {
  try {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
          resolve(tabs[0].id);
        } else {
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('Error getting active tab ID:', error);
    return null;
  }
};
