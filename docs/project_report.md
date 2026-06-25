# Academic Project Report
## Campus Placement Management Portal

**A Project Report submitted in partial fulfillment of the requirements for the degree of Bachelor of Technology (B.Tech) in Computer Science & Engineering.**

---

## 1. Introduction
The recruitment process in academic institutions represents a critical bridge connecting graduates with corporate industries. A successful training and placement drive requires seamless coordination between three key stakeholders: final-year students preparing for graduation, corporate HR teams searching for talent, and placement department heads managing schedules. 

The **Campus Placement Management Portal** is a centralized web portal designed to digitize and automate placement cell procedures. It automates job alerts publishing, registration, academic qualifications validation, candidate status reviews, interview scheduling, and placement reports generation. By creating a unified workspace with role-based features, the portal minimizes delays, ensures transparency, and allows students to track application updates in real time.

---

## 2. Problem Statement
Many universities still rely on manual or semi-digitized pipelines to manage campus recruitment drives. Training and Placement Cells often handle candidate lists in Excel spreadsheets, distribute vacancy notices through email groups, and collect student resumes via shared file drives.

This manual system exhibits several limitations:
1. **Human Error in Eligibility Screening:** Placement officers must manually verify if a student satisfies a job's criteria (e.g., minimum CGPA, specific departments, required technical skills) before forwarding resumes.
2. **Communication Gaps:** Students lack real-time updates regarding their applications, often remaining uninformed if they have been shortlisted, rejected, or scheduled for interview rounds.
3. **Tracking & Analytics Overhead:** Generating statistics (placement percentages, company-wise selections, department hiring averages) requires manual calculation across multiple spreadsheet files.
4. **Data Redundancy:** Multiple copies of student profiles, contact details, and resume files are stored across email threads, causing data silos.

---

## 3. Objectives
The core objectives of the Campus Placement Management Portal are:
* **Automated Eligibility Verification:** Programmatically verify student qualifications against job posting requirements during the application phase.
* **Role-Based Access Control (RBAC):** Provide distinct dashboards and access rights for Students, Recruiters, and Placement Officers.
* **Real-time Progress Tracking:** Visual pipelines indicating the exact stage of a student's job application.
* **Decentralized Data Management:** Enable students to manage their own academic credentials and upload PDF resumes directly.
* **Interactive Reporting:** Automatically compute and display placement statistics and department selections for administrative review.

---

## 4. Existing System vs. Proposed System

### 4.1 Existing System
In the current manual workflow:
1. Placement cells receive job descriptions from corporate HR contacts.
2. Notices are printed or emailed to student lists.
3. Interested students submit resume files to placement volunteers.
4. The placement officer checks student CGPA records against lists and emails selected resumes to the company.
5. Companies email shortlist lists, which the cell publishes manually.

**Drawbacks:** Heavy paperwork, delays in scheduling, risk of unqualified student applications, and lack of visual data presentation.

### 4.2 Proposed System
The proposed system digitizes the entire lifecycle:
1. Recruiters register company profiles and publish jobs.
2. The portal screens student profiles in real-time, blocking ineligible students and showing clear reasons.
3. Eligible students apply with a single click, instantly attaching their uploaded PDF resumes.
4. Recruiters view candidates, review skills and grades, and download resumes. They update application stages online.
5. Students receive notifications and track their status in real time.
6. The Placement Officer oversees recruiter approvals, drive announcements, and reviews selection dashboards.

| Feature | Existing System | Proposed System |
| :--- | :--- | :--- |
| **Eligibility Validation** | Manual spreadsheet checks | Instant programmatic filter |
| **Application Pipeline** | Email submissions | One-click button |
| **Status Updates** | Delayed lists on notice boards | Real-time visual progress tracker |
| **Interview Coordination** | Email cycles | Direct recruiter schedule module |
| **Reports and Charts** | Manual calculation | Real-time CSS charts dashboard |

---

## 5. System Architecture
The portal is structured as a client-side Single Page Application wrapper connected to serverless backend cloud databases.

