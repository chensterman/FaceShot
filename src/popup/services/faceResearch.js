/**
 * Face Research Service
 * Provides functionality to research faces using PimEyes, URL scraping, and LLM aggregation
 */

// Use the background script for API calls instead of direct imports
// This avoids CORS issues in Chrome extensions

/**
 * Call an API through the background script to avoid CORS issues
 * 
 * @param {string} service - The service to call (pimeyes, openai, scraper)
 * @param {string} method - The method to call on the service
 * @param {Object} params - Parameters for the method
 * @returns {Promise<any>} - The response from the API
 */
const callBackgroundApi = async (service, method, params) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'apiRequest',
        data: { service, method, params }
      },
      response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Unknown error'));
        }
      }
    );
  });
};

/**
 * Process an image through the complete pipeline:
 * 1. Extract URLs from PimEyes using the image
 * 2. Scrape content from those URLs
 * 3. Aggregate person information from scraped content
 * 
 * @param {string} imageDataUrl - Base64 encoded image data URL
 * @param {Object} options - Options for processing
 * @param {number} options.delay - Delay between URL scraping requests
 * @param {boolean} options.verbose - Whether to print detailed progress information
 * @param {Function} options.onProgress - Callback function for progress updates
 * @returns {Promise<Object>} - Object containing information about the person
 */
const processImage = async (imageDataUrl, options = {}) => {
  const { delay = 0.1, verbose = false, onProgress = null } = options;
  
  // Define the stages - only using PimEyes now, skipping scraper and aggregator
  const stages = {
    pimeyes: { weight: 1.0, name: 'Finding matches' }
    // scraping and aggregating stages removed
  };
  
  // Function to calculate overall progress
  const updateProgress = (stageName, stageProgress, message) => {
    if (!onProgress) return;
    
    // Find the current stage
    const currentStage = stages[stageName];
    if (!currentStage) return;
    
    // Calculate the starting percentage for this stage
    let startPercent = 0;
    for (const stage in stages) {
      if (stage === stageName) break;
      startPercent += stages[stage].weight * 100;
    }
    
    // Calculate the overall progress
    const overallProgress = startPercent + (currentStage.weight * stageProgress);
    
    // Send the progress update
    onProgress({ 
      stage: stageName, 
      progress: Math.min(Math.round(overallProgress), 100),
      message: message || `${currentStage.name}...`
    });
  };
  
  try {
    // Update progress for starting the process
    updateProgress('pimeyes', 0, 'Starting PimEyes search...');
    
    // Step 1: Get URLs from PimEyes using the image
    if (verbose) console.log(`\n=== Processing image ===`);
    
    // Use the background script to make the API call
    const pimeyesResults = await callBackgroundApi('pimeyes', 'searchByImage', { imageDataUrl });
    
    if (!pimeyesResults || pimeyesResults.length === 0) {
      console.error("Error: Failed to get results from PimEyes.");
      return {
        error: true,
        errorType: 'pimeyes_no_results',
        errorMessage: 'No matches found for this face'
      };
    }
    
    // Update progress
    updateProgress('pimeyes', 100, 'PimEyes search completed');
    
    // Extract URLs and thumbnails from PimEyes results
    const urls = [];
    const thumbnailUrls = [];
    try {
      for (const result of pimeyesResults) {
        // Only include results with quality > 0.8
        if (result.quality && result.quality > 0.8) {
          const url = result.sourceUrl;
          if (url && !urls.includes(url)) {
            urls.push(url);
            // Also extract thumbnail URL if available
            if (result.thumbnailUrl) {
              thumbnailUrls.push(result.thumbnailUrl);
            } else {
              thumbnailUrls.push(null); // Keep arrays aligned
            }
          }
        }
      }
      
      if (verbose) {
        console.log(`\n=== Found ${urls.length} unique URLs ===`);
        urls.slice(0, 10).forEach((url, i) => {
          console.log(`${i+1}. ${url}`);
        });
        if (urls.length > 10) {
          console.log(`...and ${urls.length - 10} more`);
        }
      }
    } catch (error) {
      console.error(`Error extracting URLs from PimEyes results: ${error.message}`);
      return {
        error: true,
        errorType: 'url_extraction_failed',
        errorMessage: 'Failed to process search results',
        details: error.message
      };
    }
    
    if (urls.length === 0) {
      console.log("No URLs found in PimEyes results.");
      return {
        error: true,
        errorType: 'no_urls_found',
        errorMessage: 'No source websites found for this face'
      };
    }
    
    // Skip URL scraping and LLM aggregation steps
    console.log("Skipping URL scraping and LLM aggregation steps");
    
    // Create a simplified result with just the PimEyes data
    const simplifiedResult = {
      name: "Unknown", // Default name since we're skipping identification
      description: "Face detected in PimEyes database",
      sourceUrls: urls,
      thumbnailUrls: thumbnailUrls,
      imageDataUrl: imageDataUrl,
      matchCount: urls.length,
      // Add a flag to indicate we skipped the full processing
      simplified: true
    };
    
    return simplifiedResult;
  } catch (error) {
    console.error(`Error in processImage: ${error.message}`);
    return {
      error: true,
      errorType: 'processing_failed',
      errorMessage: 'Face processing failed',
      details: error.message,
      imageDataUrl: imageDataUrl
    };
  }
};

/**
 * Process multiple face images concurrently
 * 
 * @param {Array} faceImages - Array of face image data URLs
 * @param {Object} options - Options for processing
 * @returns {Promise<Array>} - Array of results for each face
 */
const processMultipleFaces = async (faceImages, options = {}) => {
  try {
    // Create an array of promises for each face
    const promises = faceImages.map((face, index) => {
      const faceOptions = {
        ...options,
        onProgress: (progress) => {
          if (options.onProgress) {
            options.onProgress({
              ...progress,
              faceIndex: index,
              totalFaces: faceImages.length
            });
          }
        }
      };
      
      return processImage(face.imageUrl, faceOptions);
    });
    
    // Process all faces concurrently
    const results = await Promise.all(promises);
    
    // Don't filter out error results, just return all results
    // This way, error information will be displayed on the FaceCards
    return results;
  } catch (error) {
    console.error(`Error in processMultipleFaces: ${error.message}`);
    return [];
  }
};

export { processMultipleFaces, processImage };
