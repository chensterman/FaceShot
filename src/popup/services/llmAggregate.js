/**
 * LLM Aggregation Service
 * Analyzes scraped content using OpenAI API to extract structured information about a person
 */

/**
 * Analyze scraped content using ChatGPT API to extract structured information about a person
 * 
 * @param {Array} scrapedResults - Array of objects with keys 'url', 'success', and 'content'
 * @returns {Promise<Object>} - Object containing structured information about the person
 */
const aggregatePersonInfo = async (scrapedResults) => {
  try {
    // Get OpenAI API key from environment variables
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error("Error: OpenAI API key not found. Please set the OPENAI_API_KEY environment variable.");
      return null;
    }
    
    // Filter for successful scrapes only
    const successfulScrapes = scrapedResults.filter(result => result.success);
    
    if (!successfulScrapes.length) {
      console.log("No successful scrapes to analyze");
      return null;
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
      return null;
    }
    
    return {
      name: resultJson.name,
      description: resultJson.description
    };
  } catch (error) {
    console.error(`Error calling ChatGPT API: ${error.message}`);
    return null;
  }
};

// /**
//  * Process multiple sets of scraped results, each potentially about a different person
//  * 
//  * @param {Array} batchResults - Array of arrays of scraped results
//  * @returns {Promise<Array>} - Array of objects with structured information about each person
//  */
// const analyzeMultiplePeople = async (batchResults) => {
//   const results = [];
  
//   for (let i = 0; i < batchResults.length; i++) {
//     console.log(`Analyzing person ${i+1}/${batchResults.length}...`);
//     const personResults = batchResults[i];
//     const personInfo = await aggregatePersonInfo(personResults);
    
//     if (personInfo) {
//       // Add the original URLs to the result
//       const urls = personResults
//         .filter(result => result.success)
//         .map(result => result.url);
      
//       personInfo.sourceUrls = urls;
//       results.push(personInfo);
//     }
//   }
  
//   return results;
// };

export { aggregatePersonInfo };
