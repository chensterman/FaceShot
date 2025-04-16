/**
 * Face Research Service
 * Provides functionality to research faces using PimEyes, URL scraping, and LLM aggregation
 */

import { imgToUrls } from './pimeyesApi';
import { batchScrape } from './urlScraper';
import { aggregatePersonInfo } from './llmAggregate';

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
  
  try {
    // Update progress
    if (onProgress) onProgress({ stage: 'pimeyes', progress: 0, message: 'Starting PimEyes search...' });
    
    // Step 1: Get URLs from PimEyes using the image
    if (verbose) console.log(`\n=== Processing image ===`);
    
    const pimeyesResults = await imgToUrls(imageDataUrl);
    
    if (!pimeyesResults || pimeyesResults.length === 0) {
      console.error("Error: Failed to get results from PimEyes.");
      return null;
    }
    
    // Update progress
    if (onProgress) onProgress({ stage: 'pimeyes', progress: 100, message: 'PimEyes search completed' });
    if (onProgress) onProgress({ stage: 'scraping', progress: 0, message: 'Starting URL scraping...' });
    
    // Extract URLs from PimEyes results
    const urls = [];
    try {
      for (const result of pimeyesResults) {
        const url = result.sourceUrl;
        if (url && !urls.includes(url)) {
          urls.push(url);
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
    
    const scrapedResults = await batchScrape(pimeyesResults, delay);
    
    const successfulScrapes = scrapedResults.filter(result => result.success);
    if (verbose) {
      console.log(`Successfully scraped ${successfulScrapes.length}/${urls.length} URLs`);
    }
    
    // Update progress
    if (onProgress) onProgress({ stage: 'scraping', progress: 100, message: 'URL scraping completed' });
    if (onProgress) onProgress({ stage: 'aggregating', progress: 0, message: 'Aggregating person information...' });
    
    if (successfulScrapes.length === 0) {
      console.log("No successful URL scrapes.");
      return null;
    }
    
    // Step 3: Aggregate person information from scraped content
    if (verbose) console.log("\n=== Aggregating person information ===");
    
    const personInfo = await aggregatePersonInfo(successfulScrapes);
    
    // Update progress
    if (onProgress) onProgress({ stage: 'aggregating', progress: 100, message: 'Person information aggregated' });
    
    if (!personInfo) {
      console.log("Failed to aggregate person information.");
      return null;
    }
    
    // Add the original URLs to the result
    personInfo.sourceUrls = successfulScrapes.map(result => result.url);
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

export { processImage, processMultipleFaces };
