// personal-library.js - Personal Library with Progress Tracking

const { ipcRenderer } = require('electron');

// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = '../auth/login.html';
}

// ============================================
// LOAD PROGRESS FROM DATABASE
// ============================================
async function loadProgressFromDB() {
    try {
        console.log('Loading progress from database for user:', currentUser.id);
        
        // Get all progress for the user
        const allProgress = await ipcRenderer.invoke('progress:getAll', currentUser.id);
        console.log('All progress:', allProgress);
        
        // Update progress bars for each story
        for (const progressItem of allProgress) {
            const storyId = progressItem.story_id;
            const completedSegments = progressItem.completed_segments;
            const totalSegments = progressItem.total_segments;
            const percentage = Math.round((completedSegments / totalSegments) * 100);
            
            console.log(`Story ${storyId}: ${completedSegments}/${totalSegments} = ${percentage}%`);
            
            // Update progress bars
            const progressBars = document.querySelectorAll(`[data-progress="${storyId}"]`);
            progressBars.forEach(bar => {
                bar.style.width = percentage + '%';
            });
            
            // Also update in book items
            const bookItems = document.querySelectorAll(`.book-item[data-story-id="${storyId}"]`);
            bookItems.forEach(item => {
                const progressFill = item.querySelector('.progress-fill');
                if (progressFill) {
                    progressFill.style.width = percentage + '%';
                }
            });
        }
        
        // Organize books into Recent Reads and Completed
        organizeBooks(allProgress);
        
    } catch (error) {
        console.error('Error loading progress from database:', error);
    }
}

// ============================================
// ORGANIZE BOOKS
// ============================================
function organizeBooks(progressData) {
    const recentReadsContainer = document.getElementById('recentReads');
    const completedBooksContainer = document.getElementById('completedBooks');
    
    if (!recentReadsContainer || !completedBooksContainer) return;
    
    // Clear containers
    recentReadsContainer.innerHTML = '';
    completedBooksContainer.innerHTML = '';
    
    // Get all books
    const allBooks = document.querySelectorAll('.book-item');
    
    progressData.forEach(progress => {
        const percentage = Math.round((progress.completed_segments / progress.total_segments) * 100);
        const storyId = progress.story_id;
        
        // Find the book element
        const bookElement = Array.from(allBooks).find(book => 
            parseInt(book.dataset.storyId) === storyId
        );
        
        if (!bookElement) return;
        
        // Clone the book element
        const bookClone = bookElement.cloneNode(true);
        
        // Update progress bar
        const progressBar = bookClone.querySelector('.progress-fill');
        if (progressBar) {
            progressBar.style.width = percentage + '%';
        }
        
        // Add click handler
        bookClone.addEventListener('click', function() {
            openStory(storyId);
        });
        
        // Add to appropriate container
        if (percentage === 100) {
            completedBooksContainer.appendChild(bookClone);
        } else if (percentage > 0) {
            recentReadsContainer.appendChild(bookClone);
        }
    });
    
    // If no recent reads, show message
    if (recentReadsContainer.children.length === 0) {
        recentReadsContainer.innerHTML = '<p style="text-align: center; color: #666;">No books in progress yet. Start reading!</p>';
    }
    
    // If no completed books, show message
    if (completedBooksContainer.children.length === 0) {
        completedBooksContainer.innerHTML = '<p style="text-align: center; color: #666;">Complete your first story to see it here!</p>';
    }
}

// ============================================
// OPEN STORY
// ============================================
async function openStory(storyId) {
    try {
        console.log('Opening story:', storyId);
        
        // Get user's last position
        const position = await ipcRenderer.invoke('progress:getPosition', {
            userId: currentUser.id,
            storyId: parseInt(storyId)
        });
        
        console.log('Last position:', position);
        
        const segmentId = position.success ? (position.segmentId + 1) : 1;
        
        // Navigate to story viewer
        // TODO: Update this path when you create the story viewer
        alert(`Opening story ${storyId} at segment ${segmentId}...\n\nStory viewer coming soon!`);
        
        // When ready:
        // window.location.href = `../stories/viewer.html?storyId=${storyId}&segmentId=${segmentId}`;
        
    } catch (error) {
        console.error('Error opening story:', error);
        alert('Failed to open story. Please try again.');
    }
}

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Personal Library loaded');
    
    // Load progress from database
    loadProgressFromDB();
    
    // Add click handlers to all book items
    const bookItems = document.querySelectorAll('.book-item');
    bookItems.forEach(book => {
        book.addEventListener('click', function() {
            const storyId = this.getAttribute('data-story-id');
            if (storyId) {
                openStory(parseInt(storyId));
            }
        });

        // Add hover effects
        book.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });

        book.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // View all links
    const viewAllLinks = document.querySelectorAll('.view-all-link');
    viewAllLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.closest('.bookshelf-section');
            const sectionTitle = section.querySelector('.section-title').textContent;
            console.log('View all clicked for:', sectionTitle);
        });
    });
});

// ============================================
// AUTO-REFRESH PROGRESS
// ============================================
// Refresh progress every 30 seconds
setInterval(loadProgressFromDB, 30000);

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadProgressFromDB,
        openStory
    };
}