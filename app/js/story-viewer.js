// story-viewer.js - Dynamic Story Viewer with Progress Tracking

const { ipcRenderer } = require('electron');

let currentStory = null;
let currentSegmentIndex = 0;
let storyData = null;
let currentUser = null;

// Get story ID from URL parameters
function getStoryIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return parseInt(urlParams.get('id')) || 1;
}

// Get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

// Load story data from JSON
async function loadStoryData(storyId) {
    try {
        const response = await fetch(`../../data/stories/story-${storyId}.json`);
        if (!response.ok) {
            throw new Error('Story not found');
        }
        storyData = await response.json();
        console.log('Story loaded:', storyData.title);
        return storyData;
    } catch (error) {
        console.error('Error loading story:', error);
        alert('Failed to load story. Redirecting to library...');
        window.location.href = '../dashboard/library.html';
        return null;
    }
}

// Load user's last position in this story
async function loadLastPosition(userId, storyId) {
    try {
        const position = await ipcRenderer.invoke('progress:getPosition', {
            userId: userId,
            storyId: storyId
        });
        
        if (position && position.current_segment) {
            console.log('📖 Resuming from segment:', position.current_segment);
            return position.current_segment - 1; // Convert to 0-indexed
        }
        
        console.log('📖 Starting from beginning');
        return 0; // Start from beginning
    } catch (error) {
        console.error('Error loading position:', error);
        return 0;
    }
}

// Save current position
async function savePosition(userId, storyId, segmentIndex) {
    try {
        await ipcRenderer.invoke('progress:updatePosition', {
            userId: userId,
            storyId: storyId,
            segmentId: segmentIndex + 1 // Convert from 0-indexed to 1-indexed
        });
        console.log('💾 Position saved: segment', segmentIndex + 1);
    } catch (error) {
        console.error('Error saving position:', error);
    }
}

// Mark segment as completed
async function markSegmentCompleted(userId, storyId, segmentIndex) {
    try {
        await ipcRenderer.invoke('progress:saveSegment', {
            userId: userId,
            storyId: storyId,
            segmentId: segmentIndex + 1
        });
        console.log('✅ Segment', segmentIndex + 1, 'marked as completed');
    } catch (error) {
        console.error('Error marking segment complete:', error);
    }
}

// Initialize story viewer
async function initStoryViewer() {
    // Get current user
    currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Please login to read stories');
        window.location.href = '../auth/login.html';
        return;
    }
    
    const storyId = getStoryIdFromUrl();
    console.log('Loading story ID:', storyId);
    
    const story = await loadStoryData(storyId);
    if (!story) return;
    
    currentStory = story;
    
    // Update page title
    document.title = story.title + ' - VocabVenture';
    
    // Update total segments display
    document.getElementById('totalSegments').textContent = story.totalSegments;
    
    // Load user's last position
    const lastPosition = await loadLastPosition(currentUser.id, storyId);
    currentSegmentIndex = lastPosition;
    
    // Show resume notification if not starting from beginning
    if (lastPosition > 0) {
        showResumeNotification(lastPosition + 1);
    }
    
    // Load segment
    loadSegment(currentSegmentIndex);
    
    // Setup navigation buttons
    setupNavigation();
    
    // Auto-save position periodically
    setInterval(() => {
        if (currentUser && currentStory) {
            savePosition(currentUser.id, getStoryIdFromUrl(), currentSegmentIndex);
        }
    }, 10000); // Save every 10 seconds
}

