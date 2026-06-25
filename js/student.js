// Student Dashboard Operations Logic

let currentStudentUser = null;
let studentProfileData = null;
let activeJobsList = [];
let studentApplicationsList = [];
let unsubNotifications = null;

// Page Initialization
document.addEventListener('DOMContentLoaded', () => {
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        currentStudentUser = user;
        await loadStudentProfile();
        await loadAnnouncements();
        await loadJobsData();
        await loadApplicationsData();
        await loadInterviewsData();
        
        // Connect Notifications
        unsubNotifications = bindNotificationsListener(user.uid, (notifs) => {
          updateNotificationUI(notifs, 'notif-list', 'notif-badge');
          // Bind clear all notifications button
          document.getElementById('btn-clear-notif').onclick = () => {
            markAllNotificationsAsRead(user.uid, notifs);
          };
        });
      }
    });
  }
});

// Clean up listener on unload
window.addEventListener('beforeunload', () => {
  if (unsubNotifications) unsubNotifications();
});

// Sidebar navigation switcher
function switchTab(tabName) {
  // Hide all panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  // Remove active styling from sidebar links
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.remove('active');
  });

  // Show selected panel
  const targetPanel = document.getElementById(`panel-${tabName}`);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

  // Add active style to matching link
  const currentLink = Array.from(document.querySelectorAll('.sidebar-link')).find(link => 
    link.getAttribute('onclick').includes(`'${tabName}'`)
  );
  if (currentLink) {
    currentLink.classList.add('active');
  }
}

// Load student profile details
async function loadStudentProfile() {
  try {
    const doc = await db.collection('students').doc(currentStudentUser.uid).get();
    if (doc.exists) {
      studentProfileData = doc.data();
      
      // Update Name & Registration in headers
      document.getElementById('header-welcome-name').innerText = `Welcome, ${studentProfileData.name}`;
      document.getElementById('header-student-reg').innerText = `Register No: ${studentProfileData.registerNumber}`;
      document.getElementById('profile-card-name').innerText = studentProfileData.name;
      
      // Set Avatar initials
      const initials = studentProfileData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      document.getElementById('header-avatar').innerText = initials;
      document.getElementById('overview-avatar').innerText = initials;
      
      // Set Overview details
      document.getElementById('overview-profile-name').innerText = studentProfileData.name;
      document.getElementById('overview-profile-dept').innerText = `${studentProfileData.department} - ${studentProfileData.year} Year`;
      document.getElementById('overview-profile-cgpa').innerText = studentProfileData.cgpa.toFixed(2);
      document.getElementById('overview-profile-skills-count').innerText = studentProfileData.skills ? studentProfileData.skills.length : 0;
      
      // Populate Profile tab fields
      document.getElementById('profile-name').value = studentProfileData.name;
      document.getElementById('profile-regno').value = studentProfileData.registerNumber;
      document.getElementById('profile-email').value = studentProfileData.email;
      document.getElementById('profile-phone').value = studentProfileData.phone;
      document.getElementById('profile-dept').value = studentProfileData.department;
      document.getElementById('profile-year').value = studentProfileData.year;
      document.getElementById('profile-cgpa').value = studentProfileData.cgpa;
      document.getElementById('profile-skills').value = studentProfileData.skills ? studentProfileData.skills.join(', ') : '';

      // Resume download link setup
      const resumeLinkContainer = document.getElementById('resume-download-link-container');
      const resumeNameEl = document.getElementById('uploaded-resume-name');
      const resumeBtn = document.getElementById('btn-resume-download');
      const overviewResumeStatus = document.getElementById('overview-profile-resume-status');

      if (studentProfileData.resumeUrl) {
        resumeLinkContainer.style.display = 'block';
        resumeBtn.href = studentProfileData.resumeUrl;
        resumeNameEl.innerText = studentProfileData.resumeName || 'Uploaded Resume.pdf';
        
        overviewResumeStatus.innerText = "Uploaded ✔";
        overviewResumeStatus.style.color = "var(--success-color)";
      } else {
        resumeLinkContainer.style.display = 'none';
        overviewResumeStatus.innerText = "Not Uploaded";
        overviewResumeStatus.style.color = "var(--danger-color)";
      }
    }
  } catch (err) {
    console.error("Error reading profile details:", err);
  }
}

