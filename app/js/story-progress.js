// story-progress.js
// Add this script to your story pages (fables.html, myths.html, folktales.html)
// to save progress when users complete segments

const { ipcRenderer } = require('electron');

// Get current user
const currentUser = JSON.parse(localStorage.getItem('currentUser'));

// Story configuration - UPDATE THIS FOR EACH STORY PAGE
const STORY_CONFIG = {
    // For fables.html (Story 3):
    storyId: 3,
    totalSegments: 10,
    
    // For myths.html (Story 2):
    // storyId: 2,
    // totalSegments: 14,
    
    // For folktales.html (Story 1):
    // storyId: 1,
    // totalSegments: 13,
};

// Track current segment (you'll need to increment this as user navigates)
let currentSegment = 1;

// ============================================
// SAVE PROGRESS WHEN SEGMENT IS COMPLETED
// ============================================
async function saveSegmentProgress(segmentId) {
    if (!currentUser) {
        console.log('No user logged in, cannot save progress');
        return;
    }
    
    try {
        const result = await ipcRenderer.invoke('progress:saveSegment', {
            userId: currentUser.id,
            storyId: STORY_CONFIG.storyId,
            segmentId: segmentId
        });
        
        if (result.success) {
            console.log(`✅ Saved progress: Story ${STORY_CONFIG.storyId}, Segment ${segmentId}`);
        }
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

// ============================================
// GET LAST COMPLETED SEGMENT
// ============================================
async function getLastPosition() {
    if (!currentUser) return { segmentId: 0 };
    
    try {
        const position = await ipcRenderer.invoke('progress:getPosition', {
            userId: currentUser.id,
            storyId: STORY_CONFIG.storyId
        });
        
        console.log('Last position:', position);
        return position;
    } catch (error) {
        console.error('Error getting position:', error);
        return { segmentId: 0 };
    }
}

// ============================================
// EXAMPLE: HOW TO USE IN YOUR STORY PAGE
// ============================================

// When user completes a segment (e.g., clicks "Next" button):
function onSegmentComplete() {
    // Save the current segment as completed
    saveSegmentProgress(currentSegment);
    
    // Move to next segment
    currentSegment++;
    
    if (currentSegment > STORY_CONFIG.totalSegments) {
        // Story completed!
        console.log('🎉 Story completed!');
        // Redirect to quiz or library
        // window.location.href = '../dashboard/library.html';
    } else {
        // Load next segment
        loadSegment(currentSegment);
    }
}

// When page loads, get last position
async function initializeStory() {
    const position = await getLastPosition();
    
    if (position.segmentId > 0) {
        // Resume from next segment after last completed
        currentSegment = position.segmentId + 1;
        console.log(`Resuming from segment ${currentSegment}`);
    } else {
        // Start from beginning
        currentSegment = 1;
        console.log('Starting from beginning');
    }
    
    loadSegment(currentSegment);
}

// Placeholder - you'll implement this based on your UI
function loadSegment(segmentId) {
    console.log(`Loading segment ${segmentId}`);
    // Your code to display the segment content
}

// ============================================
// EXPORT FOR USE IN HTML
// ============================================
window.saveSegmentProgress = saveSegmentProgress;
window.onSegmentComplete = onSegmentComplete;
window.initializeStory = initializeStory;
window.currentSegment = currentSegment;

// Auto-initialize on page load
// document.addEventListener('DOMContentLoaded', initializeStory);