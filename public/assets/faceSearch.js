/**
 * PimEyes API Service for background script
 */

// Create a namespace to avoid global conflicts
self.pimeyesApi = {};

// Define all the API functions
(async () => {
  try {
    /**
     * Login to PimEyes using email and password
     */
    const loginToPimeyes = async (email, password) => {
      try {
        const url = "https://pimeyes.com/api/login/login-form";
        
        // Prepare the login payload
        const payload = {
          email,
          password,
          remember: true
        };
        
        console.log(`Attempting to login with email: ${email.substring(0, 3)}...`);
        
        // Make the POST request for login
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          body: JSON.stringify(payload),
          credentials: 'include' // This is important to receive and send cookies
        });
        
        // Even if response is not OK, try to parse the response body for more info
        const responseText = await response.text();
        let data;
        
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.log('Response is not JSON:', responseText.substring(0, 100));
          data = { message: responseText.substring(0, 100) };
        }
        
        if (!response.ok) {
          console.error(`Login failed with status: ${response.status}`, data);
          throw new Error(`HTTP error! status: ${response.status}, message: ${data.message || 'Unknown error'}`);
        }
        
        console.log('Login successful:', data);
        
        return data;
      } catch (error) {
        console.error(`Error during login: ${error.message}`);
        throw error; // Re-throw to handle in the calling function
      }
    };

    /**
     * Check the status of the premium token from PimEyes API
     */
    const checkPremiumTokenStatus = async () => {
      try {
        const url = "https://pimeyes.com/api/premium-token/status";
        
        // Make the GET request
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include' // Include cookies
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Premium token status:', data);
        
        return data;
      } catch (error) {
        console.error(`Error checking premium token status: ${error.message}`);
        return null;
      }
    };

    /**
     * Upload an image to PimEyes API
     */
    const uploadImage = async (imageDataUrl) => {
      try {
        // API endpoint
        const url = "https://pimeyes.com/api/upload/file";
        
        // Prepare the JSON payload with the base64 encoded image
        const payload = {
          image: imageDataUrl
        };
        
        // Make the POST request
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          credentials: 'include' // Include cookies
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Upload successful:', data);
        
        // Extract face IDs from the response
        const faceIds = [];
        if (data.faces && Array.isArray(data.faces)) {
          for (const face of data.faces) {
            if (face.id) {
              faceIds.push(face.id);
            }
          }
        } else {
          console.log("No face IDs found in response");
        }
        
        return faceIds;
      } catch (error) {
        console.error(`Error uploading image: ${error.message}`);
        return [];
      }
    };

    /**
     * Search for faces using the PimEyes search API
     */
    const searchFaces = async (faceIds, searchType = "PREMIUM_SEARCH", timeRange = "any") => {
      try {
        const url = "https://pimeyes.com/api/search/new";
        
        // Prepare the JSON payload with face IDs
        const payload = {
          faces: faceIds,
          time: timeRange,
          type: searchType
        };
        
        // Make the POST request
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          credentials: 'include' // Include cookies
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Search initiated:', data);
        
        // Extract searchHash and apiUrl
        const searchHash = data.searchHash;
        const apiUrl = data.apiUrl;
        
        return { searchHash, apiUrl };
      } catch (error) {
        console.error(`Error searching faces: ${error.message}`);
        return { searchHash: null, apiUrl: null };
      }
    };

    /**
     * Get search results using the API URL and search hash
     */
    const getSearchResults = async (apiUrl, searchHash) => {
      try {
        // Prepare the payload with the search hash
        const payload = {
          hash: searchHash,
          limit: 250,
          offset: 0,
          resultsCategory: null,
          retryCount: 0
        };
        
        // Make the POST request to get search results
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          credentials: 'include' // Include cookies
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Search results retrieved:', data);
        
        return data;
      } catch (error) {
        console.error(`Error getting search results: ${error.message}`);
        return null;
      }
    };

    /**
     * Main function to search for faces in images and get URLs where the faces appear
     * @param {string|string[]} imageDataUrls - Single image data URL or array of image data URLs
     * @returns {Promise<Object>} - Object with error flag and results array
     */
    self.pimeyesApi.imgToUrls = async (imageDataUrls) => {
      try {
        console.log('Starting PimEyes face search...');
        
        // Get email and password from environment variables
        const email = '__VITE_PIMEYES_EMAIL__';
        const password = '__VITE_PIMEYES_PASSWORD__';
        
        if (!email || !password || email === '__VITE_PIMEYES_EMAIL__' || password === '__VITE_PIMEYES_PASSWORD__') {
          console.warn('PimEyes credentials are missing');
          return { error: true, results: [], errorMessage: 'PimEyes credentials are missing' };
        }
        
        // Login to PimEyes
        console.log('Logging in to PimEyes...');
        try {
          await loginToPimeyes(email, password);
        } catch (loginError) {
          console.error('Login failed:', loginError.message);
          return { error: true, results: [], errorMessage: `Login failed: ${loginError.message}` };
        }
        
        // Check premium token status
        console.log('Checking premium token status...');
        await checkPremiumTokenStatus();
        
        // Handle single image or array of images
        const images = Array.isArray(imageDataUrls) ? imageDataUrls : [imageDataUrls];
        console.log(`Processing ${images.length} images with PimEyes...`);
        
        // Collect all face IDs from all images
        let allFaceIds = [];
        
        // Upload each image and collect face IDs
        for (let i = 0; i < images.length; i++) {
          const imageDataUrl = images[i];
          console.log(`Uploading image ${i+1}/${images.length} to PimEyes...`);
          const faceIds = await uploadImage(imageDataUrl);
          
          if (faceIds.length) {
            console.log(`Found ${faceIds.length} faces in image ${i+1}`);
            allFaceIds = [...allFaceIds, ...faceIds];
          } else {
            console.log(`No faces detected in image ${i+1}`);
          }
        }
        
        if (!allFaceIds.length) {
          console.log('PimEyes upload failed or no faces detected in any images.');
          return { error: true, results: [], errorMessage: 'No faces detected in any of the images' };
        }
        
        // Search for all faces at once
        console.log(`Searching with PimEyes for ${allFaceIds.length} total faces...`);
        const { searchHash, apiUrl } = await searchFaces(allFaceIds);
        
        if (!searchHash || !apiUrl) {
          console.log('PimEyes search failed or missing required information.');
          return { error: true, results: [], errorMessage: 'Failed to initiate search' };
        }
        
        // Get search results
        console.log('Getting PimEyes search results...');
        const results = await getSearchResults(apiUrl, searchHash);
        
        if (!results) {
          console.log('No PimEyes results object returned.');
          return { error: true, results: [], errorMessage: 'Failed to get search results' };
        }
        
        // Safely extract results array
        let resultsList = [];
        if (results.results && Array.isArray(results.results)) {
          resultsList = results.results;
          console.log(`Found ${resultsList.length} results in the results array`);
        } else {
          console.log('Results object does not contain a valid results array:', results);
          // Return empty results instead of error
          return { error: false, results: [] };
        }
        
        // Add source tag to each result
        const taggedResults = resultsList.map(result => ({
          ...result,
          source: 'pimeyes'
        }));
        
        console.log(`Found ${taggedResults.length} results from PimEyes`);
        
        if (taggedResults.length === 0) {
          console.warn('No results found from PimEyes');
        }
        
        return { error: false, results: taggedResults };
      } catch (error) {
        console.error(`Error in PimEyes face search: ${error.message}`);
        return { error: true, results: [], errorMessage: error.message };
      }
    };
    
    console.log('PimEyes API service loaded successfully');
  } catch (error) {
    console.error('Failed to load PimEyes API service:', error);
  }
})();