// Show resume notification
function showResumeNotification(segmentNumber) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 120px;
        right: 30px;
        background: rgba(255, 255, 255, 0.95);
        padding: 15px 20px;
        border-radius: 15px;
        border: 2px solid #4ade80;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        font-family: 'Nunito', sans-serif;
        font-weight: 700;
        color: #166534;
        animation: slideIn 0.5s ease;
    `;
    notification.innerHTML = `
        📖 Resuming from Segment ${segmentNumber}
        <div style="font-size: 0.9rem; font-weight: 400; margin-top: 5px; color: #15803d;">
            <button onclick="restartStory()" style="background: transparent; border: none; color: #15803d; text-decoration: underline; cursor: pointer; font-weight: 600;">
                Start from beginning
            </button>
        </div>
    `;
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// Restart story from beginning
window.restartStory = function() {
    currentSegmentIndex = 0;
    loadSegment(0);
    savePosition(currentUser.id, getStoryIdFromUrl(), 0);
};

// Load a specific segment
function loadSegment(index) {
    if (!currentStory || index < 0 || index >= currentStory.segments.length) {
        return;
    }
    
    currentSegmentIndex = index;
    const segment = currentStory.segments[index];
    
    console.log('Loading segment:', index + 1, segment);
    
    // Update segment counter
    document.getElementById('currentSegment').textContent = index + 1;
    
    // Update video
    const videoSource = document.getElementById('videoSource');
    const video = document.getElementById('storyVideo');
    
    // Get the correct audio path based on voice selection
    const selectedVoice = localStorage.getItem('selected_voice') || 'boy';
    const audioPath = segment[`audio-${selectedVoice}`];
    
    videoSource.src = '../../' + segment.illustration;
    video.load();
    video.play();
    
    // Update text content with interactive words
    updateStoryText(segment);
    
    // Play audio if sound is enabled
    if (audioPath && localStorage.getItem('sound_enabled') !== 'false') {
        playSegmentAudio(audioPath);
    }
    
    // Save position
    savePosition(currentUser.id, getStoryIdFromUrl(), index);
    
    // Mark previous segment as completed (if moving forward)
    if (index > 0) {
        markSegmentCompleted(currentUser.id, getStoryIdFromUrl(), index - 1);
    }
    
    // Update navigation buttons
    updateNavigationButtons();
}

// Update story text with interactive vocabulary words
function updateStoryText(segment) {
    const storyTextElement = document.getElementById('storyText');
    let textHtml = segment.text;
    
    // Replace vocabulary words with interactive spans
    if (segment.vocabulary && segment.vocabulary.length > 0) {
        segment.vocabulary.forEach(vocab => {
            const word = vocab.word;
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            
            textHtml = textHtml.replace(regex, (match) => {
                return `<span class="interactive-word" 
                    onclick="showDefinition('${vocab.word}', '${vocab.pronunciation}', 'Synonym: ${vocab.synonym}', '${vocab.definition}')">
                    ${match}
                </span>`;
            });
        });
    }
    
    storyTextElement.innerHTML = textHtml;
}

// Play segment audio
function playSegmentAudio(audioPath) {
    const audio = new Audio('../../' + audioPath);
    const volume = parseInt(localStorage.getItem('volume') || '70') / 100;
    audio.volume = volume;
    
    audio.play().catch(error => {
        console.log('Audio play prevented:', error);
    });
}

// Setup navigation buttons
function setupNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    prevBtn.addEventListener('click', () => {
        if (currentSegmentIndex > 0) {
            loadSegment(currentSegmentIndex - 1);
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentSegmentIndex < currentStory.segments.length - 1) {
            loadSegment(currentSegmentIndex + 1);
        } else {
            // Mark final segment as completed
            markSegmentCompleted(currentUser.id, getStoryIdFromUrl(), currentSegmentIndex);
            // Story completed
            showCompletionScreen();
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            prevBtn.click();
        } else if (e.key === 'ArrowRight') {
            nextBtn.click();
        }
    });
}

// Update navigation button states
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // Disable previous button on first segment
    if (currentSegmentIndex === 0) {
        prevBtn.style.opacity = '0.5';
        prevBtn.style.cursor = 'not-allowed';
    } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.cursor = 'pointer';
    }
    
    // Change next button text on last segment
    if (currentSegmentIndex === currentStory.segments.length - 1) {
        nextBtn.textContent = 'Complete →';
        nextBtn.style.background = '#4ade80';
    } else {
        nextBtn.textContent = 'Next →';
        nextBtn.style.background = '#FFD93D';
    }
}

// Show completion screen
async function showCompletionScreen() {
    alert(`Congratulations! You've completed "${currentStory.title}"!\n\nQuiz feature coming soon!`);
    
    // Clear position (story completed)
    await savePosition(currentUser.id, getStoryIdFromUrl(), currentStory.segments.length);
    
    // TODO: Save quiz completion
    // TODO: Award badges
    
    // Redirect to library
    setTimeout(() => {
        window.location.href = '../dashboard/library.html';
    }, 1000);
}

// Listen for voice changes
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const boyVoice = document.getElementById('boyVoice');
        const girlVoice = document.getElementById('girlVoice');
        
        if (boyVoice && girlVoice) {
            boyVoice.addEventListener('click', () => {
                loadSegment(currentSegmentIndex);
            });
            
            girlVoice.addEventListener('click', () => {
                loadSegment(currentSegmentIndex);
            });
        }
    }, 500);
});

// Initialize when page loads
window.addEventListener('DOMContentLoaded', initStoryViewer);

// Save position before leaving page
window.addEventListener('beforeunload', () => {
    if (currentUser && currentStory) {
        savePosition(currentUser.id, getStoryIdFromUrl(), currentSegmentIndex);
    }
});