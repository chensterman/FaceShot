/**
 * URL Scraper Service
 * Converts URLs to markdown content for analysis
 */

// Utility function to add delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Firecrawl API client for enhanced web scraping
 * Requires an API key from Firecrawl (https://firecrawl.dev)
 */
class FirecrawlClient {
  /**
   * Initialize the Firecrawl client
   * @param {string} apiKey - Your Firecrawl API key
   */
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.firecrawl.dev/v1';
  }

  /**
   * Scrape a URL using the Firecrawl API
   * @param {string} url - The URL to scrape
   * @param {Object} params - Additional parameters for the API
   * @returns {Promise<Object>} - The scraped content
   */
  async scrapeUrl(url, params = {}) {
    try {
      const defaultParams = {
        formats: ['markdown'],
        excludeTags: ['img', 'picture', 'svg', 'canvas', 'figure', 'iframe', 'video', 'audio', 'source', 'track']
      };

      const requestParams = { ...defaultParams, ...params };
      
      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          url,
          ...requestParams
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Firecrawl API error: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Firecrawl scraping error: ${error.message}`);
      throw error;
    }
  }
}

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
      console.log("Content too short, attempting to use Firecrawl API");
      
      // Get API key from Chrome storage or environment
      // For Chrome extension, you would typically store this in chrome.storage.local
      // For this example, we'll check if it's available in the window object or environment
      const apiKey = window.FIRECRAWL_API_KEY || process.env.FIRECRAWL_API_KEY;
      
      if (apiKey) {
        try {
          // Initialize Firecrawl client
          const firecrawlClient = new FirecrawlClient(apiKey);
          
          // Call Firecrawl API
          const firecrawlResponse = await firecrawlClient.scrapeUrl(url, {
            formats: ['markdown'],
            excludeTags: ['img', 'picture', 'svg', 'canvas', 'figure', 'iframe', 'video', 'audio', 'source', 'track']
          });
          
          // Check if we got markdown content back
          if (firecrawlResponse.markdown) {
            const firecrawlContent = firecrawlResponse.markdown;
            
            // Use Firecrawl content if it's longer than what we extracted
            if (firecrawlContent.length > content.length) {
              console.log("Using enhanced content from Firecrawl API");
              return { success: true, content: firecrawlContent, title };
            }
          }
        } catch (firecrawlError) {
          console.error(`Error using Firecrawl API: ${firecrawlError.message}`);
          // Continue with original content if Firecrawl fails
        }
      } else {
        console.warn("Firecrawl API key not found. Set FIRECRAWL_API_KEY in environment or storage.");
      }
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

export { batchScrape, urlScraper, FirecrawlClient };