// Update student profile details in Firestore
async function saveStudentProfile(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerText = "Saving Profiles...";
  
  const name = document.getElementById('profile-name').value.trim();
  const phone = document.getElementById('profile-phone').value.trim();
  const department = document.getElementById('profile-dept').value;
  const year = document.getElementById('profile-year').value;
  const cgpa = parseFloat(document.getElementById('profile-cgpa').value);
  const skills = document.getElementById('profile-skills').value.split(',').map(s => s.trim()).filter(s => s);

  try {
    // 1. Update Student Firestore profile
    await db.collection('students').doc(currentStudentUser.uid).update({
      name: name,
      phone: phone,
      department: department,
      year: year,
      cgpa: cgpa,
      skills: skills,
      updatedAt: new Date().toISOString()
    });

    // 2. Sync profile name to primary user accounts
    await db.collection('users').doc(currentStudentUser.uid).update({
      name: name
    });

    // Reload UI state
    await loadStudentProfile();
    await loadJobsData(); // Reload jobs as CGPA or skills changes might affect eligibility!
    
    // Show success alerts
    const successAlert = document.getElementById('profile-alert-success');
    successAlert.style.display = 'block';
    setTimeout(() => { successAlert.style.display = 'none'; }, 4000);
  } catch (error) {
    console.error("Failed updating profile details:", error);
    const dangerAlert = document.getElementById('profile-alert-danger');
    dangerAlert.style.display = 'block';
    setTimeout(() => { dangerAlert.style.display = 'none'; }, 4000);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Save Changes";
  }
}

// Upload Resume PDF File to storage
async function uploadResume() {
  const fileInput = document.getElementById('profile-resume-file');
  const statusEl = document.getElementById('resume-upload-status');
  
  if (fileInput.files.length === 0) {
    statusEl.innerText = "Please select a PDF file first.";
    statusEl.style.color = "var(--danger-color)";
    return;
  }

  const file = fileInput.files[0];
  if (file.type !== 'application/pdf') {
    statusEl.innerText = "Only PDF files are supported.";
    statusEl.style.color = "var(--danger-color)";
    return;
  }

  if (file.size > 2 * 1024 * 1024) { // 2MB Limit
    statusEl.innerText = "File size exceeds the 2MB limit.";
    statusEl.style.color = "var(--danger-color)";
    return;
  }

  statusEl.innerText = "Uploading resume file to server...";
  statusEl.style.color = "var(--primary-light)";

  try {
    const resumePath = `resumes/${currentStudentUser.uid}_${Date.now()}.pdf`;
    const storageRef = storage.ref().child(resumePath);
    
    const snapshot = await storageRef.put(file);
    const downloadUrl = await snapshot.ref.getDownloadURL();
    
    // Update student document in firestore
    await db.collection('students').doc(currentStudentUser.uid).update({
      resumeUrl: downloadUrl,
      resumeName: file.name,
      updatedAt: new Date().toISOString()
    });

    statusEl.innerText = "Resume uploaded and saved successfully!";
    statusEl.style.color = "var(--success-color)";
    
    // Reload profile
    await loadStudentProfile();
  } catch (err) {
    console.error("Resume file upload error:", err);
    statusEl.innerText = "Failed uploading resume. Try again.";
    statusEl.style.color = "var(--danger-color)";
  }
}

// Load active jobs list from DB
async function loadJobsData() {
  try {
    const jobsSnap = await db.collection('jobs').get();
    const list = [];
    jobsSnap.forEach(doc => {
      const job = doc.data();
      job.id = doc.id;
      list.push(job);
    });
    // Sort by latest
    list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    activeJobsList = list;
    
    renderJobsList(activeJobsList);
  } catch (error) {
    console.error("Failed loading jobs:", error);
  }
}

// Render jobs list inside table
function renderJobsList(jobs) {
  const tbody = document.getElementById('student-jobs-tbody');
  if (!tbody) return;

  if (jobs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No active job postings are available currently.</td></tr>`;
    return;
  }

  tbody.innerHTML = jobs.map(job => {
    // 1. Check if student has already applied
    const appliedDoc = studentApplicationsList.find(app => app.jobId === job.id);
    
    // 2. Check eligibility
    const check = checkJobEligibility(studentProfileData, job);
    
    let eligibilityBadge = '';
    if (check.eligible) {
      eligibilityBadge = `<span class="badge badge-eligible">Eligible</span>`;
    } else {
      eligibilityBadge = `<span class="badge badge-ineligible" title="${check.reason}">Ineligible</span>`;
    }

    let actionButton = '';
    if (appliedDoc) {
      actionButton = `<button class="btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="openApplicationTracker('${appliedDoc.id}')">View Status</button>`;
    } else {
      actionButton = `<button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="openJobDetailsModal('${job.id}')">Details</button>`;
    }

    return `
      <tr>
        <td>
          <strong>${escapeHTML(job.title)}</strong>
          <div class="text-muted" style="font-size: 0.8rem;">${escapeHTML(job.companyName)} | 📍 ${escapeHTML(job.location)}</div>
        </td>
        <td><strong>${escapeHTML(job.salary)}</strong></td>
        <td>
          <div style="font-size: 0.85rem; margin-bottom: 0.2rem;">Min CGPA: ${job.minCgpa.toFixed(2)}</div>
          ${eligibilityBadge}
        </td>
        <td>${job.deadline}</td>
        <td>
          ${appliedDoc ? `<span class="badge badge-applied">Applied</span>` : `<span class="badge" style="background:#e2e8f0;">Open</span>`}
        </td>
        <td>${actionButton}</td>
      </tr>
    `;
  }).join('');
}

