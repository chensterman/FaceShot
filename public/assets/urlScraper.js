/**
 * URL Scraper Service for background script
 */

// Create a namespace to avoid global conflicts
self.urlScraper = {};

// Define the URL scraper functions
(async () => {
  try {
    // Utility function to add delay
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    /**
     * Scrape the content of a URL and convert it to markdown format
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
        
        // Service workers don't have access to DOMParser, so we'll use a simple regex approach
        // Extract title using regex
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'Untitled Page';
        
        // Remove script, style, and other unwanted tags using regex
        let cleanedHtml = html;
        const unwantedTags = ['script', 'style', 'iframe', 'noscript', 'svg', 'head', 'meta'];
        
        unwantedTags.forEach(tag => {
          const regex = new RegExp(`<${tag}[^>]*>[\s\S]*?<\/${tag}>`, 'gi');
          cleanedHtml = cleanedHtml.replace(regex, '');
        });
        
        // Remove HTML tags and decode entities
        const content = cleanedHtml
          .replace(/<[^>]*>/g, ' ') // Replace tags with spaces
          .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
          .replace(/&lt;/g, '<') // Replace less than
          .replace(/&gt;/g, '>') // Replace greater than
          .replace(/&amp;/g, '&') // Replace ampersand
          .replace(/&quot;/g, '"') // Replace quotes
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim();
        
        // Check if content is too short
        if (content.length < minContentLength) {
          console.log("Content too short, consider using an external API service");
        }
        
        return { success: true, content, title };
      } catch (error) {
        console.error(`Error scraping URL: ${error.message}`);
        return { success: false, error: error.message };
      }
    };
    
    /**
     * Scrape multiple URLs and convert them to markdown format
     * Limited to a maximum of 5 URLs and excludes major social media sites
     */
    self.urlScraper.batchScrape = async (urls, delay = 0.1) => {
      console.log('URL Scraper: Scraping URLs...', urls);
      
      try {
        const results = [];
        
        // List of social media domains to exclude
        const socialMediaDomains = [
          'linkedin.com', 'instagram.com', 'twitter.com', 'x.com',
          'tiktok.com', 'facebook.com', 'fb.com', 'youtube.com',
          'pinterest.com', 'reddit.com', 'snapchat.com', 'tumblr.com',
          'threads.net', 'whatsapp.com', 'telegram.org', 'discord.com',
          'medium.com', 'quora.com', 'flickr.com', 'vimeo.com'
        ];
        
        // Filter out social media URLs
        const filteredUrls = urls.filter(item => {
          const sourceUrl = typeof item === 'string' ? item : (item.sourceUrl || '');
          if (!sourceUrl) return false;
          
          try {
            const urlObj = new URL(sourceUrl);
            const domain = urlObj.hostname.toLowerCase();
            
            // Check if the domain or any of its parts match social media domains
            return !socialMediaDomains.some(socialDomain => 
              domain === socialDomain || domain.endsWith('.' + socialDomain)
            );
          } catch (e) {
            return false; // Invalid URL
          }
        });
        
        console.log(`Filtered ${urls.length - filteredUrls.length} social media URLs`);
        
        // Limit to maximum 5 URLs
        const limitedUrls = filteredUrls.slice(0, 5);
        console.log(`Processing ${limitedUrls.length} URLs (max 5)`);
        
        // Process each URL
        for (const item of limitedUrls) {
          // Handle both string URLs and objects with sourceUrl property
          const sourceUrl = typeof item === 'string' ? item : (item.sourceUrl || '');
          
          if (!sourceUrl) {
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
      } catch (error) {
        console.error(`Error in batchScrape: ${error.message}`);
        return [];
      }
    };
    
    console.log('URL Scraper service loaded successfully');
  } catch (error) {
    console.error('Failed to load URL Scraper service:', error);
  }
})();
