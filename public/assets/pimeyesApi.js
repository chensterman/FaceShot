/**
 * PimEyes API Service for background script
 */

// Create a namespace to avoid global conflicts
self.pimeyesApi = {};

// Define all the PimEyes API functions
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
        
        // Make the POST request for login
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          credentials: 'include' // This is important to receive and send cookies
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Login successful:', data);
        
        return data;
      } catch (error) {
        console.error(`Error during login: ${error.message}`);
        return null;
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
     * Main function to search for a face in an image and get URLs where the face appears
     */
    self.pimeyesApi.imgToUrls = async (imageDataUrl) => {
      try {
        // Get email and password from environment variables
        // These will be injected by the background script
        const email = '__VITE_PIMEYES_EMAIL__';
        const password = '__VITE_PIMEYES_PASSWORD__';
        
        if (!email || !password || email === '__VITE_PIMEYES_EMAIL__' || password === '__VITE_PIMEYES_PASSWORD__') {
          console.error('PimEyes credentials are required');
          return [
            { sourceUrl: 'https://example.com/missing-credentials-1', thumbnailUrl: 'https://example.com/thumb1.jpg' },
            { sourceUrl: 'https://example.com/missing-credentials-2', thumbnailUrl: 'https://example.com/thumb2.jpg' }
          ];
        }
        
        // Login to PimEyes
        console.log('Logging in to PimEyes...');
        await loginToPimeyes(email, password);
        
        // Check premium token status
        console.log('Checking premium token status...');
        await checkPremiumTokenStatus();
        
        // Upload the image
        console.log('Uploading image...');
        const faceIds = await uploadImage(imageDataUrl);
        console.log(`Extracted ${faceIds.length} face IDs:`, faceIds);
        
        if (!faceIds.length) {
          console.log('Upload failed or no faces detected.');
          return [];
        }
        
        // Search for faces
        console.log('Searching for faces...');
        const { searchHash, apiUrl } = await searchFaces(faceIds);
        console.log('Search hash:', searchHash);
        console.log('API URL:', apiUrl);
        
        if (!searchHash || !apiUrl) {
          console.log('Search failed or missing required information.');
          return [];
        }
        
        // Get search results
        console.log('Getting search results...');
        const results = await getSearchResults(apiUrl, searchHash);
        
        if (!results || !results.results) {
          console.log('No results found.');
          return [];
        }
        
        return results.results;
      } catch (error) {
        console.error(`Error in imgToUrls: ${error.message}`);
        return [];
      }
    };
    
    console.log('PimEyes API service loaded successfully');
  } catch (error) {
    console.error('Failed to load PimEyes API service:', error);
  }
})();