// Client-side Searching and Filtering Jobs
function filterJobsList() {
  const query = document.getElementById('job-search').value.toLowerCase();
  const eligFilter = document.getElementById('job-filter-eligibility').value;
  const deptFilter = document.getElementById('job-filter-dept').value;

  const filtered = activeJobsList.filter(job => {
    // 1. Search Query Match
    const matchesSearch = job.title.toLowerCase().includes(query) || job.companyName.toLowerCase().includes(query);
    
    // 2. Department Filter Match
    const matchesDept = deptFilter === 'all' || (job.departments && job.departments.includes(deptFilter));
    
    // 3. Eligibility Filter Match
    const check = checkJobEligibility(studentProfileData, job);
    let matchesElig = true;
    if (eligFilter === 'eligible') matchesElig = check.eligible;
    else if (eligFilter === 'ineligible') matchesElig = !check.eligible;

    return matchesSearch && matchesDept && matchesElig;
  });

  renderJobsList(filtered);
}

// Open details model
function openJobDetailsModal(jobId) {
  const job = activeJobsList.find(j => j.id === jobId);
  if (!job) return;

  document.getElementById('modal-job-title').innerText = job.title;
  document.getElementById('modal-job-company').innerText = job.companyName;
  document.getElementById('modal-job-salary').innerText = job.salary;
  document.getElementById('modal-job-location').innerText = job.location;
  document.getElementById('modal-job-deadline').innerText = job.deadline;
  document.getElementById('modal-job-desc').innerText = job.description;

  // Render departments
  const deptsContainer = document.getElementById('modal-job-depts');
  deptsContainer.innerHTML = job.departments.map(d => `<span class="badge badge-applied" style="margin-right: 0.35rem;">${d}</span>`).join('');

  // Render skills
  const skillsContainer = document.getElementById('modal-job-skills');
  skillsContainer.innerHTML = job.skills.map(s => `<span class="badge badge-applied" style="margin-right: 0.35rem;">${s}</span>`).join('');

  // Check Eligibility and update display banner
  const check = checkJobEligibility(studentProfileData, job);
  const banner = document.getElementById('modal-job-eligibility-banner');
  const applyBtn = document.getElementById('modal-btn-apply');

  if (check.eligible) {
    banner.className = "alert alert-success";
    banner.innerHTML = `<strong>Eligible:</strong> ${check.reason}`;
    
    // Bind Apply Now click
    applyBtn.disabled = false;
    applyBtn.innerText = "Apply Now";
    applyBtn.onclick = () => handleApplyNow(job);
  } else {
    banner.className = "alert alert-danger";
    banner.innerHTML = `<strong>Not Eligible:</strong> ${check.reason}`;
    
    applyBtn.disabled = true;
    applyBtn.innerText = "Ineligible to Apply";
  }

  // Open Modal
  openModal('job-details-modal');
}

