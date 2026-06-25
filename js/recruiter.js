// Recruiter Dashboard Operations Logic

let currentRecruiterUser = null;
let recruiterProfileData = null;
let recruiterCompanyData = null;
let recruiterJobsList = [];
let recruiterApplicantsList = [];
let unsubNotifications = null;

// Page Initialization
document.addEventListener('DOMContentLoaded', () => {
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        currentRecruiterUser = user;
        await loadRecruiterProfile();
        await loadJobsData();
        await loadApplicantsData();
        await loadAnnouncements();

        // Connect Notifications
        unsubNotifications = bindNotificationsListener(user.uid, (notifs) => {
          updateNotificationUI(notifs, 'notif-list', 'notif-badge');
          document.getElementById('btn-clear-notif').onclick = () => {
            markAllNotificationsAsRead(user.uid, notifs);
          };
        });
      }
    });
  }
});

// Clean up listener
window.addEventListener('beforeunload', () => {
  if (unsubNotifications) unsubNotifications();
});

// Sidebar tab swapper
function switchTab(tabName) {
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.remove('active');
  });

  const targetPanel = document.getElementById(`panel-${tabName}`);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

  const currentLink = Array.from(document.querySelectorAll('.sidebar-link')).find(link => 
    link.getAttribute('onclick').includes(`'${tabName}'`)
  );
  if (currentLink) {
    currentLink.classList.add('active');
  }
}

// Load recruiter and company profile docs
async function loadRecruiterProfile() {
  try {
    const recDoc = await db.collection('recruiters').doc(currentRecruiterUser.uid).get();
    if (recDoc.exists) {
      recruiterProfileData = recDoc.data();
      
      document.getElementById('header-welcome-name').innerText = `Welcome, ${recruiterProfileData.name}`;
      document.getElementById('header-company-name').innerText = `Company: ${recruiterProfileData.companyName}`;
      document.getElementById('profile-card-name').innerText = recruiterProfileData.name;
      
      const initials = recruiterProfileData.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
      document.getElementById('header-avatar').innerText = initials;
      
      document.getElementById('company-name').value = recruiterProfileData.companyName;
    }

    const compDoc = await db.collection('companies').doc(currentRecruiterUser.uid).get();
    if (compDoc.exists) {
      recruiterCompanyData = compDoc.data();
      document.getElementById('company-industry').value = recruiterCompanyData.industry || '';
      document.getElementById('company-website').value = recruiterCompanyData.website || '';
      document.getElementById('company-location').value = recruiterCompanyData.location || '';
      document.getElementById('company-desc').value = recruiterCompanyData.description || '';
    }
  } catch (err) {
    console.error("Error reading recruiter profile details:", err);
  }
}

// Save company profile edit
async function saveCompanyProfile(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerText = "Saving Profile...";

  const industry = document.getElementById('company-industry').value.trim();
  const website = document.getElementById('company-website').value.trim();
  const location = document.getElementById('company-location').value.trim();
  const description = document.getElementById('company-desc').value.trim();

  try {
    await db.collection('companies').doc(currentRecruiterUser.uid).set({
      name: recruiterProfileData.companyName,
      industry,
      website,
      location,
      description
    }, { merge: true });

    // Reload UI state
    await loadRecruiterProfile();

    const successAlert = document.getElementById('company-alert-success');
    successAlert.style.display = 'block';
    setTimeout(() => { successAlert.style.display = 'none'; }, 4000);
  } catch (error) {
    console.error("Failed saving company profile:", error);
    const dangerAlert = document.getElementById('company-alert-danger');
    dangerAlert.style.display = 'block';
    setTimeout(() => { dangerAlert.style.display = 'none'; }, 4000);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Save Profile";
  }
}

// Load jobs posted by recruiter
async function loadJobsData() {
  try {
    const jobsSnap = await db.collection('jobs').where('recruiterId', '==', currentRecruiterUser.uid).get();
    const list = [];
    jobsSnap.forEach(doc => {
      const job = doc.data();
      job.id = doc.id;
      list.push(job);
    });
    // Sort latest first
    list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    recruiterJobsList = list;
    
    // Update Stats Card
    document.getElementById('stat-jobs-count').innerText = recruiterJobsList.length;

    renderJobsList(recruiterJobsList);
    updateApplicantJobFilterOptions(recruiterJobsList);
  } catch (error) {
    console.error("Error loading jobs:", error);
  }
}

