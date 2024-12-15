import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory
} from '../node_modules/@google/generative-ai/dist/index.mjs';

import { GOOGLE_API_KEY } from './config.js';

// Important! Do not expose your API in your extension code
const apiKey = GOOGLE_API_KEY;

let genAI = null;
let model = null;
let generationConfig = {
  temperature: 1
};

const inputPrompt = document.body.querySelector('#input-prompt');
const buttonPrompt = document.body.querySelector('#button-prompt');
const elementResponse = document.body.querySelector('#response');
const elementLoading = document.body.querySelector('#loading');
const elementError = document.body.querySelector('#error');
const sliderTemperature = document.body.querySelector('#temperature');
const labelTemperature = document.body.querySelector('#label-temperature');

function initModel(generationConfig) {
  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE
    }
  ];
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    safetySettings,
    generationConfig
  });
  return model;
}

async function runPrompt(prompt) {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (e) {
    console.log('Prompt failed');
    console.error(e);
    console.log('Prompt:', prompt);
    throw e;
  }
}

sliderTemperature.addEventListener('input', (event) => {
  labelTemperature.textContent = event.target.value;
  generationConfig.temperature = event.target.value;
});

inputPrompt.addEventListener('input', () => {
  if (inputPrompt.value.trim()) {
    buttonPrompt.removeAttribute('disabled');
  } else {
    buttonPrompt.setAttribute('disabled', '');
  }
});

buttonPrompt.addEventListener('click', async () => {
  const prompt = inputPrompt.value.trim();
  showLoading();
  try {
    const generationConfig = {
      temperature: sliderTemperature.value
    };
    initModel(generationConfig);
    const response = await runPrompt(prompt, generationConfig);
    showResponse(response);
  } catch (e) {
    showError(e);
  }
});

function showLoading() {
  hide(elementResponse);
  hide(elementError);
  show(elementLoading);
}

function showResponse(response) {
  hide(elementLoading);
  show(elementResponse);
  // Make sure to preserve line breaks in the response
  elementResponse.textContent = '';
  const paragraphs = response.split(/\r?\n/);
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    if (paragraph) {
      elementResponse.appendChild(document.createTextNode(paragraph));
    }
    // Don't add a new line after the final paragraph
    if (i < paragraphs.length - 1) {
      elementResponse.appendChild(document.createElement('BR'));
    }
  }
}

function showError(error) {
  show(elementError);
  hide(elementResponse);
  hide(elementLoading);
  elementError.textContent = error;
}

function show(element) {
  element.removeAttribute('hidden');
}

function hide(element) {
  element.setAttribute('hidden', '');
}

// Check if we're on a YouTube video page and fetch transcripts if available
let currentUrl; // Variable to store the URL
let videoId;
let videoTranscripts;

function retrieveTranscript() {
    const YT_INITIAL_PLAYER_RESPONSE_RE =
        /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+(?:meta|head)|<\/script|\n)/;
    let player = window.ytInitialPlayerResponse;
    if (!player || videoId !== player.videoDetails.videoId) {
        fetch('https://www.youtube.com/watch?v=' + videoId)
            .then(function (response) {
                return response.text();
            })
            .then(function (body) {
                const playerResponse = body.match(YT_INITIAL_PLAYER_RESPONSE_RE);
                if (!playerResponse) {
                    console.warn('Unable to parse playerResponse');
                    return;
                }
                player = JSON.parse(playerResponse[1]);
                const metadata = {
                    title: player.videoDetails.title,
                    duration: player.videoDetails.lengthSeconds,
                    author: player.videoDetails.author,
                    views: player.videoDetails.viewCount,
                };
                // Get the tracks
                const tracks = player.captions.playerCaptionsTracklistRenderer.captionTracks;

                // Get the transcript
                fetch(tracks[0].baseUrl + '&fmt=json3')
                    .then(function (response) {
                        return response.json();
                    })
                    .then(function (transcript) {
                        const result = { transcript: transcript, metadata: metadata };

                        const parsedTranscript = transcript.events
                            // Remove invalid segments
                            .filter(function (x) {
                                return x.segs;
                            })
                            // Concatenate into single long string
                            .map(function (x) {
                                return x.segs
                                    .map(function (y) {
                                        return y.utf8;
                                    })
                                    .join(' ');
                            })
                            .join(' ')
                            // Remove invalid characters
                            .replace(/[\u200B-\u200D\uFEFF]/g, '')
                            // Replace any whitespace with a single space
                            .replace(/\s+/g, ' ');

                        console.log('Extracted Transcript:', parsedTranscript);
                        videoTranscripts = parsedTranscript;

                        // Display transcript in the extension UI
                        const responseDiv = document.getElementById('response');
                        responseDiv.textContent = `Transcript: ${parsedTranscript}`;
                        responseDiv.removeAttribute('hidden');
                    });
            });
    }
}

// Find the videoId of the YouTube video on the current page
chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0]; // Get the active tab
    if (currentTab && currentTab.url) {
        currentUrl = currentTab.url; // Save the URL in the variable
        const urlObj = new URL(currentUrl);
        videoId = urlObj.searchParams.get('v');

        // Call retrieveTranscript automatically once videoId is set
        if (videoId) {
            retrieveTranscript(); // Call the function
        } else {
            console.warn("No video ID found in the URL.");
        }
    } else {
        console.log("No active tab found or URL is unavailable.");
    }
});
