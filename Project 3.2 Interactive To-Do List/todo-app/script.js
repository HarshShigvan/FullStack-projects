// script.js content 
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, collection, query, setDoc, deleteDoc, updateDoc, writeBatch, Timestamp, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

setLogLevel('Debug'); // Enable Firestore logging

// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let userId = null;
let tasks = [];

// --- UI State Variables (Loaded from localStorage) ---
let currentFilter = localStorage.getItem('filter') || 'All';
let currentSort = localStorage.getItem('sort') || 'creation';
let currentSearchTerm = '';

// --- DOM Elements ---
const todoInput = document.getElementById('todo-input');
const addButton = document.getElementById('add-button');
const listContainer = document.getElementById('list-container');
const body = document.body;
const themeToggle = document.getElementById('theme-toggle');
const clearAllButton = document.getElementById('clear-all-button');
const categorySelect = document.getElementById('category-select');
const deadlineInput = document.getElementById('deadline-input');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const filterContainer = document.getElementById('filter-container');
const userDisplay = document.getElementById('user-display');
const notificationPopup = document.getElementById('notification-popup');
const micButton = document.getElementById('mic-button');
const micIcon = document.getElementById('mic-icon');
const micStopIcon = document.getElementById('mic-stop-icon');
const loadingMessage = document.getElementById('loading-message');
const googleSigninBtn = document.getElementById('google-signin-btn');
const signoutBtn = document.getElementById('signout-btn');
const confirmationModal = document.getElementById('confirmation-modal');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

// --- Speech Recognition Setup ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        todoInput.value = transcript.trim();
        micButton.classList.remove('listening');
        micIcon.classList.remove('hidden');
        micStopIcon.classList.add('hidden');
        if (todoInput.value) {
            addTask();
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        micButton.classList.remove('listening');
        micIcon.classList.remove('hidden');
        micStopIcon.classList.add('hidden');
        showNotification(`Speech error: ${event.error}`, 'bg-red-500');
    };

    recognition.onend = () => {
        micButton.classList.remove('listening');
        micIcon.classList.remove('hidden');
        micStopIcon.classList.add('hidden');
    };

    micButton.addEventListener('click', () => {
        if (micButton.classList.contains('listening')) {
            recognition.stop();
        } else {
            try {
                recognition.start();
                micButton.classList.add('listening');
                micIcon.classList.add('hidden');
                micStopIcon.classList.remove('hidden');
                showNotification('Listening...', 'bg-indigo-500');
            } catch (e) {
                console.error('Recognition start failed:', e);
                micButton.classList.remove('listening');
                micIcon.classList.remove('hidden');
                micStopIcon.classList.add('hidden');
            }
        }
    });
} else {
    micButton.disabled = true;
    micButton.classList.add('opacity-50');
    micButton.title = 'Speech Recognition not supported by browser.';
}

// --- Utility Functions ---

function showNotification(message, bgColor = 'bg-green-500') {
    notificationPopup.textContent = message;
    notificationPopup.className = `px-4 py-2 ${bgColor} text-white rounded-lg shadow-xl text-sm font-medium transition-all`;
    notificationPopup.classList.add('show');

    setTimeout(() => {
        notificationPopup.classList.remove('show');
    }, 3000);
}

const getTasksCollectionRef = (uid) => {
    return collection(db, `artifacts/${appId}/users/${uid}/tasks`);
};

const getTaskDocRef = (uid, taskId) => {
    return doc(db, `artifacts/${appId}/users/${uid}/tasks/${taskId}`);
};

// --- Core Task Management Functions (Firestore) ---

function addTask() {
    if (!userId) return showNotification('Error: User not signed in.', 'bg-red-500');

    const text = todoInput.value.trim();
    const category = categorySelect.value;
    const deadline = deadlineInput.value;

    if (text === "") {
        showNotification("Please enter a task!", 'bg-yellow-500');
        return;
    }

    const newTask = {
        text: text,
        completed: false,
        category: category,
        deadline: deadline || null,
        creationTimestamp: Timestamp.now(),
    };

    setDoc(doc(getTasksCollectionRef(userId)), newTask)
        .then(() => {
            showNotification('Task Added!', 'bg-green-500');
            todoInput.value = '';
            deadlineInput.value = '';
        })
        .catch(error => {
            console.error("Error adding document: ", error);
            showNotification('Error adding task.', 'bg-red-500');
        });
}

function updateTaskCompletion(taskId, completed) {
    if (!userId) return;
    const taskDocRef = getTaskDocRef(userId, taskId);

    updateDoc(taskDocRef, { completed: completed })
        .then(() => {
            showNotification(completed ? 'Task Completed!' : 'Task Reopened!', 'bg-indigo-500');
        })
        .catch(error => {
            console.error("Error updating completion: ", error);
            showNotification('Error updating task.', 'bg-red-500');
        });
}

