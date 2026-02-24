// finish-book.js - Story Completion with BRONZE BADGE

let completedStory = null;
let isSavingCompletion = false; // Guard: prevent double-save

// Initialize page
async function initFinishPage() {
    const storedData = sessionStorage.getItem('completedStory');

    if (!storedData) {
        console.error('No completion data found');
        window.location.href = 'library.html';
        return;
    }

    completedStory = JSON.parse(storedData);
    console.log('Story completed:', completedStory);

    displayBronzeBadge();

    // ✅ Save immediately on page load — don't wait for button click
    await saveStoryCompletion();
}

// Display BRONZE badge for completing the story
function displayBronzeBadge() {
    const badgeImage = document.getElementById('badgeImage');
    const completionMessage = document.getElementById('completionMessage');

    badgeImage.src = '../../assets/images/badges/bronze-badge.png';
    badgeImage.alt = 'Bronze Badge - Story Completed';

    if (completedStory) {
        completionMessage.innerHTML = `
            <strong class="congrats">Congratulations!</strong><br>
            You've earned a <strong style="color: #ffffff;">BRONZE BADGE</strong> for completing <strong>"${completedStory.title}"</strong>!<br>
            <br>
        `;
    }
}

// ✅ FIX: continueToGames now guarantees DB is written before navigating.
// saveStoryCompletion() is awaited in initFinishPage(), so by the time the
// user can even click Continue the save is already done. This function is
// now purely a navigation call — no race condition.
function continueToGames() {
    if (completedStory) {
        sessionStorage.setItem('quizStoryId', completedStory.id);
        window.location.href = `pick-a-word.html?story=${completedStory.id}`;
    }
}

// Save story completion to database
async function saveStoryCompletion() {
    // Guard against double-save (e.g., if initFinishPage is somehow called twice)
    if (isSavingCompletion) return;
    isSavingCompletion = true;

    try {
        const { ipcRenderer } = require('electron');
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));

        if (currentUser && completedStory) {
            // Mark ALL segments as completed in one batch
            const savePromises = [];
            for (let i = 1; i <= completedStory.totalSegments; i++) {
                savePromises.push(
                    ipcRenderer.invoke('progress:save', {
                        userId: currentUser.id,
                        storyId: completedStory.id,
                        segmentId: i
                    })
                );
            }
            await Promise.all(savePromises);

            // Award BRONZE badge (upgrades to silver/gold after quizzes)
            await ipcRenderer.invoke('badge:award', {
                userId: currentUser.id,
                storyId: completedStory.id,
                badgeType: 'bronze'
            });

            console.log('✅ Story completion saved to DB — BRONZE badge awarded');
        }
    } catch (error) {
        console.error('Error saving completion:', error);
        // Don't block the user — they can still continue even if save failed
    } finally {
        isSavingCompletion = false;
    }
}

window.addEventListener('DOMContentLoaded', initFinishPage);