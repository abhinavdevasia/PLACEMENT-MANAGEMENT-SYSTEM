// Firebase Configuration and Initialization
// This file initializes Firebase and exports global references for Auth, Firestore, and Storage.

// REPLACE THIS CONFIGURATION with your own Firebase project credentials from the Firebase Console.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Check if the developer has updated the configuration
const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";

if (!isFirebaseConfigured) {
  console.warn(
    "Firebase is not configured yet! Please update firebase-config.js with your project credentials.\n" +
    "You can get these from the Firebase Console: Project Settings > General > Your Apps."
  );
}

// Initialize Firebase
let app, auth, db, storage;

try {
  if (isFirebaseConfigured) {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    storage = firebase.storage();
    console.log("Firebase successfully initialized.");
  } else {
    // If not configured, we create a mock auth, db, storage structure to allow offline mock execution
    // which prevents the page from crashing and makes the application runnable right out of the box!
    console.log("Initializing Mock DB for local preview...");
    initMockDatabase();
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

// Mock Database Implementation for Demo/Fallback mode
// This stores data in localStorage so the application runs immediately without Firebase credentials.
function initMockDatabase() {
  // Mock auth state
  let currentUser = JSON.parse(localStorage.getItem('mock_current_user') || 'null');
  
  auth = {
    currentUser: currentUser,
    onAuthStateChanged: function(callback) {
      // Simulate auth state callback asynchronously
      setTimeout(() => callback(this.currentUser), 50);
    },
    signInWithEmailAndPassword: function(email, password) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
          const user = users.find(u => u.email === email && u.password === password);
          if (user) {
            this.currentUser = { uid: user.uid, email: user.email };
            localStorage.setItem('mock_current_user', JSON.stringify(this.currentUser));
            resolve({ user: this.currentUser });
          } else {
            reject(new Error("Invalid email or password."));
          }
        }, 300);
      });
    },
    createUserWithEmailAndPassword: function(email, password) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
          if (users.some(u => u.email === email)) {
            reject(new Error("Email already in use."));
            return;
          }
          const uid = 'mock_uid_' + Math.random().toString(36).substr(2, 9);
          const newUser = { uid, email, password };
          users.push(newUser);
          localStorage.setItem('mock_users', JSON.stringify(users));
          this.currentUser = { uid, email };
          localStorage.setItem('mock_current_user', JSON.stringify(this.currentUser));
          resolve({ user: this.currentUser });
        }, 300);
      });
    },
    signOut: function() {
      return new Promise((resolve) => {
        this.currentUser = null;
        localStorage.removeItem('mock_current_user');
        resolve();
      });
    },
    sendPasswordResetEmail: function(email) {
      return Promise.resolve();
    }
  };

  // Mock Firestore
  db = {
    collection: function(collectionName) {
      return {
        doc: function(docId) {
          return {
            get: function() {
              return new Promise((resolve) => {
                const data = JSON.parse(localStorage.getItem(`mock_db_${collectionName}`) || '{}');
                const docData = data[docId] || null;
                resolve({
                  exists: !!docData,
                  data: () => docData,
                  id: docId
                });
              });
            },
            set: function(docData, options) {
              return new Promise((resolve) => {
                const data = JSON.parse(localStorage.getItem(`mock_db_${collectionName}`) || '{}');
                if (options && options.merge && data[docId]) {
                  data[docId] = { ...data[docId], ...docData };
                } else {
                  data[docId] = docData;
                }
                localStorage.setItem(`mock_db_${collectionName}`, JSON.stringify(data));
                resolve();
              });
            },
            update: function(updateData) {
              return new Promise((resolve) => {
                const data = JSON.parse(localStorage.getItem(`mock_db_${collectionName}`) || '{}');
                if (data[docId]) {
                  data[docId] = { ...data[docId], ...updateData };
                  localStorage.setItem(`mock_db_${collectionName}`, JSON.stringify(data));
                }
                resolve();
              });
            },
            delete: function() {
              return new Promise((resolve) => {
                const data = JSON.parse(localStorage.getItem(`mock_db_${collectionName}`) || '{}');
                delete data[docId];
                localStorage.setItem(`mock_db_${collectionName}`, JSON.stringify(data));
                resolve();
              });
            }
          };
        },
        add: function(docData) {
          return new Promise((resolve) => {
            const data = JSON.parse(localStorage.getItem(`mock_db_${collectionName}`) || '{}');
            const id = 'mock_doc_' + Math.random().toString(36).substr(2, 9);
            data[id] = docData;
            localStorage.setItem(`mock_db_${collectionName}`, JSON.stringify(data));
            resolve({ id });
          });
        },
        where: function(field, operator, value) {
          // Simplistic filter supporting single where queries for mock purposes
          return {
            get: function() {
              return new Promise((resolve) => {
                const data = JSON.parse(localStorage.getItem(`mock_db_${collectionName}`) || '{}');
                const results = [];
                for (const key in data) {
                  let match = false;
                  const itemValue = data[key][field];
                  if (operator === '==' && itemValue === value) match = true;
                  else if (operator === 'array-contains' && Array.isArray(itemValue) && itemValue.includes(value)) match = true;
                  else if (operator === 'in' && Array.isArray(value) && value.includes(itemValue)) match = true;
                  
                  if (match) {
                    results.push({
                      id: key,
                      data: () => data[key]
                    });
                  }
                }
                resolve({
                  empty: results.length === 0,
                  forEach: function(callback) {
                    results.forEach(callback);
                  },
                  docs: results
                });
              });
            },
            onSnapshot: function(callback) {
              // Real-time updates subscription mockup
              this.get().then(snapshot => callback(snapshot));
              // Set up poll loop to watch for edits in localStorage changes
              const intervalId = setInterval(() => {
                this.get().then(snapshot => callback(snapshot));
              }, 1500);
              return () => clearInterval(intervalId); // unsubscribe function
            }
          };
        },
        get: function() {
          return new Promise((resolve) => {
            const data = JSON.parse(localStorage.getItem(`mock_db_${collectionName}`) || '{}');
            const results = [];
            for (const key in data) {
              results.push({
                id: key,
                data: () => data[key]
              });
            }
            resolve({
              empty: results.length === 0,
              forEach: function(callback) {
                results.forEach(callback);
              },
              docs: results
            });
          });
        },
        onSnapshot: function(callback) {
          this.get().then(snapshot => callback(snapshot));
          const intervalId = setInterval(() => {
            this.get().then(snapshot => callback(snapshot));
          }, 1500);
          return () => clearInterval(intervalId);
        }
      };
    }
  };

  // Mock Storage
  storage = {
    ref: function(path) {
      return {
        child: function(childPath) {
          return this; // mock nested storage reference
        },
        put: function(file) {
          return new Promise((resolve) => {
            // Mock file upload by creating a data URI or object link
            const reader = new FileReader();
            reader.onload = function(e) {
              const url = e.target.result;
              resolve({
                ref: {
                  getDownloadURL: () => Promise.resolve(url)
                }
              });
            };
            reader.readAsDataURL(file);
          });
        },
        getDownloadURL: function() {
          return Promise.resolve("https://example.com/mock-resume-download.pdf");
        }
      };
    }
  };

  // Pre-seed some default data to make the local demo immediately exciting!
  seedMockData();
}

