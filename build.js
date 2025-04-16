/**
 * Build script for FaceShot
 * Injects environment variables into the manifest.json file
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Build the extension using Vite
const { execSync } = require('child_process');
console.log('Building extension with Vite...');
execSync('vite build', { stdio: 'inherit' });

// Copy static files
console.log('Copying static files...');
execSync('cp -r src/background dist/background', { stdio: 'inherit' });
execSync('cp -r src/content dist/content', { stdio: 'inherit' });
execSync('cp src/manifest.json dist/', { stdio: 'inherit' });
execSync('cp public/icon.png dist/', { stdio: 'inherit' });

// Create assets directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'dist', 'assets'))) {
  fs.mkdirSync(path.join(__dirname, 'dist', 'assets'), { recursive: true });
}

// Copy asset files
execSync('cp -r public/assets/* dist/assets/', { stdio: 'inherit' });

// Read and process the background script to inject environment variables
console.log('Injecting environment variables into background.js...');
const backgroundPath = path.join(__dirname, 'dist', 'background', 'background.js');
let backgroundContent = fs.readFileSync(backgroundPath, 'utf8');

// Replace placeholder values with actual environment variables
backgroundContent = backgroundContent.replace('__VITE_OPENAI_API_KEY__', process.env.VITE_OPENAI_API_KEY || '');
backgroundContent = backgroundContent.replace('__VITE_PIMEYES_EMAIL__', process.env.VITE_PIMEYES_EMAIL || '');
backgroundContent = backgroundContent.replace('__VITE_PIMEYES_PASSWORD__', process.env.VITE_PIMEYES_PASSWORD || '');

// Write the updated background.js file
fs.writeFileSync(backgroundPath, backgroundContent);

// Inject environment variables into asset files
console.log('Injecting environment variables into asset files...');

// Process pimeyesApi.js
const pimeyesApiPath = path.join(__dirname, 'dist', 'assets', 'pimeyesApi.js');
if (fs.existsSync(pimeyesApiPath)) {
  let pimeyesApiContent = fs.readFileSync(pimeyesApiPath, 'utf8');
  pimeyesApiContent = pimeyesApiContent.replace('__VITE_PIMEYES_EMAIL__', process.env.VITE_PIMEYES_EMAIL || '');
  pimeyesApiContent = pimeyesApiContent.replace('__VITE_PIMEYES_PASSWORD__', process.env.VITE_PIMEYES_PASSWORD || '');
  fs.writeFileSync(pimeyesApiPath, pimeyesApiContent);
}

// Process llmAggregate.js
const llmAggregatePath = path.join(__dirname, 'dist', 'assets', 'llmAggregate.js');
if (fs.existsSync(llmAggregatePath)) {
  let llmAggregateContent = fs.readFileSync(llmAggregatePath, 'utf8');
  llmAggregateContent = llmAggregateContent.replace('__VITE_OPENAI_API_KEY__', process.env.VITE_OPENAI_API_KEY || '');
  fs.writeFileSync(llmAggregatePath, llmAggregateContent);
}

console.log('Environment variables injected successfully!');

console.log('Build completed successfully!');
