# Campus Placement Management Portal

An automated, centralized platform designed for college engineering departments that simplifies and digitizes the training and placement cell operations. It connects three core stakeholders: **Students**, **Recruiters**, and the **Placement Officer (Admin)**.

This project was built for academic demonstration, matching final year B.Tech computer science project requirements, with a focus on functional implementation, clear code structure, and data security.

---

## Technical Stack
* **Frontend:** HTML5, CSS3, JavaScript (Vanilla ES6)
* **Backend:** Firebase Client Suite (v10 Compatibility API)
  * **Firebase Authentication:** Handles secure credential validation and session redirection.
  * **Cloud Firestore:** Relational-style document collections storing profiles, job listings, and workflow stages.
  * **Firebase Storage:** Stores PDF resumes uploaded by students.

---

## Key Features
1. **Role-Based Authentication:** Distinct registration/login processes for students and recruiters, with dashboard redirections.
2. **Eligibility Checker:** An eligibility validation module checking applicant CGPA, branches/departments, and skill sets against requirements.
3. **Application Lifecycle Tracker:** A step-by-step progress pipeline tracker for students (Applied &rarr; Under Review &rarr; Shortlisted &rarr; Interview Scheduled &rarr; Selections/Rejections).
4. **Interview Scheduler:** Enables recruiters to schedule online (Google Meet link) or physical interviews.
5. **Real-time Notifications:** Dispatches instantly delivered notifications on job postings, selections, and announcements.
6. **Analytics Reports:** Renders visual department-wise and company-wise placement graphs for the Placement Officer.

---

## Folder Layout
```
campus-placement-portal/
├── index.html                   # Landing Page
├── about.html                   # About Page
├── contact.html                 # Contact Page
├── login.html                   # Login Page
├── register.html                # Registration Page
├── css/
│   ├── style.css                # Base & Navigation Styles
│   ├── auth.css                 # Login & Registration Card CSS
│   └── dashboard.css            # Sidebar layouts, Modals & Analytics Graphs CSS
├── js/
│   ├── firebase-config.js       # Firebase SDK Init & Mock fallback seed DB
│   ├── auth.js                  # Authentication redirection & protected pages rules
│   ├── student.js               # Student Profile forms & Job application actions
│   ├── recruiter.js             # Job post CRUD & candidate reviews
│   ├── admin.js                 # Verification cell approvals & charts generation
│   ├── eligibility.js           # Student qualifications checker
│   └── notifications.js         # Realtime notifications dispatcher
├── student/
│   └── dashboard.html           # Student Portal Dashboard
├── recruiter/
│   └── dashboard.html           # Recruiter Portal Dashboard
├── admin/
│   └── dashboard.html           # Placement Officer Portal Dashboard
├── docs/
│   └── project_report.md        # B.Tech Academic Capstone Project Report
├── database_rules.json          # Firebase Firestore & Storage access security rules
├── package.json                 # Dev server package references
└── README.md                    # Project documentation
```

---

## How to Run the Project

### Option A: Direct Local Preview (Mock Database Mode)
The portal is designed with a **Mock Fallback Database** that runs in `localStorage` when Firebase credentials are not provided. This lets you run and test the portal immediately out-of-the-box!

1. Open a terminal in the project directory:
   ```bash
   npm install
   npm start
   ```
   *(Alternatively, you can run `python -m http.server 8000` or double-click `index.html` to open it in a browser).*
2. Use the pre-seeded credentials below to test the dashboard roles:
   * **Student Dashboard:**
     * **Email:** `student@college.edu`
     * **Password:** `password123`
   * **Recruiter Dashboard:**
     * **Email:** `recruiter@tcs.com`
     * **Password:** `password123`
   * **Placement Officer (Admin) Dashboard:**
     * **Email:** `admin@college.edu`
     * **Password:** `password123`

### Option B: Real Firebase Production Setup
To transition from Mock Database to real Firebase Cloud services:

1. Create a new project in the [Firebase Console](https://console.firebase.google.com).
2. Go to **Authentication** and enable **Email/Password** sign-in provider.
3. Go to **Firestore Database** and choose **Create database** in *Test Mode*.
4. Go to **Storage** and choose **Create bucket** in *Test Mode*.
5. Register a **Web App** in your project settings and copy the `firebaseConfig` object.
6. Open [js/firebase-config.js](file:///js/firebase-config.js) and replace the placeholder `firebaseConfig` credentials with your own:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_REAL_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```
7. Refresh the page! The portal will now automatically connect to your Firebase project instead of the mock data layer.
