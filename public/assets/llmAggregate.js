/**
 * LLM Aggregation Service for background script
 */

// Create a namespace to avoid global conflicts
self.llmAggregate = {};

// Define the LLM aggregator functions
(async () => {
  try {
    /**
     * Analyze scraped content using ChatGPT API to extract structured information about a person
     */
    self.llmAggregate.aggregatePersonInfo = async (scrapedResults) => {
      console.log('LLM Aggregator: Aggregating person information...');
      
      try {
        // Check if scrapedResults is defined
        if (!scrapedResults || !Array.isArray(scrapedResults)) {
          console.error('Invalid scraped results:', scrapedResults);
          return {
            name: "Unknown",
            description: "Could not determine information due to missing or invalid data."
          };
        }
        
        // Get OpenAI API key from environment variables
        // This will be injected by the background script
        const apiKey = '__VITE_OPENAI_API_KEY__';
        
        if (!apiKey || apiKey === '__VITE_OPENAI_API_KEY__') {
          console.error("Error: OpenAI API key not found.");
          return {
            name: "Unknown",
            description: "API key not available for analysis."
          };
        }
        
        // Filter for successful scrapes only
        const successfulScrapes = scrapedResults.filter(result => result && result.success);
        
        if (!successfulScrapes.length) {
          console.log("No successful scrapes to analyze");
          return {
            name: "Unknown",
            description: "No valid sources found to analyze."
          };
        }
        
        // Combine content from all successful scrapes
        let combinedContent = "";
        for (const scrape of successfulScrapes) {
          const content = scrape.content || '';
          const url = scrape.url || '';
          
          if (content && typeof content === 'string') {
            // Add URL as context and limit content length to avoid token limits
            const contentSnippet = content.length > 5000 ? content.substring(0, 5000) : content;
            combinedContent += `\n\nContent from ${url}:\n${contentSnippet}`;
          }
        }
        
        // Prepare prompt for ChatGPT
        const systemPrompt = `
        You are an AI assistant tasked with extracting structured information about a person from various web sources.
        Analyze the provided content and extract the following information about the person of interest:
        1. Name: The full name of the person
        2. Description: A concise description of who this person is, their background, and notable information
        
        All of the web sources you are given are likely to be about the same person. There may be some noise. Do your best to isolate the information about the person of interest.
        If you cannot determine certain information with confidence, indicate this with 'Unknown'.
        Format your response as a JSON object with the keys 'name' and 'description'.
        `;
        
        const userPrompt = `Here is content from various web pages about a person of interest. Please extract structured information:\n\n${combinedContent}`;
        
        // Call ChatGPT API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {role: "system", content: systemPrompt},
              {role: "user", content: userPrompt}
            ],
            response_format: {type: "json_object"},
            temperature: 0.0
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Extract and parse the response
        const resultText = data.choices[0].message.content;
        const resultJson = JSON.parse(resultText);
        
        // Ensure the expected keys are present
        if (!resultJson.name || !resultJson.description) {
          console.error("Error: API response missing required fields");
          return {
            name: "Unknown",
            description: "Error processing the information."
          };
        }
        
        return {
          name: resultJson.name,
          description: resultJson.description
        };
      } catch (error) {
        console.error(`Error in aggregatePersonInfo: ${error.message}`);
        return {
          name: "Unknown",
          description: `Error during analysis: ${error.message}`
        };
      }
    };
    
    console.log('LLM Aggregator service loaded successfully');
  } catch (error) {
    console.error('Failed to load LLM Aggregator service:', error);
  }
})();