function deleteTask(taskId, taskElement) {
    if (!userId) return;

    // Start the CSS slide-out animation
    taskElement.classList.add('deleting');

    // Wait for the CSS transition to finish before deleting from Firestore
    taskElement.addEventListener('transitionend', () => {
        deleteDoc(getTaskDocRef(userId, taskId))
            .then(() => {
                showNotification('Task Deleted!', 'bg-gray-500');
            })
            .catch(error => {
                console.error("Error deleting document: ", error);
                showNotification('Error deleting task.', 'bg-red-500');
            });
    }, { once: true });
}

// --- UI/Preference Functions ---

function loadPreferences() {
    // Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        enableDarkMode(false);
    } else {
        disableDarkMode(false);
    }

    // Filter
    currentFilter = localStorage.getItem('filter') || 'All';
    filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === currentFilter);
    });

    // Sort
    currentSort = localStorage.getItem('sort') || 'creation';
    sortSelect.value = currentSort;
}

function savePreference(key, value) {
    localStorage.setItem(key, value);
}

function enableDarkMode(save = true) {
    body.classList.add('dark-mode');
    document.documentElement.classList.add('dark');
    themeToggle.textContent = 'Switch to Light';
    if (save) savePreference('theme', 'dark');
}

function disableDarkMode(save = true) {
    body.classList.remove('dark-mode');
    document.documentElement.classList.remove('dark');
    themeToggle.textContent = 'Switch to Dark';
    if (save) savePreference('theme', 'light');
}

// --- Sorting and Filtering ---

function getSortedTasks(tasksArray) {
    const sortedTasks = [...tasksArray];

    if (currentSort === 'deadline') {
        // Sort by deadline (nulls last)
        sortedTasks.sort((a, b) => {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
        });
    } else if (currentSort === 'text') {
        sortedTasks.sort((a, b) => a.text.localeCompare(b.text));
    } else if (currentSort === 'creation') {
        // Sort by Firestore timestamp (oldest first)
        sortedTasks.sort((a, b) => a.creationTimestamp.toMillis() - b.creationTimestamp.toMillis());
    }

    // Ensure incomplete tasks are above completed tasks (secondary sort)
    sortedTasks.sort((a, b) => (a.completed === b.completed) ? 0 : a.completed ? 1 : -1);

    return sortedTasks;
}

function renderFilteredTasks() {
    const container = listContainer;

    // 1. Apply search filter
    let displayTasks = tasks.filter(task =>
        task.text.toLowerCase().includes(currentSearchTerm.toLowerCase())
    );

    // 2. Apply category filter
    if (currentFilter !== 'All') {
        displayTasks = displayTasks.filter(task => task.category === currentFilter);
    }

    // 3. Apply sorting
    displayTasks = getSortedTasks(displayTasks);

    // Keep track of rendered IDs to avoid unnecessary DOM changes
    const currentDomIds = Array.from(container.children).map(el => el.dataset.id).filter(id => id);
    const newIds = displayTasks.map(t => t.id);

    // 1. Remove tasks that are no longer in the display list
    currentDomIds.forEach(domId => {
        if (!newIds.includes(domId)) {
            container.querySelector(`[data-id="${domId}"]`).remove();
        }
    });

    // 2. Render/Update tasks in the correct order
    displayTasks.forEach((task, index) => {
        let taskItem = container.querySelector(`[data-id="${task.id}"]`);

        if (taskItem) {
            // Update existing element
            updateTaskElement(taskItem, task);

            // Reorder if necessary
            const nextItem = container.children[index];
            if (taskItem !== nextItem) {
                container.insertBefore(taskItem, nextItem);
            }
        } else {
            // Create and insert new element
            taskItem = createTaskElement(task);
            const nextItem = container.children[index];
            container.insertBefore(taskItem, nextItem);
            setTimeout(() => taskItem.classList.add('visible'), 10); // Fade-in animation
        }
    });

    // Handle empty state messages
    if (displayTasks.length === 0 && currentSearchTerm === '' && currentFilter === 'All') {
        container.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 mt-4">No tasks found. Add a new one!</p>';
    } else if (displayTasks.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 mt-4">No tasks match the current filter/search criteria.</p>';
    }
}

// --- Task Element Creation/Update ---