// Populate Jobs table
function renderJobsList(jobs) {
  const tbody = document.getElementById('recruiter-jobs-tbody');
  if (!tbody) return;

  if (jobs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">You have not posted any jobs yet. Click "Post New Job" to start.</td></tr>`;
    return;
  }

  tbody.innerHTML = jobs.map(job => `
    <tr>
      <td><strong>${escapeHTML(job.title)}</strong></td>
      <td>${escapeHTML(job.salary)}</td>
      <td>📍 ${escapeHTML(job.location)}</td>
      <td>Min: ${job.minCgpa.toFixed(2)}</td>
      <td>${job.deadline}</td>
      <td>${job.departments ? job.departments.join(', ') : 'All'}</td>
      <td>
        <button class="btn-primary" style="padding: 0.35rem 0.65rem; font-size: 0.8rem; background: var(--primary-light);" onclick="openJobModal('${job.id}')">✏ Edit</button>
        <button class="btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.8rem; border-color: var(--danger-color); color: var(--danger-color);" onclick="handleDeleteJob('${job.id}')">🗑 Delete</button>
      </td>
    </tr>
  `).join('');
}

// Open CRUD Job Modal
function openJobModal(jobId) {
  const form = document.getElementById('jobPostForm');
  form.reset();
  
  const modalTitle = document.getElementById('job-modal-title');
  const modalIdInput = document.getElementById('job-modal-id');
  
  if (jobId) {
    // Edit Mode
    const job = recruiterJobsList.find(j => j.id === jobId);
    if (!job) return;
    
    modalTitle.innerText = "Edit Job Posting";
    modalIdInput.value = job.id;
    
    document.getElementById('job-title').value = job.title;
    document.getElementById('job-salary').value = job.salary;
    document.getElementById('job-location').value = job.location;
    document.getElementById('job-deadline').value = job.deadline;
    document.getElementById('job-min-cgpa').value = job.minCgpa;
    document.getElementById('job-skills').value = job.skills ? job.skills.join(', ') : '';
    document.getElementById('job-desc').value = job.description;

    // Check eligible departments
    const deptBoxes = document.getElementsByName('job-depts');
    deptBoxes.forEach(box => {
      box.checked = job.departments ? job.departments.includes(box.value) : false;
    });
  } else {
    // Create Mode
    modalTitle.innerText = "Create Job Posting";
    modalIdInput.value = "";
    
    // Check all depts by default
    const deptBoxes = document.getElementsByName('job-depts');
    deptBoxes.forEach(box => { box.checked = true; });
  }

  openModal('job-post-modal');
}

