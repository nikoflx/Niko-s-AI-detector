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

    const MAX_CHARS = 25000;
    const MIN_CHARS_FOR_ANALYSIS = 100;
    // PLACEHOLDER: This MUST match the route on your secure Python/Node.js backend.
    const API_ENDPOINT = '/api/detect'; 

    // --- Character Counting and UI State ---
    
    // Updates the character count and button state
    textInput.addEventListener('input', () => {
        const currentLength = textInput.value.length;
        charCount.textContent = `${currentLength} / ${MAX_CHARS} Characters`;
        
        // Enable button only if text is long enough
        analyzeButton.disabled = currentLength < MIN_CHARS_FOR_ANALYSIS;
        
        // Hide previous results when user starts typing again
        if (!resultsDisplay.classList.contains('hidden')) {
            resultsDisplay.classList.add('hidden');
        }
    });

    // Initialize the button state
    textInput.dispatchEvent(new Event('input')); 

    // --- Core Analysis Logic ---

    analyzeButton.addEventListener('click', async () => {
        const text = textInput.value.trim();
        
        if (text.length < MIN_CHARS_FOR_ANALYSIS) return;

        // Reset UI and show loading animation
        resultsDisplay.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        analyzeButton.disabled = true;

        try {
            // STEP 1: Send text to the secure backend (Flask/Node.js)
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text })
            });

            const result = await response.json();

            // STEP 2: Handle server errors (e.g., failed API key, text too long)
            if (!response.ok || result.error) {
                conclusionText.textContent = result.error || "An unknown server error occurred.";
                conclusionText.className = 'conclusion error';
                // Reset bars to 0
                humanFill.style.width = '0%';
                aiFill.style.width = '0%';
                return;
            }

            // STEP 3: Assume the backend provides the scores from the specialized detector
            // (These scores will determine your site's accuracy!)
            const humanScore = Math.min(100, Math.round(result.human_percentage || 0));
            const aiScore = Math.min(100, Math.round(result.ai_percentage || 0));
            const verdict = result.conclusion || (aiScore > 50 ? "Highly likely written by AI." : "Likely written by a human.");

            // STEP 4: Animate and Display Results
            
            // Set text content
            humanPercentageSpan.textContent = `${humanScore}%`;
            aiPercentageSpan.textContent = `${aiScore}%`;
            conclusionText.textContent = verdict;
            
            // Set the width of the bars (CSS transition handles the smooth animation)
            humanFill.style.width = `${humanScore}%`;
            aiFill.style.width = `${aiScore}%`;

            // Style the conclusion based on the primary finding
            if (aiScore > 75) {
                conclusionText.className = 'conclusion warning'; // High AI risk
            } else if (aiScore > 50) {
                 conclusionText.className = 'conclusion warning mild'; // Moderate AI risk
            } else {
                conclusionText.className = 'conclusion success'; // Low AI risk / High Human
            }

        } catch (error) {
            console.error('Fetch error:', error);
            conclusionText.textContent = "Network error: Could not connect to the detection server.";
            conclusionText.className = 'conclusion error';
        } finally {
            // Hide loading animation and show results/reset button
            loadingIndicator.classList.add('hidden');
            resultsDisplay.classList.remove('hidden');
            analyzeButton.disabled = false;
        }
    });
});