```
+--------------------------------------------------------+
|                      CLIENT LAYER                      |
|                                                        |
|   +------------------------------------------------+   |
|   |                  index.html                    |   |
|   |           Landing, About & Contact             |   |
|   +-------------------+----------------------------+   |
|                       |                                |
|   +-------------------+----------------------------+   |
|   |         login.html & register.html             |   |
|   |         Authentication Credentials Form        |   |
|   +-------------------+----------------------------+   |
|                       |                                |
|   +---------+---------+---------+---------+--------+   |
|   |         |                   |         |        |   |
| +-+---------+-+               +-+---------+-+      |   |
| | student/    |               | recruiter/  |      |   |
| | dashboard   |               | dashboard   |      |   |
| +-------------+               +-------------+      |   |
|                                                    |   |
|                               +-------------+      |   |
|                               | admin/      | <----+   |
|                               | dashboard   |          |
|                               +-------------+          |
+--------------------------------------|-----------------+
                                       |
                                       v
+--------------------------------------|-----------------+
|                    BACKEND SERVICES  |                 |
|                                      |                 |
|  +--------------------+  +-----------v----------+      |
|  |   Firebase Auth    |  |  Firestore Database  |      |
|  |  Email/Password    |  |  Relational Docs     |      |
|  +--------------------+  +----------------------+      |
|                                      |                 |
|                          +-----------v----------+      |
|                          |   Firebase Storage   |      |
|                          |   PDF Resume Files   |      |
|                          +----------------------+      |
+--------------------------------------------------------+
```

---

## 6. Module Description

### 6.1 Authentication Module
Provides registration, login, logout, and password recovery features. Uses role claims stored in the database to prevent cross-role dashboard access.
* **Redirection:** Unauthenticated users attempting to access dashboards are automatically redirected to `login.html`. Logged-in users are redirected to their respective dashboards.
* **Approval Check:** Recruiter logins check if the company account has been approved by the admin.

### 6.2 Student Dashboard
Allows students to complete their academic profiles.
* **Profile Settings:** Name, registration number, department, year, CGPA, technical skills list, and PDF resume upload.
* **Job Directory:** Shows active jobs. Includes search filters and eligibility checks.
* **Application Tracker:** Visual 5-stage progress pipeline mapping application updates (Applied &rarr; Under Review &rarr; Shortlisted &rarr; Interview Scheduled &rarr; Selections/Rejections).
* **Interviews Grid:** Lists scheduled interview times and links.

### 6.3 Recruiter Dashboard
Enables recruiters to manage jobs and applicants.
* **Company Profile:** Details company description, headquarter location, industry, and corporate website.
* **Job Posts CRUD:** Allows recruiters to create, edit, and delete job postings with specific requirements.
* **Applicant Review:** Allows recruiters to view applicant lists, search candidates, review credentials, download PDF resumes, schedule interviews, and update final results.

### 6.4 Placement Officer (Admin) Dashboard
Provides administrative oversight.
* **Student Directory:** View registered students, edit details, and delete records.
* **Recruiter Verification:** Approve pending recruiter accounts, enabling them to publish jobs.
* **Drive Announcements:** Create placement drives that trigger broadcast notifications for all students.
* **Reports Panel:** Displays real-time charts mapping department selections and company placement counts.

---

## 7. Database Design (Firestore Collections)

### 7.1 Collection: `users`
Maps authenticated user identities to roles.
* `uid` (Document ID): String
* `name`: String
* `email`: String
* `role`: String (`student` | `recruiter` | `admin`)
* `createdAt`: Timestamp

### 7.2 Collection: `students`
Stores detailed student academic records.
* `uid` (Document ID): String
* `name`: String
* `registerNumber`: String
* `email`: String
* `phone`: String
* `department`: String
* `year`: String
* `cgpa`: Number
* `skills`: Array of Strings
* `resumeUrl`: String
* `resumeName`: String
* `status`: String (`approved` | `pending`)
* `updatedAt`: Timestamp

### 7.3 Collection: `recruiters`
Stores recruiter profiles.
* `uid` (Document ID): String
* `name`: String
* `email`: String
* `phone`: String
* `companyName`: String
* `status`: String (`pending` | `approved`)
* `updatedAt`: Timestamp

### 7.4 Collection: `companies`
Stores company details.
* `id` (Document ID): String (matches recruiter `uid`)
* `name`: String
* `industry`: String
* `website`: String
* `description`: String
* `location`: String

### 7.5 Collection: `jobs`
Stores job postings.
* `id` (Document ID): String
* `recruiterId`: String
* `companyName`: String
* `title`: String
* `salary`: String
* `location`: String
* `skills`: Array of Strings
* `minCgpa`: Number
* `deadline`: String
* `description`: String
* `departments`: Array of Strings
* `createdAt`: Timestamp

