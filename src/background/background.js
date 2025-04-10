// Initialize recording state when extension is installed
chrome.runtime.onInstalled.addListener(() => {
    console.log("✅ Extension installed");
    chrome.storage.local.set({ isRecording: false }, () => {
        console.log("Recording state initialized to false");
    });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateRecordingState') {
        // Update the recording state in storage
        chrome.storage.local.set({ isRecording: message.isRecording }, () => {
            console.log(`Recording state updated to: ${message.isRecording}`);
            sendResponse({ success: true });
        });
        return true; // Required to use sendResponse asynchronously
    } else if (message.action === 'getRecordingState') {
        // Retrieve the current recording state
        chrome.storage.local.get(['isRecording'], (result) => {
            console.log(`Current recording state: ${result.isRecording}`);
            sendResponse({ isRecording: result.isRecording });
        });
        return true; // Required to use sendResponse asynchronously
    }
});