function seedMockData() {
  if (localStorage.getItem('mock_db_seeded')) return;

  const demoUsers = [
    { uid: 'student_demo', email: 'student@college.edu', name: 'Rahul Sharma', role: 'student', password: 'password123' },
    { uid: 'recruiter_demo', email: 'recruiter@tcs.com', name: 'Amit Verma', role: 'recruiter', password: 'password123' },
    { uid: 'admin_demo', email: 'admin@college.edu', name: 'Dr. S. K. Gupta', role: 'admin', password: 'password123' }
  ];
  localStorage.setItem('mock_users', JSON.stringify(demoUsers));

  const dbUsers = {};
  demoUsers.forEach(u => {
    dbUsers[u.uid] = { uid: u.uid, name: u.name, email: u.email, role: u.role, createdAt: new Date().toISOString() };
  });
  localStorage.setItem('mock_db_users', JSON.stringify(dbUsers));

  // Seed Students
  const dbStudents = {
    'student_demo': {
      uid: 'student_demo',
      name: 'Rahul Sharma',
      registerNumber: '2022CSE1084',
      email: 'student@college.edu',
      phone: '9876543210',
      department: 'CSE',
      year: '4th',
      cgpa: 8.4,
      skills: ['Java', 'SQL', 'HTML', 'CSS', 'JavaScript'],
      resumeUrl: '',
      resumeName: '',
      status: 'approved',
      updatedAt: new Date().toISOString()
    }
  };
  localStorage.setItem('mock_db_students', JSON.stringify(dbStudents));

  // Seed Recruiters
  const dbRecruiters = {
    'recruiter_demo': {
      uid: 'recruiter_demo',
      name: 'Amit Verma',
      email: 'recruiter@tcs.com',
      phone: '9898989898',
      companyName: 'Tata Consultancy Services',
      status: 'approved',
      updatedAt: new Date().toISOString()
    }
  };
  localStorage.setItem('mock_db_recruiters', JSON.stringify(dbRecruiters));

  // Seed Companies
  const dbCompanies = {
    'recruiter_demo': {
      name: 'Tata Consultancy Services',
      industry: 'IT Services / Consulting',
      website: 'https://www.tcs.com',
      description: 'Tata Consultancy Services is an IT services, consulting and business solutions organization that has been partnering with many of the world’s largest businesses in their transformation journeys.',
      location: 'Mumbai, India'
    }
  };
  localStorage.setItem('mock_db_companies', JSON.stringify(dbCompanies));

  // Seed Jobs
  const dbJobs = {
    'job1': {
      id: 'job1',
      recruiterId: 'recruiter_demo',
      companyName: 'Tata Consultancy Services',
      title: 'Systems Engineer',
      salary: '7.5 LPA',
      location: 'Bangalore, India',
      skills: ['Java', 'SQL'],
      minCgpa: 7.0,
      deadline: '2026-07-15',
      description: 'We are looking for enthusiastic freshers with strong problem-solving skills, basic programming in Java, and solid databases foundation.',
      departments: ['CSE', 'ECE', 'IT'],
      createdAt: new Date().toISOString()
    },
    'job2': {
      id: 'job2',
      recruiterId: 'recruiter_demo',
      companyName: 'Tata Consultancy Services',
      title: 'UI Developer Intern',
      salary: '4.5 LPA',
      location: 'Pune, India',
      skills: ['HTML', 'CSS', 'JavaScript'],
      minCgpa: 6.5,
      deadline: '2026-07-20',
      description: 'Frontend designer position focusing on creating clean web interfaces. Knowledge of Vanilla CSS transitions and Javascript is required.',
      departments: ['CSE', 'IT'],
      createdAt: new Date().toISOString()
    }
  };
  localStorage.setItem('mock_db_jobs', JSON.stringify(dbJobs));

  // Seed Drives
  const dbDrives = {
    'drive1': {
      id: 'drive1',
      title: 'Mega IT Services Drive 2026',
      description: 'TCS and Infosys are visiting campus for mass recruitment. Register on the portal and keep your CGPA and skills profile updated.',
      date: '2026-07-10',
      status: 'Upcoming',
      createdAt: new Date().toISOString()
    }
  };
  localStorage.setItem('mock_db_placement_drives', JSON.stringify(dbDrives));

  localStorage.setItem('mock_db_seeded', 'true');
}
