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
 * Process a batch of images through the complete pipeline:
 * 1. Extract URLs from PimEyes using all images at once
 * 2. Scrape content from those URLs
 * 3. Aggregate person information from scraped content
 * 
 * @param {string[]} imageDataUrls - Array of Base64 encoded image data URLs
 * @param {Object} options - Options for processing
 * @param {number} options.delay - Delay between URL scraping requests
 * @param {boolean} options.verbose - Whether to print detailed progress information
 * @param {Function} options.onProgress - Callback function for progress updates
 * @returns {Promise<Object>} - Object containing information about the person and the research attempt
 */
const processImageBatch = async (imageDataUrls, options = {}) => {
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
    
    // Step 1: Get URLs from PimEyes using all images at once
    if (verbose) console.log(`\n=== Processing ${imageDataUrls.length} images as a batch ===`);
    
    // Use the background script to make the API call with all images
    const pimeyesResults = await callBackgroundApi('pimeyes', 'searchByImage', { imageDataUrls });
    
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
      // Create a variable to hold the results we'll iterate over
      let resultsToProcess = pimeyesResults;
      
      // First, ensure we have an array we can iterate over
      if (!Array.isArray(resultsToProcess)) {
        console.error('PimEyes results is not an array:', resultsToProcess);
        if (resultsToProcess && resultsToProcess.results && Array.isArray(resultsToProcess.results)) {
          console.log('Found results array inside pimeyesResults object, using that instead');
          resultsToProcess = resultsToProcess.results;
        } else {
          throw new Error('PimEyes results is not in expected format');
        }
      }
      
      // Now iterate over the results safely
      for (const result of resultsToProcess) {
        if (!result) continue; // Skip null/undefined results
        
        // Check for different result formats
        let url = null;
        let thumbnailUrl = null;
        
        // Format 1: sourceUrl and thumbnailUrl properties
        if (result.sourceUrl) {
          url = result.sourceUrl;
          thumbnailUrl = result.thumbnailUrl;
        }
        // Format 2: url and thumbnail properties
        else if (result.url) {
          url = result.url;
          thumbnailUrl = result.thumbnail;
        }
        
        // Only add if we have a URL and it's not already in our list
        if (url && !urls.includes(url)) {
          // Check quality if available, otherwise include all results
          const quality = result.quality || 0;
          if (quality > 0.8 || !result.quality) {
            urls.push(url);
            thumbnailUrls.push(thumbnailUrl || null); // Keep arrays aligned
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
      console.error('PimEyes results:', JSON.stringify(pimeyesResults).substring(0, 200) + '...');
      
      // Return any URLs we've extracted so far instead of an error
      // This allows the research to continue even if we couldn't extract all URLs
      if (urls.length > 0) {
        console.log(`Successfully extracted ${urls.length} URLs before the error occurred`);
        // Continue with the URLs we have
      } else {
        return {
          error: true,
          errorType: 'processing_error',
          errorMessage: `Error extracting URLs: ${error.message}`
        };
      }
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
      description: "Faces detected in PimEyes database",
      sourceUrls: urls,
      thumbnailUrls: thumbnailUrls,
      imageDataUrls: imageDataUrls, // Store all image URLs used in this research attempt
      matchCount: urls.length,
      // Add a flag to indicate we skipped the full processing
      simplified: true,
      // Add timestamp for this research attempt
      timestamp: new Date().toISOString(),
      // Add a unique ID for this research attempt
      researchId: `research-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
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
 * Process multiple face images as a single research attempt
 * 
 * @param {Array} faceImages - Array of face image data URLs
 * @param {Object} options - Options for processing
 * @returns {Promise<Object>} - Single research result for all faces
 */
const processMultipleFaces = async (faceImages, options = {}) => {
  try {
    if (!faceImages || faceImages.length === 0) {
      console.error('No face images provided for research');
      return {
        error: true,
        errorType: 'no_faces',
        errorMessage: 'No faces provided for research'
      };
    }
    
    console.log(`Processing ${faceImages.length} faces as a single research attempt`);
    
    // Extract image URLs from face objects
    const imageDataUrls = faceImages.map(face => face.imageUrl);
    
    // Process all images as a batch
    const batchOptions = {
      ...options,
      onProgress: (progress) => {
        if (options.onProgress) {
          options.onProgress({
            ...progress,
            totalFaces: faceImages.length
          });
        }
      }
    };
    
    // Process all faces as a single batch
    const result = await processImageBatch(imageDataUrls, batchOptions);
    
    // Return a single result object for all faces
    return result;
  } catch (error) {
    console.error(`Error in processMultipleFaces: ${error.message}`);
    return {
      error: true,
      errorType: 'processing_failed',
      errorMessage: 'Face processing failed',
      details: error.message
    };
  }
};

export { processMultipleFaces, processImageBatch };
