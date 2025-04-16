/**
 * URL Scraper Service
 * Converts URLs to markdown content for analysis
 */

// Utility function to add delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Scrape the content of a URL and convert it to markdown format
 * 
 * @param {string} url - The URL to scrape
 * @param {number} delay - Delay in seconds between requests to avoid rate limiting
 * @param {number} minContentLength - Minimum length of markdown content before trying alternative methods
 * @returns {Promise<Object>} - Object containing success status and markdown content or error message
 */
const urlScraper = async (url, delay = 0.1, minContentLength = 50) => {
  try {
    // Add delay to avoid rate limiting
    await sleep(delay * 1000);
    
    // Send request to get the HTML content with realistic browser headers
    const headers = {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Cache-Control": "max-age=0"
    };

    // In a Chrome extension, we need to use fetch instead of direct requests
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Use a simple HTML to text conversion since we can't use readability directly in browser
    // This is a simplified version - for production, consider using a proper HTML to markdown library
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Get the title
    const title = doc.title;
    
    // Remove unwanted elements
    ['script', 'style', 'iframe', 'noscript'].forEach(tag => {
      doc.querySelectorAll(tag).forEach(el => el.remove());
    });
    
    // Extract main content - simplified approach
    const content = doc.body.textContent.trim();
    
    // For a more sophisticated approach, you might want to use a library like Turndown
    // which would need to be included as a dependency
    
    // Check if content is too short
    if (content.length < minContentLength) {
      console.log("Content too short, consider using an external API service");
      // In production, you would integrate with a service like Firecrawl here
    }
    
    return { success: true, content, title };
  } catch (error) {
    console.error(`Error scraping URL: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Scrape multiple URLs and convert them to markdown format
 * 
 * @param {Array} data - Array of data objects containing URLs and metadata
 * @param {number} delay - Delay in seconds between requests
 * @returns {Promise<Array>} - Array of objects with URL, success status, and content
 */
const batchScrape = async (data, delay = 0.1) => {
  const results = [];
  
  for (const item of data) {
    // Skip items with low likeness score
    const likenessScore = item.quality || 0;
    if (likenessScore < 0.8) {
      continue;
    }
    
    // Check if sourceUrl exists and is valid
    const sourceUrl = item.sourceUrl;
    if (!sourceUrl || typeof sourceUrl !== 'string') {
      continue;
    }
    
    // Validate URL format
    if (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) {
      continue;
    }
    
    // Check URL accessibility with error handling
    try {
      const response = await fetch(sourceUrl, { 
        method: 'HEAD',
        timeout: 2000
      });
      
      if (!response.ok) {
        continue;
      }
    } catch (error) {
      console.error(`Error checking URL accessibility: ${error.message}`);
      continue;
    }
    
    const result = await urlScraper(sourceUrl, delay);
    results.push({
      url: sourceUrl,
      success: result.success,
      content: result.success ? result.content : result.error
    });
  }
  
  return results;
};

export { urlScraper, batchScrape };
