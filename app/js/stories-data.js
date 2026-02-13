// stories-data.js - All stories organized by genre

const STORIES_DATA = {
    folktales: [
        {
            id: 1,
            title: "How the Tinguian Learned to Plant",
            image: "assets/images/books/folktales/folktale-book-1.png",
            hasContent: true // This one has actual content
        },
        {
            id: 101,
            title: "The Origin of Rice",
            image: "assets/images/books/folktales/folktale-book-2.png",
            hasContent: false
        },
        {
            id: 102,
            title: "The Monkey and The Turtle",
            image: "assets/images/books/folktales/folktale-book-3.png",
            hasContent: false
        },
        {
            id: 103,
            title: "The Grasshopper And The Ant",
            image: "assets/images/books/folktales/folktale-book-4.png",
            hasContent: false
        },
        {
            id: 104,
            title: "Why The Carabao Is Strong",
            image: "assets/images/books/folktales/folktale-book-5.png",
            hasContent: false
        },
        {
            id: 105,
            title: "The Lion and The Mouse",
            image: "assets/images/books/folktales/folktale-book-1.png",
            hasContent: false
        }
    ],
    
    myths: [
        {
            id: 2,
            title: "Bighari: The Rainbow Goddess",
            image: "assets/images/books/myths/myth-book-1.png",
            hasContent: true // This one has actual content
        },
        {
            id: 201,
            title: "The Tale Of The First Rainbow",
            image: "assets/images/books/myths/myth-book-2.png",
            hasContent: false
        },
        {
            id: 202,
            title: "The Sun And The Moon",
            image: "assets/images/books/myths/myth-book-3.png",
            hasContent: false
        },
        {
            id: 203,
            title: "Bakunawa And The Seven Moons",
            image: "assets/images/books/myths/myth-book-1.png",
            hasContent: false
        },
        {
            id: 204,
            title: "The Guardians Of Wawa Dam",
            image: "assets/images/books/myths/myth-book-2.png",
            hasContent: false
        },
        {
            id: 205,
            title: "Apo: A Giant Guardian",
            image: "assets/images/books/myths/myth-book-3.png",
            hasContent: false
        }
    ],
    
    fables: [
        {
            id: 3,
            title: "The Butterfly & The Caterpillar",
            image: "assets/images/books/fables/fable-book-1.png",
            hasContent: true // This one has actual content
        },
        {
            id: 301,
            title: "The Country Mouse and the City Mouse",
            image: "assets/images/books/fables/fable-book-2.png",
            hasContent: false
        },
        {
            id: 302,
            title: "The Tortoise and the Birds",
            image: "assets/images/books/fables/fable-book-3.png",
            hasContent: false
        },
        {
            id: 303,
            title: "The Crow and the Pitcher",
            image: "assets/images/books/fables/fable-book-1.png",
            hasContent: false
        },
        {
            id: 304,
            title: "The Ant and the Grasshopper",
            image: "assets/images/books/fables/fable-book-2.png",
            hasContent: false
        },
        {
            id: 305,
            title: "The Honest Woodman",
            image: "assets/images/books/fables/fable-book-3.png",
            hasContent: false
        }
    ],
    
    'short-stories': [
        {
            id: 401,
            title: "The Little Red Hen",
            image: "assets/images/books/folktales/folktale-book-1.png",
            hasContent: false
        },
        {
            id: 402,
            title: "A Brave Little Girl",
            image: "assets/images/books/folktales/folktale-book-2.png",
            hasContent: false
        },
        {
            id: 403,
            title: "Careless Clown",
            image: "assets/images/books/folktales/folktale-book-3.png",
            hasContent: false
        },
        {
            id: 404,
            title: "Pappy, The Paper Bag",
            image: "assets/images/books/folktales/folktale-book-4.png",
            hasContent: false
        },
        {
            id: 405,
            title: "The Carrot Seed",
            image: "assets/images/books/folktales/folktale-book-5.png",
            hasContent: false
        },
        {
            id: 406,
            title: "The Brave Duck",
            image: "assets/images/books/folktales/folktale-book-1.png",
            hasContent: false
        }
    ],
    
    legends: [
        {
            id: 501,
            title: "The Legend of the Mango Tree",
            image: "assets/images/books/folktales/folktale-book-2.png",
            hasContent: false
        },
        {
            id: 502,
            title: "The Legend of Pineapple",
            image: "assets/images/books/folktales/folktale-book-3.png",
            hasContent: false
        },
        {
            id: 503,
            title: "The Legend of Mayon Volcano",
            image: "assets/images/books/folktales/folktale-book-4.png",
            hasContent: false
        },
        {
            id: 504,
            title: "Si Maria Makiling",
            image: "assets/images/books/folktales/folktale-book-5.png",
            hasContent: false
        },
        {
            id: 505,
            title: "The Legend of Chocolate Hills",
            image: "assets/images/books/folktales/folktale-book-1.png",
            hasContent: false
        },
        {
            id: 506,
            title: "The Legend of Sarimanok",
            image: "assets/images/books/folktales/folktale-book-2.png",
            hasContent: false
        }
    ]
};

// Get recently read stories (stories with progress)
function getRecentStories(userProgress) {
    const recentStories = [];
    
    // Get all stories with progress
    if (userProgress && Array.isArray(userProgress)) {
        userProgress.forEach(progress => {
            const storyId = progress.story_id;
            
            // Find the story in our data
            for (const genre in STORIES_DATA) {
                const story = STORIES_DATA[genre].find(s => s.id === storyId);
                if (story) {
                    recentStories.push({
                        ...story,
                        progress: progress
                    });
                    break;
                }
            }
        });
    }
    
    // Sort by last activity (most recent first)
    recentStories.sort((a, b) => {
        const dateA = new Date(a.progress.last_activity || 0);
        const dateB = new Date(b.progress.last_activity || 0);
        return dateB - dateA;
    });
    
    return recentStories.slice(0, 3); // Return top 3
}

// Get stories by genre
function getStoriesByGenre(genre) {
    return STORIES_DATA[genre] || [];
}

// Get all stories
function getAllStories() {
    const allStories = [];
    for (const genre in STORIES_DATA) {
        allStories.push(...STORIES_DATA[genre]);
    }
    return allStories;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        STORIES_DATA,
        getRecentStories,
        getStoriesByGenre,
        getAllStories
    };
}