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
  
  // Define the stages and their relative weights in the overall process
  const stages = {
    pimeyes: { weight: 0.3, name: 'Finding matches' },
    scraping: { weight: 0.3, name: 'Analyzing sources' },
    aggregating: { weight: 0.4, name: 'Identifying person' }
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
      return null;
    }
    
    // Update progress
    updateProgress('pimeyes', 100, 'PimEyes search completed');
    updateProgress('scraping', 0, 'Starting URL scraping...');
    
    // Extract URLs and thumbnails from PimEyes results
    const urls = [];
    const thumbnailUrls = [];
    try {
      for (const result of pimeyesResults) {
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
      return null;
    }
    
    if (urls.length === 0) {
      console.log("No URLs found in PimEyes results.");
      return null;
    }
    
    // Step 2: Scrape content from the URLs
    if (verbose) console.log(`\n=== Scraping ${urls.length} URLs ===`);
    
    // Use the background script to scrape URLs
    const scrapedResults = await callBackgroundApi('scraper', 'scrapeUrls', { 
      urls: urls,
      delay: delay 
    });
    
    const successfulScrapes = scrapedResults.filter(result => result.success);
    if (verbose) {
      console.log(`Successfully scraped ${successfulScrapes.length}/${urls.length} URLs`);
    }
    
    // Update progress
    updateProgress('scraping', 100, 'URL scraping completed');
    updateProgress('aggregating', 0, 'Aggregating person information...');
    
    if (successfulScrapes.length === 0) {
      console.log("No successful URL scrapes.");
      return null;
    }
    
    // Step 3: Aggregate person information from scraped content
    if (verbose) console.log("\n=== Aggregating person information ===");
    
    // Use the background script to call OpenAI
    const personInfo = await callBackgroundApi('aggregator', 'aggregatePersonInfo', { 
      successfulScrapes
    });
    
    // Update progress
    updateProgress('aggregating', 100, 'Person information aggregated');
    
    if (!personInfo) {
      console.log("Failed to aggregate person information.");
      return null;
    }
    
    // Add the original URLs and thumbnails to the result
    personInfo.sourceUrls = urls;
    personInfo.thumbnailUrls = thumbnailUrls;
    personInfo.imageDataUrl = imageDataUrl;
    
    return personInfo;
  } catch (error) {
    console.error(`Error in processImage: ${error.message}`);
    return null;
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
    
    // Filter out null results
    return results.filter(result => result !== null);
  } catch (error) {
    console.error(`Error in processMultipleFaces: ${error.message}`);
    return [];
  }
};

export { processMultipleFaces };