// Trigger Job Application
async function handleApplyNow(job) {
  // Check if resume exists
  if (!studentProfileData.resumeUrl) {
    alert("Please upload your resume PDF in the 'My Profile' tab before applying for jobs.");
    closeModal('job-details-modal');
    switchTab('profile');
    return;
  }

  const confirmApply = confirm(`Are you sure you want to apply for the position of ${job.title} at ${job.companyName}?`);
  if (!confirmApply) return;

  const applyBtn = document.getElementById('modal-btn-apply');
  applyBtn.disabled = true;
  applyBtn.innerText = "Submitting Application...";

  try {
    const newApp = {
      jobId: job.id,
      jobTitle: job.title,
      companyId: job.recruiterId,
      companyName: job.companyName,
      studentId: currentStudentUser.uid,
      studentName: studentProfileData.name,
      studentRegisterNumber: studentProfileData.registerNumber,
      studentCgpa: studentProfileData.cgpa,
      studentResumeUrl: studentProfileData.resumeUrl,
      status: 'Applied',
      appliedAt: new Date().toISOString(),
      feedback: 'Your job application has been successfully submitted to recruiters.'
    };

    // Save to applications collection
    const docRef = await db.collection('applications').add(newApp);
    
    // Send Recruiter notification
    await sendSystemNotification(
      job.recruiterId, 
      "New Candidate Application", 
      `${studentProfileData.name} (${studentProfileData.department}) has applied for the role: ${job.title}`
    );

    // Send Student notification
    await sendSystemNotification(
      currentStudentUser.uid, 
      "Application Submitted", 
      `You successfully applied for the position of ${job.title} at ${job.companyName}.`
    );

    alert("Application submitted successfully!");
    closeModal('job-details-modal');
    
    // Reload state
    await loadApplicationsData();
    await loadJobsData();
  } catch (error) {
    console.error("Job application error:", error);
    alert("Application submission failed. Try again.");
    applyBtn.disabled = false;
    applyBtn.innerText = "Apply Now";
  }
}

// Load applications history from DB
async function loadApplicationsData() {
  try {
    const appSnap = await db.collection('applications').where('studentId', '==', currentStudentUser.uid).get();
    const list = [];
    appSnap.forEach(doc => {
      const app = doc.data();
      app.id = doc.id;
      list.push(app);
    });
    // Sort newest applied date first
    list.sort((a,b) => new Date(b.appliedAt) - new Date(a.appliedAt));
    studentApplicationsList = list;

    // Update Counts in stats cards
    document.getElementById('stat-applied-count').innerText = studentApplicationsList.length;
    
    const shortlistedCount = studentApplicationsList.filter(a => ['Shortlisted', 'Interview Scheduled', 'Selected'].includes(a.status)).length;
    document.getElementById('stat-shortlisted-count').innerText = shortlistedCount;

    renderApplicationsList(studentApplicationsList);
  } catch (error) {
    console.error("Error loading application history:", error);
  }
}