function updateTaskElement(taskItem, task) {
    // Update text content
    taskItem.querySelector('.task-text').textContent = task.text;

    // Update completion state
    taskItem.classList.toggle('completed', task.completed);
    taskItem.querySelector('input[type="checkbox"]').checked = task.completed;

    // Update category badge
    const categoryBadge = taskItem.querySelector('.category-badge');
    categoryBadge.textContent = task.category;

    // Update deadline info
    const deadlineInfo = taskItem.querySelector('.deadline-info');
    deadlineInfo.textContent = task.deadline
        ? `Deadline: ${new Date(task.deadline).toLocaleDateString()}`
        : 'No Deadline';

    const deadlineDate = task.deadline ? new Date(task.deadline + "T23:59:59") : null;
    const now = new Date();

    deadlineInfo.classList.remove('overdue');
    if (deadlineDate && !task.completed && deadlineDate < now) {
        deadlineInfo.classList.add('overdue');
        deadlineInfo.textContent = `OVERDUE: ${deadlineInfo.textContent.replace('Deadline: ', '')}`;
    }
}

function createTaskElement(task) {
    const taskItem = document.createElement('div');
    taskItem.classList.add('task-item', 'p-3', 'rounded-lg', 'shadow-md', 'bg-gray-50', 'dark:bg-gray-800', 'transition-colors', 'cursor-grab');
    taskItem.dataset.id = task.id;
    taskItem.setAttribute('draggable', true);
    taskItem.classList.toggle('completed', task.completed);

    // Main Row structure for the task
    taskItem.innerHTML = `
        <div class="flex items-center justify-between space-x-3">
            <div class="flex items-center flex-grow min-w-0">
                <input type="checkbox" class="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" ${task.completed ? 'checked' : ''}>
                <span class="task-text text-gray-800 dark:text-gray-100 ml-3 truncate flex-grow">${task.text}</span>
            </div>
            <div class="flex items-center space-x-2 flex-shrink-0">
                <!-- <button class="edit-btn p-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs font-medium transition">Edit</button> -->
                <button class="delete-btn p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition">Del</button>
            </div>
        </div>
        <!-- Details Row -->
        <div class="task-details flex justify-between items-center mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            <span class="category-badge px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-200 text-indigo-800 dark:bg-indigo-700 dark:text-indigo-200">${task.category}</span>
            <span class="deadline-info"></span>
        </div>
    `;

    // Add dynamic listeners
    taskItem.querySelector('input[type="checkbox"]').addEventListener('change', (e) => updateTaskCompletion(task.id, e.target.checked));
    taskItem.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id, taskItem));

    // Initial update for styling
    updateTaskElement(taskItem, task);
    addDragListeners(taskItem);

    return taskItem;
}

// --- Drag & Drop for Order ---

let dragSrcEl = null;

function handleDragStart(e) {
    this.style.opacity = '0.4';
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter() {
    this.classList.add('border-indigo-500', 'border-2');
}

function handleDragLeave() {
    this.classList.remove('border-indigo-500', 'border-2');
}

function handleDrop(e) {
    e.stopPropagation();
    if (dragSrcEl !== this) {
        // Reorder the local array based on visual drop position
        const sourceId = dragSrcEl.dataset.id;
        const targetId = this.dataset.id;

        const sourceIndex = tasks.findIndex(t => t.id === sourceId);
        const targetIndex = tasks.findIndex(t => t.id === targetId);

        if (sourceIndex !== -1 && targetIndex !== -1) {
            const [draggedItem] = tasks.splice(sourceIndex, 1);
            tasks.splice(targetIndex, 0, draggedItem);
            renderFilteredTasks();
        }
    }
    return false;
}

function handleDragEnd() {
    this.style.opacity = '1';
    listContainer.querySelectorAll('.task-item').forEach(item => {
        item.classList.remove('border-indigo-500', 'border-2');
    });
}

function addDragListeners(item) {
    item.addEventListener('dragstart', handleDragStart, false);
    item.addEventListener('dragover', handleDragOver, false);
    item.addEventListener('dragenter', handleDragEnter, false);
    item.addEventListener('dragleave', handleDragLeave, false);
    item.addEventListener('drop', handleDrop, false);
    item.addEventListener('dragend', handleDragEnd, false);
}

// --- Google Authentication ---

const provider = new GoogleAuthProvider();

function signInWithGoogle() {
    signInWithPopup(auth, provider)
        .then((result) => {
            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            // The signed-in user info.
            const user = result.user;
            console.log("Signed in with Google:", user);
            showNotification(`Welcome, ${user.displayName}!`, 'bg-green-500');
        })
        .catch((error) => {
            // Handle Errors here.
            const errorCode = error.code;
            const errorMessage = error.message;
            // The email of the user's account used.
            const email = error.customData.email;
            // The AuthCredential type that was used.
            const credential = GoogleAuthProvider.credentialFromError(error);
            console.error("Google Sign-In Error:", errorMessage);
            showNotification(`Google Sign-In Error: ${errorMessage}`, 'bg-red-500');
        });
}

function signOutUser() {
    signOut(auth).then(() => {
        showNotification('You have been signed out.', 'bg-gray-500');
    }).catch((error) => {
        console.error("Sign Out Error:", error);
        showNotification('Error signing out.', 'bg-red-500');
    });
}

googleSigninBtn.addEventListener('click', signInWithGoogle);
signoutBtn.addEventListener('click', signOutUser);


// --- Firebase Auth and Data Listener ---

onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid;

        // Get or set a display name
        let displayName = user.displayName || `User: ${userId.substring(0, 8)}...`;
        userDisplay.textContent = `Welcome, ${displayName}`;

        // Update UI for signed-in state
        googleSigninBtn.classList.add('hidden');
        signoutBtn.classList.remove('hidden');
        loadingMessage.classList.remove('hidden');
        loadingMessage.textContent = 'Loading tasks...';


        // Set up real-time listener for tasks
        const tasksQuery = query(getTasksCollectionRef(userId));

        onSnapshot(tasksQuery, (snapshot) => {
            const newTasks = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                newTasks.push({
                    id: doc.id,
                    ...data,
                    // Convert Firestore Timestamp to Date for client-side sorting
                    creationTimestamp: data.creationTimestamp ? data.creationTimestamp : Timestamp.now()
                });
            });

            tasks = newTasks;
            renderFilteredTasks();
            loadingMessage.classList.add('hidden');

        }, (error) => {
            console.error("Firestore snapshot error:", error);
            loadingMessage.textContent = 'Error loading tasks. See console.';
        });

    } else {
        userId = null;
        tasks = [];
        renderFilteredTasks(); // Clear the task list
        userDisplay.textContent = 'Not Signed In.';
        
        // Update UI for signed-out state
        googleSigninBtn.classList.remove('hidden');
        signoutBtn.classList.add('hidden');
        loadingMessage.classList.add('hidden');
    }
});