### 7.6 Collection: `applications`
Stores job applications.
* `id` (Document ID): String
* `jobId`: String
* `jobTitle`: String
* `companyName`: String
* `studentId`: String
* `studentName`: String
* `studentRegisterNumber`: String
* `studentCgpa`: Number
* `studentResumeUrl`: String
* `status`: String (`Applied` | `Under Review` | `Shortlisted` | `Interview Scheduled` | `Selected` | `Rejected`)
* `appliedAt`: Timestamp
* `feedback`: String

### 7.7 Collection: `interviews`
Stores scheduled interviews.
* `id` (Document ID): String
* `applicationId`: String
* `studentId`: String
* `studentName`: String
* `companyId`: String
* `companyName`: String
* `jobTitle`: String
* `dateTime`: String
* `locationOrLink`: String
* `status`: String (`Scheduled` | `Completed` | `Cancelled`)
* `createdAt`: Timestamp

### 7.8 Collection: `notifications`
Stores real-time alerts.
* `id` (Document ID): String
* `userId`: String (user ID or `all`)
* `title`: String
* `message`: String
* `read`: Boolean
* `createdAt`: Timestamp

### 7.9 Collection: `placement_drives`
Stores placement drive events.
* `id` (Document ID): String
* `title`: String
* `description`: String
* `date`: String
* `status`: String (`Upcoming` | `Ongoing` | `Completed`)
* `createdAt`: Timestamp

---

## 8. Technology Stack Description
* **HTML5:** Structures the landing, auth, and dashboard pages using semantic elements (`<header>`, `<main>`, `<aside>`, `<section>`).
* **CSS3:** Configures style rules, utilizing custom layouts, sidebar grids, responsive designs, color metrics, and transitions for dashboard views and charts.
* **JavaScript (ES6):** Implements client-side logic, routing, real-time Firestore listeners, calculations, and CSS chart rendering.
* **Firebase Authentication:** Handles login operations, password resets, and session management.
* **Cloud Firestore:** Provides a serverless document-store database.
* **Firebase Storage:** Handles PDF resume uploads.

---

## 9. Testing & Results

### 9.1 Test Cases
We performed manual and functional verification checks on the portal:

| Test ID | Module | Test Scenario | Inputs | Expected Output | Actual Output | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC01** | Auth | Register a Student | Email: `s1@t.com`, CGPA: `8.2` | DB entry created, redirected to student dashboard. | Created & redirected. | Passed |
| **TC02** | Auth | Register Recruiter Account | Company: `Amazon` | DB entry created with status `pending`, login blocked. | Blocked at login until approved. | Passed |
| **TC03** | Admin | Verify Pending Recruiter | Click "Approve" button | Recruiter status set to `approved`, sends notification. | Status updated, login allowed. | Passed |
| **TC04** | Student | Check Eligibility - CGPA | CGPA `7.0` applying to job requiring CGPA `8.0` | Displays "Not Eligible - Minimum CGPA Required: 8.00" | Correct ineligible warning displayed. | Passed |
| **TC05** | Student | Check Eligibility - Branch | IT Student applying to CSE-only job | Displays "Eligible Departments: CSE" | Ineligible warning displayed. | Passed |
| **TC06** | Student | Submit Application | Click "Apply Now" | Application doc created, sends recruiter notification. | DB entry created, alert received. | Passed |
| **TC07** | Recruiter | Schedule Interview | Set Date/Time and Meet Link | Interview scheduled, updates status, notifies student. | Meet link added, student notified. | Passed |
| **TC08** | Admin | Analytics Charts | View Selection Reports | Renders company-wise horizontal bar graphs | Graphs update based on selection counts. | Passed |

---

## 10. Future Scope
* **Automated Resume Parsing:** Integrate simple client-side parsing libraries to pre-fill skills and projects directly from uploaded PDF files.
* **Calendar Integrations:** Add calendar invite files (.ics) to interview scheduling alerts, enabling students to save interviews to Google Calendar.
* **Placement Cell Volunteers Role:** Introduce a sub-admin role for student placement representatives, allowing them to verify student grades.
* **Mock Interviews and Resources:** Add a student prep section featuring mock test papers, placement tips, and company coding questions.

---

## 11. Conclusion
The **Campus Placement Management Portal** provides a centralized, automated web platform that addresses the inefficiencies of manual placement cells. By integrating real-time databases and client-side eligibility rules, it eliminates human error in student screenings, shortens scheduling delays, and offers students clear tracking of their application statuses.

The project demonstrates a realistic, secure, and robust web engineering architecture suitable for university project requirements. It provides a foundation that can be expanded with automated email integration, scheduling algorithms, and resume parsers.
