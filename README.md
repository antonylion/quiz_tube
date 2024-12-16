# QuizTube

A Google Chrome extension to test yourself on the YouTube video you are watching.

## Sample of the extension

![sample](images/sample.png)

## Running this extension from source code

1. Clone this repository.
2. cd into it and run:
   ```sh
   npm install
   ```
3. [Retrieve an API key](https://ai.google.dev/gemini-api/docs/api-key) and run the following command (replace 'your_api_key' with your actual key):
   ```sh
   echo "export const GOOGLE_API_KEY = 'your_api_key';" > sidepanel/config.js
   ```
4. Compile the JS bundle for the sidepanel implementation by running:
   ```sh
   npm run build
   ```
5. Load this directory in Chrome as an [unpacked extension](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked).
6. Click the extension icon.
7. Start test yourself! 🤓
