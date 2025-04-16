/**
 * Services index file
 * Exports all services for easy importing
 */

import { urlScraper, batchScrape } from './urlScraper';
import { 
  loginToPimeyes, 
  checkPremiumTokenStatus, 
  uploadImage, 
  searchFaces, 
  getSearchResults, 
  imgToUrls 
} from './pimeyesApi';
import { 
  aggregatePersonInfo, 
  analyzeMultiplePeople, 
  researchFace 
} from './llmAggregate';
import {
  processImage,
  processMultipleFaces
} from './faceResearch';

export {
  // URL Scraper
  urlScraper,
  batchScrape,
  
  // PimEyes API
  loginToPimeyes,
  checkPremiumTokenStatus,
  uploadImage,
  searchFaces,
  getSearchResults,
  imgToUrls,
  
  // LLM Aggregate
  aggregatePersonInfo,
  analyzeMultiplePeople,
  researchFace,
  
  // Face Research
  processImage,
  processMultipleFaces
};
