
document.addEventListener('DOMContentLoaded', () => {
    // Firebase Configuration
    const firebaseConfig = {
        apiKey: "AIzaSyDynU5hwDfHunzEWxaMEfpfTcOPZd04WGM",
        authDomain: "newapp-b2726.firebaseapp.com",
        projectId: "newapp-b2726",
        storageBucket: "newapp-b2726.firebasestorage.app",
        messagingSenderId: "1034923802836",
        appId: "1:1034923802836:web:0124e33d99772cac89bb41"
    };

    // Initialize Firebase
    let app, auth, db;
    let currentUser = null;
    let unsubscribeTasks = null;

    try {
        const { initializeApp, getAuth, getFirestore, onAuthStateChanged,
            createUserWithEmailAndPassword, signInWithEmailAndPassword,
            signInWithPopup, GoogleAuthProvider, signOut,
            collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc,
            query, where, orderBy }
            = window.firebaseModules;

        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        // Auth State Observer
        onAuthStateChanged(auth, (user) => {
            currentUser = user;
            if (user) {
                // User is signed in
                showApp(user);
                loadTasks(user.uid);
            } else {
                // User is signed out
                showAuthModal();
                tasks = []; // Clear local tasks
                renderTasks();
                updateStats();
            }
        });

    } catch (e) {
        console.error("Firebase Initialization Error:", e);
        // Fallback or Alert?
        // document.getElementById('auth-error').textContent = "Firebase Config Missing. Please update script.js";
    }

    // State
    let tasks = [];
    let currentFilter = 'all';

    // DOM Elements - App
    const taskInput = document.getElementById('task-input');
    const addBtn = document.getElementById('add-btn');
    const taskList = document.getElementById('task-list');
    const filterBtns = document.querySelectorAll('.filter-btn');

    // DOM Elements - Auth
    const authModal = document.getElementById('auth-modal');
    const authForm = document.getElementById('auth-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const googleBtn = document.getElementById('google-signin-btn');
    const authTabs = document.querySelectorAll('.auth-tab');
    const authError = document.getElementById('auth-error');
    const authTitle = document.getElementById('auth-title');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const userProfile = document.getElementById('user-profile');
    const userEmailSpan = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn');

    let isLoginMode = true;

    // --- Auth Logic ---

    // Toggle Login/Register
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            isLoginMode = tab.dataset.tab === 'login';

            authTitle.textContent = isLoginMode ? 'Welcome Back' : 'Create Account';
            authSubmitBtn.textContent = isLoginMode ? 'Log In' : 'Sign Up';
            authError.textContent = '';
        });
    });

    // Email/Password Auth
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;
        authError.textContent = '';

        try {
            if (isLoginMode) {
                await window.firebaseModules.signInWithEmailAndPassword(auth, email, password);
            } else {
                await window.firebaseModules.createUserWithEmailAndPassword(auth, email, password);
            }
            // onAuthStateChanged will handle the rest
            authModal.classList.remove('show');
        } catch (error) {
            authError.textContent = getErrorMessage(error.code);
        }
    });

    // Google Auth
    googleBtn.addEventListener('click', async () => {
        try {
            const provider = new window.firebaseModules.GoogleAuthProvider();
            await window.firebaseModules.signInWithPopup(auth, provider);
            authModal.classList.remove('show');
        } catch (error) {
            authError.textContent = getErrorMessage(error.code);
        }
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        window.firebaseModules.signOut(auth);
    });


    // --- App Logic ---

    function showApp(user) {
        authModal.classList.remove('show');
        userProfile.style.display = 'flex';
        userEmailSpan.textContent = user.email;
    }

    function showAuthModal() {
        authModal.classList.add('show');
        userProfile.style.display = 'none';
        if (unsubscribeTasks) unsubscribeTasks();
    }

    function getErrorMessage(code) {
        switch (code) {
            case 'auth/invalid-email': return 'Invalid email address.';
            case 'auth/user-disabled': return 'User account is disabled.';
            case 'auth/user-not-found': return 'User not found.';
            case 'auth/wrong-password': return 'Incorrect password.';
            case 'auth/email-already-in-use': return 'Email already in use.';
            case 'auth/weak-password': return 'Password is too weak.';
            default: return 'An error occurred. Please try again.';
        }
    }

    // Load Tasks (Realtime)
    function loadTasks(uid) {
        const q = window.firebaseModules.query(
            window.firebaseModules.collection(db, `users/${uid}/tasks`),
            window.firebaseModules.orderBy('createdAt', 'desc')
        );

        unsubscribeTasks = window.firebaseModules.onSnapshot(q, (snapshot) => {
            tasks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            renderTasks();
            updateStats();
        });
    }

    // Add Task
    async function addTask() {
        const text = taskInput.value.trim();
        if (text === '') return;
        if (!currentUser) return;

        try {
            await window.firebaseModules.addDoc(window.firebaseModules.collection(db, `users/${currentUser.uid}/tasks`), {
                text: text,
                completed: false,
                createdAt: Date.now()
            });
            taskInput.value = '';
        } catch (e) {
            console.error("Error adding task: ", e);
        }
    }

    // Toggle Task
    window.toggleTask = async (id) => {
        if (!currentUser) return;
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        try {
            const taskRef = window.firebaseModules.doc(db, `users/${currentUser.uid}/tasks`, id);
            await window.firebaseModules.updateDoc(taskRef, {
                completed: !task.completed
            });
        } catch (e) {
            console.error("Error toggling task: ", e);
        }
    };

    // Delete Task
    window.deleteTask = async (id) => {
        if (!currentUser) return;
        try {
            await window.firebaseModules.deleteDoc(window.firebaseModules.doc(db, `users/${currentUser.uid}/tasks`, id));
        } catch (e) {
            console.error("Error deleting task: ", e);
        }
    };


    // --- UI Rendering (Same as before) ---

    // Stats Elements
    const totalTasksEl = document.getElementById('total-tasks');
    const completedTasksEl = document.getElementById('completed-tasks');
    const pendingTasksEl = document.getElementById('pending-tasks');
    const progressPercentageEl = document.getElementById('progress-percentage');
    const progressBarEl = document.getElementById('progress-bar');

    // Badge Elements
    const badgeAll = document.getElementById('badge-all');
    const badgeActive = document.getElementById('badge-active');
    const badgeCompleted = document.getElementById('badge-completed');

    // Event Listeners
    addBtn.addEventListener('click', addTask);

    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    function renderTasks() {
        taskList.innerHTML = '';

        let filteredTasks = tasks;
        if (currentFilter === 'pending') {
            filteredTasks = tasks.filter(task => !task.completed);
        } else if (currentFilter === 'completed') {
            filteredTasks = tasks.filter(task => task.completed);
        }

        if (filteredTasks.length === 0) {
            let msg = 'No tasks found';
            if (!currentUser) msg = 'Please log in to see tasks';

            taskList.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
                    <i class="fa-solid fa-clipboard-list" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                    <p>${msg}</p>
                </div>
            `;
            return;
        }

        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;

            li.innerHTML = `
                <div class="task-checkbox-container">
                    <input type="checkbox" class="task-checkbox" 
                        ${task.completed ? 'checked' : ''} 
                        onclick="window.toggleTask('${task.id}')">
                </div>
                <span class="task-text">${escapeHtml(task.text)}</span>
                <button class="delete-btn" onclick="window.deleteTask('${task.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;

            taskList.appendChild(li);
        });
    }

    function updateStats() {
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const pending = total - completed;

        // Update counts
        totalTasksEl.textContent = total;
        completedTasksEl.textContent = completed;
        pendingTasksEl.textContent = pending;

        // Update badges
        badgeAll.textContent = total;
        badgeActive.textContent = pending;
        badgeCompleted.textContent = completed;

        // Update progress
        const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
        progressPercentageEl.textContent = `${percentage}%`;
        progressBarEl.style.width = `${percentage}%`;
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
