// We need to use importScripts instead of ES modules for service workers
// This will be replaced with the actual paths during build
self.importScripts(
    '/assets/pimeyesApi.js',
    '/assets/urlScraper.js',
    '/assets/llmAggregate.js'
);

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
    } else if (message.action === 'apiRequest') {
        // Handle API requests from popup
        handleApiRequest(message.data, sendResponse);
        return true; // Required to use sendResponse asynchronously
    }
});

/**
 * Handle API requests from the popup
 * 
 * @param {Object} data - The request data
 * @param {Function} sendResponse - Function to send response back to popup
 */
const handleApiRequest = async (data, sendResponse) => {
    try {
        const { service, method, params } = data;
        console.log(`API Request: ${service}.${method}`, params);
        
        // Handle different services
        let result;
        switch (service) {
            case 'pimeyes':
                result = await handlePimEyesRequest(method, params);
                break;
            case 'scraper':
                result = await handleScraperRequest(method, params);
                break;
            case 'aggregator':
                result = await handleAggregatorRequest(method, params);
                break;
            default:
                throw new Error(`Unknown service: ${service}`);
        }
        
        sendResponse({ success: true, data: result });
    } catch (error) {
        console.error('Error handling API request:', error);
        sendResponse({ success: false, error: error.message });
    }
};

/**
 * Handle PimEyes API requests
 * 
 * @param {string} method - The method to call
 * @param {Object} params - Parameters for the method
 * @returns {Promise<any>} - The response from PimEyes
 */
const handlePimEyesRequest = async (method, params) => {
    console.log(`Handling PimEyes request: ${method}`);
    
    // Use the globally available function from importScripts
    switch (method) {
        case 'searchByImage':
            // Use the actual PimEyes search implementation
            return await self.pimeyesApi.imgToUrls(params.imageDataUrl);
        default:
            throw new Error(`Unknown PimEyes method: ${method}`);
    }
};



/**
 * Handle Scraper requests
 * 
 * @param {string} method - The method to call
 * @param {Object} params - Parameters for the method
 * @returns {Promise<any>} - The response from the scraper
 */
const handleScraperRequest = async (method, params) => {
    console.log(`Handling scraper request: ${method}`, params);
    
    // Use the globally available function from importScripts
    switch (method) {
        case 'scrapeUrl':
            // Use the actual URL scraper implementation
            const results = await self.urlScraper.batchScrape([params.url], params.delay || 0.1);
            return results[0];
        case 'scrapeUrls':
        case 'scrapeMultipleUrls':
            // Use the actual batch scraper implementation
            return await self.urlScraper.batchScrape(params.urls, params.delay || 0.1);
        default:
            throw new Error(`Unknown scraper method: ${method}`);
    }
};



/**
 * Handle Aggregator requests
 * 
 * @param {string} method - The method to call
 * @param {Object} params - Parameters for the method
 * @returns {Promise<any>} - The response from the aggregator
 */
const handleAggregatorRequest = async (method, params) => {
    console.log(`Handling aggregator request: ${method}`, params);
    
    // Use the globally available function from importScripts
    switch (method) {
        case 'aggregatePersonInfo':
            // Use the actual aggregator implementation
            // Handle both parameter formats (scrapedResults or successfulScrapes)
            const scrapedData = params.scrapedResults || params.successfulScrapes;
            console.log('Aggregating person info from data:', scrapedData);
            return await self.llmAggregate.aggregatePersonInfo(scrapedData);
        case 'chatCompletion':
            // Handle chat completion requests
            // This is for backward compatibility with your existing code
            // that might still be using 'chatCompletion'
            const scrapedContent = params.messages.find(m => m.role === 'user')?.content || '';
            const results = scrapedContent.split('\n\n').map(content => ({
                url: 'extracted-from-message',
                success: true,
                content
            }));
            return await self.llmAggregate.aggregatePersonInfo(results);
        default:
            throw new Error(`Unknown aggregator method: ${method}`);
    }
};