// Populate applications table
function renderApplicationsList(apps) {
  const tbody = document.getElementById('student-applications-tbody');
  if (!tbody) return;

  if (apps.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">You have not applied to any job postings yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = apps.map(app => {
    let statusClass = 'badge-applied';
    if (app.status === 'Under Review') statusClass = 'badge-review';
    else if (app.status === 'Shortlisted') statusClass = 'badge-shortlisted';
    else if (app.status === 'Interview Scheduled') statusClass = 'badge-scheduled';
    else if (app.status === 'Selected') statusClass = 'badge-selected';
    else if (app.status === 'Rejected') statusClass = 'badge-rejected';

    return `
      <tr>
        <td><strong>${escapeHTML(app.companyName)}</strong></td>
        <td>${escapeHTML(app.jobTitle)}</td>
        <td>${new Date(app.appliedAt).toLocaleDateString()}</td>
        <td><span class="badge ${statusClass}">${app.status}</span></td>
        <td>
          <button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="openApplicationTracker('${app.id}')">Track Progress</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Open application tracker progress pipeline tracker
function openApplicationTracker(applicationId) {
  const app = studentApplicationsList.find(a => a.id === applicationId);
  if (!app) return;

  document.getElementById('tracker-job-title').innerText = app.jobTitle;
  document.getElementById('tracker-company').innerText = app.companyName;
  document.getElementById('tracker-feedback').innerText = app.feedback || 'Your application status will be updated by recruiters.';

  // Reset tracker visual states
  const steps = ['applied', 'review', 'shortlist', 'interview', 'result'];
  steps.forEach(step => {
    const el = document.getElementById(`step-${step}`);
    el.className = "tracker-step";
  });

  const resultLabel = document.getElementById('step-result-label');
  resultLabel.innerText = "Final Result";

  // Map application states to node highlights
  // Statuses: Applied, Under Review, Shortlisted, Interview Scheduled, Selected, Rejected
  if (app.status === 'Applied') {
    document.getElementById('step-applied').classList.add('active');
  } 
  else if (app.status === 'Under Review') {
    document.getElementById('step-applied').classList.add('completed');
    document.getElementById('step-review').classList.add('active');
  } 
  else if (app.status === 'Shortlisted') {
    document.getElementById('step-applied').classList.add('completed');
    document.getElementById('step-review').classList.add('completed');
    document.getElementById('step-shortlist').classList.add('active');
  } 
  else if (app.status === 'Interview Scheduled') {
    document.getElementById('step-applied').classList.add('completed');
    document.getElementById('step-review').classList.add('completed');
    document.getElementById('step-shortlist').classList.add('completed');
    document.getElementById('step-interview').classList.add('active');
  } 
  else if (app.status === 'Selected') {
    document.getElementById('step-applied').classList.add('completed');
    document.getElementById('step-review').classList.add('completed');
    document.getElementById('step-shortlist').classList.add('completed');
    document.getElementById('step-interview').classList.add('completed');
    
    const resNode = document.getElementById('step-result');
    resNode.classList.add('completed');
    resultLabel.innerText = "Selected ✔";
  } 
  else if (app.status === 'Rejected') {
    // If rejected, highlight final step in red
    document.getElementById('step-applied').classList.add('completed');
    
    const resNode = document.getElementById('step-result');
    resNode.className = "tracker-step rejected";
    resultLabel.innerText = "Rejected ✘";
  }

  openModal('app-progress-modal');
}

// Load scheduled interview rounds
async function loadInterviewsData() {
  try {
    const snap = await db.collection('interviews').where('studentId', '==', currentStudentUser.uid).get();
    const list = [];
    snap.forEach(doc => {
      const interview = doc.data();
      interview.id = doc.id;
      list.push(interview);
    });
    // Sort by chronological order
    list.sort((a,b) => new Date(a.dateTime) - new Date(b.dateTime));
    
    // Update Stats Card count
    document.getElementById('stat-interviews-count').innerText = list.filter(i => i.status === 'Scheduled').length;

    renderInterviewsList(list);
  } catch (error) {
    console.error("Error loading interview list:", error);
  }
}

// Populate interviews list
function renderInterviewsList(interviews) {
  const tbody = document.getElementById('student-interviews-tbody');
  if (!tbody) return;

  if (interviews.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No upcoming interviews scheduled at this time.</td></tr>`;
    return;
  }

  tbody.innerHTML = interviews.map(i => {
    let statusClass = 'badge-applied';
    if (i.status === 'Scheduled') statusClass = 'badge-scheduled';
    else if (i.status === 'Completed') statusClass = 'badge-selected';
    else if (i.status === 'Cancelled') statusClass = 'badge-rejected';

    let locationCell = '';
    if (i.locationOrLink.startsWith('http')) {
      locationCell = `<a href="${i.locationOrLink}" target="_blank" style="color: var(--primary-light); font-weight:600; text-decoration: none;">💻 Click to Join Meeting</a>`;
    } else {
      locationCell = `🏢 ${escapeHTML(i.locationOrLink)}`;
    }

    return `
      <tr>
        <td><strong>${escapeHTML(i.companyName)}</strong></td>
        <td>${escapeHTML(i.jobTitle)}</td>
        <td>
          <span style="font-weight: 500;">${new Date(i.dateTime).toLocaleDateString()}</span>
          <div style="font-size:0.8rem; color:var(--text-muted);">${new Date(i.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        </td>
        <td>${locationCell}</td>
        <td><span class="badge ${statusClass}">${i.status}</span></td>
      </tr>
    `;
  }).join('');
}

// Load Placement Drive announcements for Overview panel
async function loadAnnouncements() {
  try {
    const snap = await db.collection('placement_drives').get();
    const list = [];
    snap.forEach(doc => {
      const drive = doc.data();
      drive.id = doc.id;
      list.push(drive);
    });
    // Sort upcoming first
    list.sort((a,b) => new Date(a.date) - new Date(b.date));

    const container = document.getElementById('overview-drives-list');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `<p class="text-muted" style="text-align:center; padding: 1.5rem;">No active placement drives announced yet.</p>`;
      return;
    }

    container.innerHTML = list.map(drive => `
      <div style="border-left: 4px solid var(--primary-light); background-color: #f7fafc; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
          <h3 style="font-size: 1.05rem; color: var(--primary-color); font-weight:600;">${escapeHTML(drive.title)}</h3>
          <span class="badge badge-scheduled" style="font-size:0.7rem;">Drive Date: ${drive.date}</span>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-dark);">${escapeHTML(drive.description)}</p>
      </div>
    `).join('');
  } catch (error) {
    console.error("Failed loading announcements:", error);
  }
}

// Modal Toggle Helpers
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// Notifications toggle drop-down display helper
function toggleNotificationsDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('notif-dropdown');
  dropdown.classList.toggle('active');
}

// Close notifications bell dropdown if click outside
window.addEventListener('click', () => {
  const dropdown = document.getElementById('notif-dropdown');
  if (dropdown) {
    dropdown.classList.remove('active');
  }
});
