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
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    const LOCAL_STORAGE_KEY = 'geminiApiKey';
    let userApiKey = localStorage.getItem(LOCAL_STORAGE_KEY) || '';

    // --- Key Management Functions ---

    // Load key visually
    if (userApiKey) {
        apiKeyInput.value = '********'; // Mask the key
        saveKeyButton.textContent = 'Key Saved';
    }

    // Save key to local storage
    saveKeyButton.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        // Check if the user entered a new key or if they just clicked 'Save Key' on the masked value
        if (key && key !== '********') {
            localStorage.setItem(LOCAL_STORAGE_KEY, key);
            userApiKey = key;
            apiKeyInput.value = '********';
            saveKeyButton.textContent = 'Key Saved';
            alert('API Key saved successfully! It is stored locally in your browser.');
        } else if (key === '********') {
            alert('Key is already saved!');
        } else {
            alert('Please enter a valid API Key.');
        }
    });

    // --- Character Counting and UI State ---
    
    textInput.addEventListener('input', () => {
        const currentLength = textInput.value.length;
        charCount.textContent = `${currentLength} / ${MAX_CHARS} Characters`;
        analyzeButton.disabled = currentLength < MIN_CHARS_FOR_ANALYSIS || !userApiKey;
        
        if (!resultsDisplay.classList.contains('hidden')) {
            resultsDisplay.classList.add('hidden');
        }
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

            const response = await fetch(`${GEMINI_API_URL}?key=${userApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: promptContent }] }],
                    config: {
                        temperature: 0.0 // Keep temperature low for deterministic output
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
                conclusionText.className = 'conclusion warning'; // High AI risk
            } else if (aiScore > 40) {
                 conclusionText.className = 'conclusion caution'; // Moderate risk (Add a CSS style for 'caution')
            } else {
                conclusionText.className = 'conclusion success'; // Low AI risk / High Human
            }

        } catch (error) {
            console.error('API Error:', error);
            conclusionText.textContent = `Error: ${error.message}`;
            conclusionText.className = 'conclusion error';
            
            // Reset bars on error
            humanFill.style.width = '0%';
            aiFill.style.width = '0%';
        } finally {
            loadingIndicator.classList.add('hidden');
            resultsDisplay.classList.remove('hidden');
            analyzeButton.disabled = false;
            textInput.dispatchEvent(new Event('input')); // Re-check button state
        }
    });
});
