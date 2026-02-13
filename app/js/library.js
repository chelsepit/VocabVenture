// library.js - Library Page Functionality

const { ipcRenderer } = require('electron');

// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'pages/auth/login.html';
}

// ============================================
// LOAD USER PROGRESS
// ============================================
async function loadProgress() {
    try {
        console.log('Loading progress for user:', currentUser.id);
        
        // Get progress for each story
        for (let storyId = 1; storyId <= 3; storyId++) {
            const storyProgress = await ipcRenderer.invoke('progress:get', {
                userId: currentUser.id,
                storyId: storyId
            });
            
            // Determine total segments based on story
            let totalSegments = 14; // Default
            if (storyId === 1) totalSegments = 13; // Story 1 has 13 segments
            if (storyId === 3) totalSegments = 10; // Story 3 has 10 segments
            
            // Calculate story progress
            const completedSegments = storyProgress.filter(p => p.completed).length;
            const percentage = Math.round((completedSegments / totalSegments) * 100);
            
            console.log(`Story ${storyId}: ${completedSegments}/${totalSegments} = ${percentage}%`);
            
            // Update progress bars
            const progressBars = document.querySelectorAll(`[data-progress="${storyId}"]`);
            progressBars.forEach(bar => {
                bar.style.width = percentage + '%';
            });
        }
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

// Load progress on page load
loadProgress();

// ============================================
// GENRE FILTERING
// ============================================
const genreTags = document.querySelectorAll('.genre-tag');
genreTags.forEach(tag => {
    tag.addEventListener('click', function() {
        // Remove active class from all tags
        genreTags.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tag
        this.classList.add('active');
        
        // Get selected genre
        const genre = this.dataset.genre;
        console.log('Selected genre:', genre);
        
        // TODO: Filter books by genre
    });
});

// ============================================
// SEARCH FUNCTIONALITY
// ============================================
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');

if (searchInput && clearSearch) {
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        console.log('Search query:', query);
        
        // Show/hide clear button
        clearSearch.style.opacity = query ? '1' : '0.7';
        
        // TODO: Implement search filtering
    });

    clearSearch.addEventListener('click', function() {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
        searchInput.focus();
    });
}

// ============================================
// BOOK ITEM CLICK HANDLERS
// Navigate to existing story pages
// ============================================
const bookItems = document.querySelectorAll('.book-item');
bookItems.forEach(item => {
    item.addEventListener('click', function() {
        const storyId = this.dataset.storyId;
        
        if (storyId) {
            console.log('Opening story:', storyId);
            
            // Navigate to the appropriate story page
            // Story 1 = Folktales (How the Tinguian Learned to Plant)
            // Story 2 = Myths (Bighari: The Rainbow Goddess) 
            // Story 3 = Fables (The Butterfly & The Caterpillar)
            
            if (storyId === '1') {
                window.location.href = 'pages/stories/folktales.html';
            } else if (storyId === '2') {
                window.location.href = 'pages/stories/myths.html';
            } else if (storyId === '3') {
                window.location.href = 'pages/stories/fables.html';
            } else if (storyId === '4') {
                // Additional stories - add more as needed
                window.location.href = 'pages/stories/story-4.html';
            } else if (storyId === '5') {
                window.location.href = 'pages/stories/story-5.html';
            } else {
                alert(`Story ${storyId} page not created yet`);
            }
        }
    });
});

// ============================================
// VIEW ALL LINKS
// ============================================
const viewAllLinks = document.querySelectorAll('.view-all-link');
viewAllLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('View all clicked');
        
        // TODO: Show all books in category
        alert('View all books - Coming soon!');
    });
});