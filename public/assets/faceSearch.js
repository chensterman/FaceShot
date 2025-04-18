/**
 * PimEyes API Service for background script
 */

// Create a namespace to avoid global conflicts
// Initialize API objects
self.pimeyesApi = {};
self.faceCheckApi = {};

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
     * Main function to search for a face in an image using FaceCheck API
     * @param {string} imageDataUrl - Base64 encoded image data URL
     * @returns {Promise<Array>} - Array of results with score, url, and base64 image
     */
    self.faceCheckApi = {
      /**
       * Search for a face using the FaceCheck API
       * @param {string} imageDataUrl - Base64 encoded image data URL
       * @param {boolean} testingMode - Whether to use testing mode (no credits deducted)
       * @returns {Promise<Array>} - Array of results with score, url, and base64 image
       */
      searchByFace: async (imageDataUrl, testingMode = false) => {
        try {
          // Get API key from environment variables
          // This will be injected by the background script
          const apiKey = '__VITE_FACECHECK_API_KEY__';
          
          if (!apiKey || apiKey === '__VITE_FACECHECK_API_KEY__') {
            console.error('FaceCheck API key is required');
            return {
              error: true,
              message: 'FaceCheck API key is missing',
              results: []
            };
          }
          
          // Extract the base64 data from the data URL
          const base64Data = imageDataUrl.split(',')[1];
          
          // Step 1: Upload the image
          console.log('Uploading image to FaceCheck...');
          const uploadResponse = await uploadToFaceCheck(apiKey, base64Data);
          
          if (uploadResponse.error) {
            console.error(`Upload error: ${uploadResponse.error} (${uploadResponse.code})`);
            return {
              error: true,
              message: uploadResponse.error,
              code: uploadResponse.code,
              results: []
            };
          }
          
          const idSearch = uploadResponse.id_search;
          console.log(`${uploadResponse.message} id_search=${idSearch}`);
          
          // Step 2: Poll for search results
          console.log('Searching for face matches...');
          const searchResults = await pollSearchResults(apiKey, idSearch, testingMode);
          
          if (searchResults.error) {
            console.error(`Search error: ${searchResults.error} (${searchResults.code})`);
            return {
              error: true,
              message: searchResults.error,
              code: searchResults.code,
              results: []
            };
          }
          
          // Format the results to match the expected structure
          const formattedResults = searchResults.items.map(item => {
            // Create a proper data URL for the thumbnail
            // Check if the base64 string already has the data URL prefix
            let thumbnailUrl = item.base64;
            if (thumbnailUrl && !thumbnailUrl.startsWith('data:')) {
              thumbnailUrl = `data:image/jpeg;base64,${item.base64}`;
            }
            
            return {
              quality: item.score / 100, // Convert score from 0-100 to 0-1
              sourceUrl: item.url,
              thumbnailUrl: thumbnailUrl,
              score: item.score,
              base64: item.base64,
              source: 'facecheck' // Tag the source as FaceCheck
            };
          });
          
          return {
            error: false,
            results: formattedResults
          };
        } catch (error) {
          console.error(`Error in searchByFace: ${error.message}`);
          return {
            error: true,
            message: error.message,
            results: []
          };
        }
      }
    };
    
    /**
     * Upload an image to FaceCheck API
     * @param {string} apiKey - FaceCheck API key
     * @param {string} base64Image - Base64 encoded image data
     * @returns {Promise<Object>} - Upload response
     */
    const uploadToFaceCheck = async (apiKey, base64Image) => {
      try {
        const site = 'https://facecheck.id';
        const url = `${site}/api/upload_pic`;
        
        // Create a Blob from the base64 data
        const byteCharacters = atob(base64Image);
        const byteArrays = [];
        
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArrays.push(byteCharacters.charCodeAt(i));
        }
        
        const byteArray = new Uint8Array(byteArrays);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        
        // Create FormData
        const formData = new FormData();
        formData.append('images', blob, 'image.jpg');
        
        // Make the POST request
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': apiKey,
            'Accept': 'application/json'
          },
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Error uploading to FaceCheck: ${error.message}`);
        return { error: error.message, code: 'UPLOAD_ERROR' };
      }
    };
    
    /**
     * Poll for search results from FaceCheck API
     * @param {string} apiKey - FaceCheck API key
     * @param {string} idSearch - Search ID from upload response
     * @param {boolean} testingMode - Whether to use testing mode
     * @returns {Promise<Object>} - Search results
     */
    const pollSearchResults = async (apiKey, idSearch, testingMode) => {
      try {
        const site = 'https://facecheck.id';
        const url = `${site}/api/search`;
        const maxAttempts = 60; // Maximum number of polling attempts (60 seconds)
        let attempts = 0;
        
        // Prepare the request payload
        const payload = {
          id_search: idSearch,
          with_progress: true,
          status_only: false,
          demo: testingMode
        };
        
        // Poll for results
        while (attempts < maxAttempts) {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': apiKey,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.error) {
            return { error: data.error, code: data.code };
          }
          
          if (data.output) {
            return data.output;
          }
          
          console.log(`${data.message} progress: ${data.progress}%`);
          
          // Wait before polling again
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
        
        return { error: 'Polling timeout', code: 'TIMEOUT_ERROR' };
      } catch (error) {
        console.error(`Error polling FaceCheck results: ${error.message}`);
        return { error: error.message, code: 'POLLING_ERROR' };
      }
    };
    
    /**
     * Main function to search for a face in an image and get URLs where the face appears
     * Combines results from both PimEyes and FaceCheck APIs
     */
    self.pimeyesApi.imgToUrls = async (imageDataUrl) => {
      try {
        console.log('Starting concurrent face searches with PimEyes and FaceCheck...');
        
        // Run both API searches concurrently
        const [pimeyesPromise, faceCheckPromise] = [
          // Original PimEyes search flow
          (async () => {
            try {
              // Get email and password from environment variables
              const email = '__VITE_PIMEYES_EMAIL__';
              const password = '__VITE_PIMEYES_PASSWORD__';
              
              if (!email || !password || email === '__VITE_PIMEYES_EMAIL__' || password === '__VITE_PIMEYES_PASSWORD__') {
                console.warn('PimEyes credentials are missing');
                return { error: true, results: [] };
              }
              
              // Login to PimEyes
              console.log('Logging in to PimEyes...');
              await loginToPimeyes(email, password);
              
              // Check premium token status
              console.log('Checking premium token status...');
              await checkPremiumTokenStatus();
              
              // Upload the image
              console.log('Uploading image to PimEyes...');
              const faceIds = await uploadImage(imageDataUrl);
              
              if (!faceIds.length) {
                console.log('PimEyes upload failed or no faces detected.');
                return { error: true, results: [] };
              }
              
              // Search for faces
              console.log('Searching with PimEyes...');
              const { searchHash, apiUrl } = await searchFaces(faceIds);
              
              if (!searchHash || !apiUrl) {
                console.log('PimEyes search failed or missing required information.');
                return { error: true, results: [] };
              }
              
              // Get search results
              console.log('Getting PimEyes search results...');
              const results = await getSearchResults(apiUrl, searchHash);
              
              if (!results || !results.results) {
                console.log('No PimEyes results found.');
                return { error: true, results: [] };
              }
              
              // Add source tag to each result
              const taggedResults = results.results.map(result => ({
                ...result,
                source: 'pimeyes'
              }));
              
              return { error: false, results: taggedResults };
            } catch (error) {
              console.error(`Error in PimEyes search: ${error.message}`);
              return { error: true, results: [] };
            }
          })(),
          
          // FaceCheck search
          self.faceCheckApi.searchByFace(imageDataUrl, false)
        ];
        
        // Wait for both searches to complete
        const [pimeyesResult, faceCheckResult] = await Promise.allSettled([pimeyesPromise, faceCheckPromise]);
        
        // Extract results from each API
        const pimeyesResults = pimeyesResult.status === 'fulfilled' && !pimeyesResult.value.error
          ? pimeyesResult.value.results
          : [];
          
        const faceCheckResults = faceCheckResult.status === 'fulfilled' && !faceCheckResult.value.error
          ? faceCheckResult.value.results
          : [];
        
        // Log result counts
        console.log(`Found ${pimeyesResults.length} results from PimEyes and ${faceCheckResults.length} results from FaceCheck`);
        
        // Combine results, with FaceCheck results first (they're typically social media)
        const combinedResults = [...faceCheckResults, ...pimeyesResults];
        
        if (combinedResults.length === 0) {
          console.warn('No results found from either API');
        }
        
        return combinedResults;
      } catch (error) {
        console.error(`Error in combined face search: ${error.message}`);
        return [];
      }
    };
    
    console.log('Face search API services loaded successfully');
  } catch (error) {
    console.error('Failed to load PimEyes API service:', error);
  }
})();