// --- Event Listener Registration ---

addButton.addEventListener('click', addTask);
todoInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        addTask();
    }
});
clearAllButton.addEventListener('click', () => {
    if (tasks.length === 0) {
        showNotification('No tasks to clear.', 'bg-yellow-500');
        return;
    }
    confirmationModal.classList.remove('hidden');
});

modalCancelBtn.addEventListener('click', () => {
    confirmationModal.classList.add('hidden');
});

modalConfirmBtn.addEventListener('click', () => {
    if (!userId) {
        showNotification('You must be signed in to clear tasks.', 'bg-red-500');
        confirmationModal.classList.add('hidden');
        return;
    }

    const batch = writeBatch(db);
    tasks.forEach(task => {
        batch.delete(getTaskDocRef(userId, task.id));
    });

    batch.commit().then(() => {
        showNotification('All tasks cleared!', 'bg-red-500');
        confirmationModal.classList.add('hidden');
    }).catch(error => {
        console.error("Batch delete failed:", error);
        showNotification('Error clearing tasks.', 'bg-red-500');
        confirmationModal.classList.add('hidden');
    });
});

themeToggle.addEventListener('click', function() {
    if (body.classList.contains('dark-mode')) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
});

filterContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
        // Update active class
        filterContainer.querySelectorAll('.filter-btn').forEach(btn =>
            // Remove Tailwind-specific active classes and custom 'active' class
            btn.classList.remove('active', 'bg-indigo-600', 'text-white', 'dark:bg-indigo-400', 'dark:text-gray-900')
        );
        
        // Add Tailwind-specific active classes and custom 'active' class
        e.target.classList.add('active'); // Add the custom CSS class for active state
        
        // This is necessary because the custom CSS in style.css targets the simple 'active' class
        // and sets the proper colors defined there.

        // Update filter state and re-render
        currentFilter = e.target.dataset.category;
        savePreference('filter', currentFilter);
        renderFilteredTasks();
    }
});

searchInput.addEventListener('input', (e) => {
    currentSearchTerm = e.target.value;
    renderFilteredTasks();
});

sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    savePreference('sort', currentSort);
    renderFilteredTasks();
});


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadPreferences();

    // Initial filter button styling
    const activeFilterButton = filterContainer.querySelector(`[data-category="${currentFilter}"]`);
    if (activeFilterButton) {
         // Apply only the custom CSS 'active' class defined in style.css
         activeFilterButton.classList.add('active');
    } else {
        // Default to All if preference is invalid
        currentFilter = 'All';
        filterContainer.querySelector(`[data-category="All"]`).classList.add('active');
    }
});