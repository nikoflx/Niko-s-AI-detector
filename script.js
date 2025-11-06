document.addEventListener('DOMContentLoaded', () => {
    // 1. Get DOM Elements
    const textInput = document.getElementById('textInput');
    const analyzeButton = document.getElementById('analyzeButton');
    const charCount = document.getElementById('charCount');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultsDisplay = document.getElementById('resultsDisplay');
    const humanPercentageSpan = document.getElementById('humanPercentage');
    const aiPercentageSpan = document.getElementById('aiPercentage');
    const conclusionText = document.getElementById('conclusionText');
    const humanFill = document.querySelector('.human-fill');
    const aiFill = document.querySelector('.ai-fill');
    
    // Key Input Elements
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveKeyButton = document.getElementById('saveKeyButton');

    // 2. Constants
    const MAX_CHARS = 25000;
    const MIN_CHARS_FOR_ANALYSIS = 100;
    // CORRECTED: Use the official REST API URL for a simple fetch request
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    const LOCAL_STORAGE_KEY = 'geminiApiKey';
    let userApiKey = localStorage.getItem(LOCAL_STORAGE_KEY) || '';

    // --- Helper Functions ---
    
    // Checks if the button should be enabled
    const updateAnalyzeButtonState = () => {
        const currentLength = textInput.value.trim().length;
        analyzeButton.disabled = currentLength < MIN_CHARS_FOR_ANALYSIS || !userApiKey;
    };

    // --- Key Management Functions ---

    // Load key visually on startup
    if (userApiKey) {
        apiKeyInput.value = '********';
        saveKeyButton.textContent = 'Key Saved';
    } else {
        // If no key is saved, disable the button initially
        analyzeButton.disabled = true;
    }

    // Save key to local storage
    saveKeyButton.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        
        // Only proceed if the input value is NOT the masked value and is not empty
        if (key && key !== '********') {
            localStorage.setItem(LOCAL_STORAGE_KEY, key);
            userApiKey = key; // Update the variable for immediate use
            apiKeyInput.value = '********';
            saveKeyButton.textContent = 'Key Saved';
            alert('API Key saved successfully! It is stored locally in your browser.');
        } else if (userApiKey) {
             // Case where the user clicked save but the masked value was already there
             alert('Key is already saved!');
        } else {
            alert('Please enter a valid API Key.');
        }
        updateAnalyzeButtonState(); // Re-check button state after saving
    });

    // --- Character Counting and UI State ---
    
    textInput.addEventListener('input', () => {
        const currentLength = textInput.value.length;
        charCount.textContent = `${currentLength} / ${MAX_CHARS} Characters`;
        
        if (!resultsDisplay.classList.contains('hidden')) {
            resultsDisplay.classList.add('hidden');
        }
        updateAnalyzeButtonState(); // Update button state whenever text changes
    });

    // Initialize the button state
    textInput.dispatchEvent(new Event('input')); 

    // --- Core Analysis Logic (Direct Client-Side API Call) ---

    analyzeButton.addEventListener('click', async () => {
        const text = textInput.value.trim();

        if (!userApiKey || analyzeButton.disabled) {
            alert('Please ensure you have saved your API Key and entered at least 100 characters of text.');
            return;
        }

        // Reset UI and show loading animation
        resultsDisplay.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        analyzeButton.disabled = true;

        try {
            // The prompt instructs the model to only return a predictable JSON for easy parsing.
            const promptContent = `Analyze the following text. Respond ONLY with a single JSON object. The 'ai_score' should be your confidence level (0-100) that the text was written by a large language model. The 'human_score' should be 100 minus the ai_score. The 'verdict' should be a short summary conclusion. The JSON object structure MUST be: { "ai_score": [0-100], "human_score": [0-100], "verdict": "Your conclusion here" }
            
            Text to analyze: "${text}"`;

            // CORRECTED: Key is sent as a query parameter for the REST API
            const response = await fetch(`${GEMINI_API_URL}?key=${userApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: promptContent }] }],
                    config: {
                        temperature: 0.0 
                    }
                })
            });

            const apiData = await response.json();

            if (!response.ok) {
                 const errorMessage = apiData.error?.message || 'Gemini API call failed. Check your key and usage limits.';
                 throw new Error(errorMessage);
            }

            const rawOutput = apiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            
            // Clean and parse the JSON output from the model
            const result = JSON.parse(rawOutput.replace(/```json|```/g, '').trim());

            // --- Display Results ---
            const humanScore = Math.min(100, Math.round(result.human_score || 0));
            const aiScore = Math.min(100, Math.round(result.ai_score || 0));
            const verdict = result.verdict || "AI Analysis Complete (Unreliable Score)";

            // Set text content
            humanPercentageSpan.textContent = `${humanScore}%`;
            aiPercentageSpan.textContent = `${aiScore}%`;
            conclusionText.textContent = verdict;
            
            // Set the width of the bars (CSS transition handles the smooth animation)
            humanFill.style.width = `${humanScore}%`;
            aiFill.style.width = `${aiScore}%`;

            // Style the conclusion based on the primary finding
            if (aiScore > 70) {
                conclusionText.className = 'conclusion warning'; 
            } else if (aiScore > 40) {
                 conclusionText.className = 'conclusion success caution'; // Using success base with a potential custom 'caution' style
            } else {
                conclusionText.className = 'conclusion success'; 
            }

        } catch (error) {
            console.error('API Error:', error);
            conclusionText.textContent = `Error: ${error.message}`;
            conclusionText.className = 'conclusion error';
            
            humanFill.style.width = '0%';
            aiFill.style.width = '0%';
        } finally {
            loadingIndicator.classList.add('hidden');
            resultsDisplay.classList.remove('hidden');
            updateAnalyzeButtonState();
        }
    });
});
