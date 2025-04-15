console.log("👀 Content script running");

// Variables for streaming control
let isStreaming = false;
let streamingInterval = null;
const FRAME_RATE = 30; // frames per second

// Variables for media capture
let mediaStream = null;
let videoElement = null;
let captureCanvas = null;
let captureContext = null;



// Function to add a red border that matches the window size
function addBorder() {
  // Remove any existing border element
  removeBorder();
  
  // Create a new div element for the border
  const borderElement = document.createElement('div');
  borderElement.id = 'faceshot-border';
  
  // Style the border to match the window size
  Object.assign(borderElement.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    border: '5px solid red',
    boxSizing: 'border-box',
    pointerEvents: 'none', // Allow clicks to pass through
    zIndex: '2147483647' // Highest possible z-index
  });
  
  // Add the border to the page
  document.body.appendChild(borderElement);
}

// Function to remove the border
function removeBorder() {
  const borderElement = document.getElementById('faceshot-border');
  if (borderElement) {
    borderElement.remove();
  }
}

// Function to initialize media capture
async function initMediaCapture() {
  try {
    // Request access to the display media (screen sharing)
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: "never"
      },
      audio: false
    });
    
    // Store the stream for later cleanup
    mediaStream = stream;
    
    // Create a video element to process the stream
    videoElement = document.createElement('video');
    videoElement.srcObject = stream;
    videoElement.muted = true; // Prevent audio feedback
    
    // Create a canvas for frame extraction
    captureCanvas = document.createElement('canvas');
    captureContext = captureCanvas.getContext('2d');
    
    // Wait for the video to be ready
    await new Promise(resolve => {
      videoElement.onloadedmetadata = () => {
        // Set canvas dimensions to match video
        captureCanvas.width = videoElement.videoWidth;
        captureCanvas.height = videoElement.videoHeight;
        
        // Start playing the video
        videoElement.play().then(resolve);
      };
    });
    
    console.log('Media capture initialized:', 
      `${videoElement.videoWidth}x${videoElement.videoHeight}`);
    
    return true;
  } catch (error) {
    console.error('Error initializing media capture:', error);
    cleanupMediaCapture();
    return false;
  }
}

// Function to clean up media capture resources
function cleanupMediaCapture() {
  // Stop all tracks in the stream
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  
  // Clean up video element
  if (videoElement) {
    videoElement.srcObject = null;
    videoElement = null;
  }
  
  // Clean up canvas
  captureCanvas = null;
  captureContext = null;
  
  console.log('Media capture resources cleaned up');
}

// Function to capture the current frame from the video stream
function captureVideoFrame() {
  if (!videoElement || !captureCanvas || !captureContext) {
    console.error('Media capture not initialized');
    return null;
  }
  
  try {
    // Draw the current video frame to the canvas
    captureContext.drawImage(
      videoElement, 
      0, 0, 
      captureCanvas.width, captureCanvas.height
    );
    
    // Convert canvas to image data (base64)
    return captureCanvas.toDataURL('image/jpeg', 0.8);
  } catch (error) {
    console.error('Error capturing video frame:', error);
    return null;
  }
}

// Function to process frame
async function processFrame() {
  try {
    // Capture the current frame
    const frameData = captureVideoFrame();
    if (!frameData) return;
    
    // Send the frame to the popup
    chrome.runtime.sendMessage({
      action: 'frameData',
      data: frameData
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Popup might be closed, which is normal
        // Only log in debug mode to avoid flooding the console
        // console.debug('Error sending frame to popup:', chrome.runtime.lastError);
      }
    });
  } catch (error) {
    console.error('Error processing frame:', error);
  }
}

// Function to start streaming
async function startStreaming() {
  if (isStreaming) return;
  
  // Initialize media capture
  const initialized = await initMediaCapture();
  if (!initialized) {
    console.error('Failed to start streaming: Media capture initialization failed');
    return;
  }
  
  isStreaming = true;
  addBorder(); // Visual indicator that streaming is active
  
  // Start the streaming interval
  streamingInterval = setInterval(processFrame, 1000 / FRAME_RATE);
  console.log('Streaming started at', FRAME_RATE, 'fps');
  
  // Update recording state in background script
  chrome.runtime.sendMessage(
    { action: 'updateRecordingState', isRecording: true },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error updating recording state:', chrome.runtime.lastError);
      } else {
        console.log('Recording state updated in background:', response);
      }
    }
  );
}

// Function to stop streaming
function stopStreaming() {
  if (!isStreaming) return;
  
  isStreaming = false;
  
  // Clear the streaming interval
  clearInterval(streamingInterval);
  streamingInterval = null;
  
  // Clean up media capture resources
  cleanupMediaCapture();
  
  // Remove the border
  removeBorder();
  
  console.log('Streaming stopped');
  
  // Update recording state in background script
  chrome.runtime.sendMessage(
    { action: 'updateRecordingState', isRecording: false },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error updating recording state:', chrome.runtime.lastError);
      } else {
        console.log('Recording state updated in background:', response);
      }
    }
  );
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.action === 'startCapture') {
    startStreaming();
    sendResponse({ status: 'Streaming started' });
  } else if (message.action === 'stopCapture') {
    stopStreaming();
    sendResponse({ status: 'Streaming stopped' });
  }
  
  return true; // Required to use sendResponse asynchronously
});