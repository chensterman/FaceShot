# FaceShot Chrome Extension

A Chrome extension for screen capture and image processing with real-time personalization capabilities.

## Technical Stack

### Frontend Framework
- **React**: Used for building the popup UI interface
- **CSS**: Custom styling for the extension components

### Build Tools
- **Vite**: Modern build tool that provides fast development and optimized production builds
- **Node.js**: JavaScript runtime environment

## Project Structure

```
FaceShot/
├── public/                  # Static assets
│   └── icon.png             # Extension icon
├── src/
│   ├── background/          # Background scripts
│   │   └── background.js    # Handles extension initialization and state management
│   ├── content/             # Content scripts
│   │   └── content.js       # Injected into web pages for screen capture
│   ├── popup/               # Popup UI
│   │   ├── App.jsx          # Main popup component
│   │   ├── index.css        # Popup styles
│   │   └── main.jsx         # Popup entry point
│   └── manifest.json        # Extension configuration
├── package.json             # Project dependencies and scripts
└── vite.config.js           # Vite configuration
```

## How Vite is Used

This project uses Vite for several key advantages:

1. **Fast Development**: Vite provides an extremely fast development server with hot module replacement
2. **Optimized Builds**: Produces highly optimized production builds
3. **JSX Support**: Built-in support for React JSX without additional configuration
4. **CSS Processing**: Handles CSS imports directly in JavaScript files

The build process is configured to:
- Build the React popup UI
- Copy the background and content scripts to the distribution folder
- Copy the manifest.json and icon to the distribution folder

## Chrome Extension Architecture

FaceShot follows the standard Chrome extension architecture with three main components:

1. **Popup (React)**: The user interface that appears when clicking the extension icon
2. **Background Script**: Manages the extension's state and handles communication between components
3. **Content Script**: Injected into web pages to capture the screen and process frames

Communication between these components is handled using Chrome's messaging API.