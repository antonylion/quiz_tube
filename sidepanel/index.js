import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory
} from '../node_modules/@google/generative-ai/dist/index.mjs';

import { GOOGLE_API_KEY } from './config.js';

const apiKey = GOOGLE_API_KEY;

// Initialize global variables
let genAI = null;
let model = null;
const generationConfig = {
  temperature: 0.7 // Adjusted for quiz question generation
};

// DOM Elements
const transcriptMessage = document.getElementById('transcript-message');
const questionContainer = document.getElementById('question-container');
const questionElement = document.getElementById('question');
const answersElement = document.getElementById('answers');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');

// Initialize AI model
function initModel() {
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
}

// Retrieve transcript from the current YouTube video
async function retrieveTranscript(videoId) {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const body = await response.text();

    const YT_INITIAL_PLAYER_RESPONSE_RE =
      /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+(?:meta|head)|<\/script|\n)/;
    const playerResponseMatch = body.match(YT_INITIAL_PLAYER_RESPONSE_RE);

    if (!playerResponseMatch) {
      throw new Error('Unable to retrieve transcript.');
    }

    const player = JSON.parse(playerResponseMatch[1]);
    const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!tracks || tracks.length === 0) {
      throw new Error('No transcripts available for this video.');
    }

    const transcriptUrl = tracks[0].baseUrl + '&fmt=json3';
    const transcriptResponse = await fetch(transcriptUrl);
    const transcriptData = await transcriptResponse.json();

    const transcriptText = transcriptData.events
      .filter((event) => event.segs)
      .map((event) =>
        event.segs.map((seg) => seg.utf8).join('')
      )
      .join(' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ');

    return transcriptText;
  } catch (error) {
    console.error('Error retrieving transcript:', error);
    throw error;
  }
}

// Generate a quiz question based on the transcript
async function generateQuizQuestion(transcript) {
  try {
    const prompt = `
      Based on the following text, create a multiple-choice question with four possible answers (one correct):
      Text: "${transcript}"
    `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating quiz question:', error);
    throw error;
  }
}

// Display the quiz question and answers
function displayQuiz(questionText) {
  const [question, ...answers] = questionText.split('\n').filter((line) => line.trim());
  if (answers.length < 4) {
    throw new Error('Insufficient answers generated.');
  }

  questionElement.textContent = question;
  answersElement.innerHTML = ''; // Clear existing answers

  answers.forEach((answer, index) => {
    const li = document.createElement('li');
    li.textContent = answer;
    answersElement.appendChild(li);

    li.addEventListener('click', () => {
      alert(index === 0 ? 'Correct!' : 'Wrong answer!');
    });
  });

  questionContainer.removeAttribute('hidden');
}

// Main function: Orchestrates transcript retrieval and quiz generation
async function main() {
  const queryOptions = { active: true, currentWindow: true };

  chrome.tabs.query(queryOptions, async (tabs) => {
    const currentTab = tabs[0];
    if (!currentTab || !currentTab.url) {
      console.error('No active tab or URL available.');
      return;
    }

    try {
      showLoading();
      const url = new URL(currentTab.url);
      const videoId = url.searchParams.get('v');

      if (!videoId) {
        throw new Error('No video ID found in the URL.');
      }

      const transcript = await retrieveTranscript(videoId);
      const quizQuestion = await generateQuizQuestion(transcript);
      displayQuiz(quizQuestion);
    } catch (error) {
      showError(error.message);
    } finally {
      hideLoading();
    }
  });
}

// Helper functions for UI
function showLoading() {
  loadingElement.removeAttribute('hidden');
  questionContainer.setAttribute('hidden', '');
  errorElement.setAttribute('hidden', '');
}

function hideLoading() {
  loadingElement.setAttribute('hidden', '');
}

function showError(message) {
  errorElement.textContent = message;
  errorElement.removeAttribute('hidden');
}

// Initialize the extension
initModel();
main();