// Submit Create/Edit Job Post Form
async function handleJobPostSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('job-modal-id').value;
  const title = document.getElementById('job-title').value.trim();
  const salary = document.getElementById('job-salary').value.trim();
  const location = document.getElementById('job-location').value.trim();
  const deadline = document.getElementById('job-deadline').value;
  const minCgpa = parseFloat(document.getElementById('job-min-cgpa').value);
  const skills = document.getElementById('job-skills').value.split(',').map(s => s.trim()).filter(s => s);
  const description = document.getElementById('job-desc').value.trim();

  // Get eligible departments
  const deptBoxes = document.getElementsByName('job-depts');
  const departments = [];
  deptBoxes.forEach(box => {
    if (box.checked) departments.push(box.value);
  });

  if (departments.length === 0) {
    alert("Please select at least one eligible department.");
    return;
  }

  const submitBtn = document.getElementById('job-modal-submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerText = "Saving Posting...";

  try {
    const jobData = {
      recruiterId: currentRecruiterUser.uid,
      companyName: recruiterProfileData.companyName,
      title,
      salary,
      location,
      deadline,
      minCgpa,
      skills,
      departments,
      description
    };

    if (id) {
      // Edit mode
      await db.collection('jobs').doc(id).update({
        ...jobData,
        updatedAt: new Date().toISOString()
      });
      alert("Job posting updated successfully!");
    } else {
      // Create mode
      await db.collection('jobs').add({
        ...jobData,
        createdAt: new Date().toISOString()
      });

      // Broadcast system-wide notification of new job drive
      await sendSystemNotification(
        'all',
        "New Job Opening published",
        `${recruiterProfileData.companyName} is hiring for ${title} with CTC package of ${salary}. Apply before ${deadline}.`
      );

      alert("New Job posted successfully!");
    }

    closeModal('job-post-modal');
    await loadJobsData();
  } catch (error) {
    console.error("Error saving job posting:", error);
    alert("Failed to save job posting. Try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Save Job";
  }
}

// Delete Job Posting
async function handleDeleteJob(jobId) {
  const confirmDelete = confirm("Are you sure you want to delete this job posting? This action cannot be undone.");
  if (!confirmDelete) return;

  try {
    await db.collection('jobs').doc(jobId).delete();
    alert("Job posting deleted.");
    await loadJobsData();
  } catch (err) {
    console.error("Delete job posting error:", err);
    alert("Failed to delete job posting.");
  }
}

// Load applications submitted to this recruiter's jobs
async function loadApplicantsData() {
  try {
    const snap = await db.collection('applications').where('companyId', '==', currentRecruiterUser.uid).get();
    const list = [];
    snap.forEach(doc => {
      const app = doc.data();
      app.id = doc.id;
      list.push(app);
    });
    
    // Sort newest applied first
    list.sort((a,b) => new Date(b.appliedAt) - new Date(a.appliedAt));
    recruiterApplicantsList = list;

    // Update Stats Cards
    document.getElementById('stat-applicants-count').innerText = recruiterApplicantsList.length;
    
    const shortlistedCount = recruiterApplicantsList.filter(a => ['Shortlisted', 'Interview Scheduled', 'Selected'].includes(a.status)).length;
    document.getElementById('stat-shortlisted-count').innerText = shortlistedCount;

    renderApplicantsList(recruiterApplicantsList);
    renderRecentApplicantsOverview(recruiterApplicantsList);
  } catch (error) {
    console.error("Error fetching applicants:", error);
  }
}

// Populate Applicants table
function renderApplicantsList(apps) {
  const tbody = document.getElementById('recruiter-applicants-tbody');
  if (!tbody) return;

  if (apps.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No candidates have applied to your jobs yet.</td></tr>`;
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
        <td>
          <strong>${escapeHTML(app.studentName)}</strong>
          <div class="text-muted" style="font-size:0.75rem;">Reg No: ${escapeHTML(app.studentRegisterNumber)}</div>
        </td>
        <td>
          <strong>CGPA: ${app.studentCgpa.toFixed(2)}</strong>
        </td>
        <td>${escapeHTML(app.jobTitle)}</td>
        <td>${new Date(app.appliedAt).toLocaleDateString()}</td>
        <td><span class="badge ${statusClass}">${app.status}</span></td>
        <td>
          <button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="openCandidateActionModal('${app.id}')">Review Profile</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Populate Overview Panel Recent Applicants Table (Max 5 items)
function renderRecentApplicantsOverview(apps) {
  const tbody = document.getElementById('overview-recent-applicants-tbody');
  if (!tbody) return;

  const recent = apps.slice(0, 5);
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No candidates applied yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = recent.map(app => {
    let statusClass = 'badge-applied';
    if (app.status === 'Under Review') statusClass = 'badge-review';
    else if (app.status === 'Shortlisted') statusClass = 'badge-shortlisted';
    else if (app.status === 'Interview Scheduled') statusClass = 'badge-scheduled';
    else if (app.status === 'Selected') statusClass = 'badge-selected';
    else if (app.status === 'Rejected') statusClass = 'badge-rejected';

    return `
      <tr>
        <td><strong>${escapeHTML(app.studentName)}</strong></td>
        <td>${escapeHTML(app.jobTitle)}</td>
        <td><strong>${app.studentCgpa.toFixed(2)}</strong></td>
        <td>${new Date(app.appliedAt).toLocaleDateString()}</td>
        <td><span class="badge ${statusClass}">${app.status}</span></td>
      </tr>
    `;
  }).join('');
}

// Bind Job Selection drop-down filtering option
function updateApplicantJobFilterOptions(jobs) {
  const select = document.getElementById('applicant-filter-job');
  if (!select) return;
  
  select.innerHTML = '<option value="all">All Jobs</option>' + 
    jobs.map(j => `<option value="${j.id}">${escapeHTML(j.title)}</option>`).join('');
}

// Client-side Searching and Filtering Applicants
function filterApplicantsList() {
  const query = document.getElementById('applicant-search').value.toLowerCase();
  const jobFilter = document.getElementById('applicant-filter-job').value;
  const statusFilter = document.getElementById('applicant-filter-status').value;

  const filtered = recruiterApplicantsList.filter(app => {
    const matchesSearch = app.studentName.toLowerCase().includes(query) || app.studentRegisterNumber.toLowerCase().includes(query);
    const matchesJob = jobFilter === 'all' || app.jobId === jobFilter;
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;

    return matchesSearch && matchesJob && matchesStatus;
  });

  renderApplicantsList(filtered);
}

// Open Review Modal and load full details
async function openCandidateActionModal(applicationId) {
  const app = recruiterApplicantsList.find(a => a.id === applicationId);
  if (!app) return;

  document.getElementById('action-app-id').value = app.id;
  document.getElementById('action-student-id').value = app.studentId;
  document.getElementById('action-job-title').value = app.jobTitle;
  
  document.getElementById('modal-candidate-name').innerText = app.studentName;
  document.getElementById('modal-candidate-reg').innerText = `Reg No: ${app.studentRegisterNumber}`;
  document.getElementById('modal-candidate-cgpa').innerText = app.studentCgpa.toFixed(2);
  document.getElementById('modal-candidate-position').innerText = app.jobTitle;

  const initials = app.studentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('modal-candidate-avatar').innerText = initials;

  // Set default download link
  const dlLink = document.getElementById('modal-candidate-resume-link');
  if (app.studentResumeUrl) {
    dlLink.href = app.studentResumeUrl;
    dlLink.style.display = 'inline-block';
  } else {
    dlLink.style.display = 'none';
  }

  // Pre-fill fields
  document.getElementById('action-status-select').value = app.status;
  document.getElementById('action-feedback').value = app.feedback || '';

  // Fetch full student profile to show exact department, phone, and dynamic skills list
  try {
    const studDoc = await db.collection('students').doc(app.studentId).get();
    if (studDoc.exists) {
      const profile = studDoc.data();
      document.getElementById('modal-candidate-dept').innerText = profile.department;
      document.getElementById('modal-candidate-phone').innerText = profile.phone;
      
      const skillsContainer = document.getElementById('modal-candidate-skills');
      if (profile.skills && profile.skills.length > 0) {
        skillsContainer.innerHTML = profile.skills.map(s => `<span class="badge badge-applied" style="margin-right: 0.35rem; text-transform: uppercase;">${s}</span>`).join('');
      } else {
        skillsContainer.innerHTML = `<span class="text-muted">No skills listed.</span>`;
      }
    }
  } catch (err) {
    console.error("Error reading full candidate profile details:", err);
  }

  // Handle showing conditional interview scheduler panel if currently scheduled
  toggleInterviewInputs(app.status);

  openModal('candidate-action-modal');
}

// Show interview datetime inputs conditionally
function toggleInterviewInputs(statusValue) {
  const panel = document.getElementById('interview-schedule-panel');
  const dateInput = document.getElementById('interview-datetime');
  const locInput = document.getElementById('interview-location');
  
  if (statusValue === 'Interview Scheduled') {
    panel.style.display = 'block';
    dateInput.required = true;
    locInput.required = true;
  } else {
    panel.style.display = 'none';
    dateInput.required = false;
    locInput.required = false;
  }
}

// Submit candidate action (update application status workflow, insert interviews list)
async function submitCandidateAction() {
  const appId = document.getElementById('action-app-id').value;
  const studentId = document.getElementById('action-student-id').value;
  const jobTitle = document.getElementById('action-job-title').value;
  const status = document.getElementById('action-status-select').value;
  const feedback = document.getElementById('action-feedback').value.trim();

  // If status is scheduled, check inputs
  if (status === 'Interview Scheduled') {
    const dateTime = document.getElementById('interview-datetime').value;
    const locationOrLink = document.getElementById('interview-location').value.trim();

    if (!dateTime || !locationOrLink) {
      alert("Please fill in both the Date & Time and Location/Link fields to schedule the interview.");
      return;
    }
  }

  const btn = document.querySelector('#candidate-action-modal .modal-footer button.btn-primary');
  btn.disabled = true;
  btn.innerText = "Updating Status...";

  try {
    // 1. Update application status
    await db.collection('applications').doc(appId).update({
      status: status,
      feedback: feedback,
      updatedAt: new Date().toISOString()
    });

    // 2. Perform actions depending on selection status
    if (status === 'Interview Scheduled') {
      const dateTime = document.getElementById('interview-datetime').value;
      const locationOrLink = document.getElementById('interview-location').value.trim();
      
      // Add record to interviews collection
      await db.collection('interviews').add({
        applicationId: appId,
        studentId: studentId,
        studentName: document.getElementById('modal-candidate-name').innerText,
        companyId: currentRecruiterUser.uid,
        companyName: recruiterProfileData.companyName,
        jobTitle: jobTitle,
        dateTime: dateTime,
        locationOrLink: locationOrLink,
        status: 'Scheduled',
        createdAt: new Date().toISOString()
      });

      // Notify student of interview schedule
      await sendSystemNotification(
        studentId,
        "Interview Scheduled!",
        `${recruiterProfileData.companyName} has scheduled your interview for the role of ${jobTitle} on ${new Date(dateTime).toLocaleString()}.`
      );
    } 
    else if (status === 'Shortlisted') {
      await sendSystemNotification(
        studentId,
        "Application Shortlisted",
        `Congratulations! You have been shortlisted by ${recruiterProfileData.companyName} for ${jobTitle}.`
      );
    } 
    else if (status === 'Selected') {
      await sendSystemNotification(
        studentId,
        "Placed Selection Result 🎉",
        `Congratulations! You have been Selected by ${recruiterProfileData.companyName} for the position of ${jobTitle}.`
      );
    } 
    else if (status === 'Rejected') {
      await sendSystemNotification(
        studentId,
        "Application Update",
        `Your application for ${jobTitle} at ${recruiterProfileData.companyName} was reviewed. We regret to inform you that you have not been selected.`
      );
    }

    alert("Candidate application updated successfully!");
    closeModal('candidate-action-modal');
    await loadApplicantsData();
  } catch (error) {
    console.error("Update candidate action error:", error);
    alert("Application update failed.");
  } finally {
    btn.disabled = false;
    btn.innerText = "Update Application";
  }
}

// Load announcements for Overview panel
async function loadAnnouncements() {
  try {
    const snap = await db.collection('placement_drives').get();
    const list = [];
    snap.forEach(doc => {
      const d = doc.data();
      d.id = doc.id;
      list.push(d);
    });
    list.sort((a,b) => new Date(a.date) - new Date(b.date));

    const container = document.getElementById('overview-drives-list');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `<p class="text-muted" style="text-align:center; padding: 1rem 0;">No active drives announced.</p>`;
      return;
    }

    container.innerHTML = list.map(d => `
      <div style="background-color: #f7fafc; padding: 0.75rem; border-left: 3px solid var(--secondary-color); margin-bottom: 0.75rem; border-radius: 4px;">
        <strong>${escapeHTML(d.title)}</strong>
        <div style="font-size:0.75rem; color: var(--text-muted);">Date: ${d.date}</div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// Modal actions helpers
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// Notifications dropdown toggle display helper
function toggleNotificationsDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('notif-dropdown');
  dropdown.classList.toggle('active');
}

window.addEventListener('click', () => {
  const dropdown = document.getElementById('notif-dropdown');
  if (dropdown) {
    dropdown.classList.remove('active');
  }
});

// HTML escaping helper
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
