// Admin/Placement Officer Dashboard Operations Logic

let currentAdminUser = null;
let studentsList = [];
let recruitersList = [];
let jobsList = [];
let applicationsList = [];
let drivesList = [];
let unsubNotifications = null;

// Page Initialization
document.addEventListener('DOMContentLoaded', () => {
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        currentAdminUser = user;
        
        // Load admin welcome details
        await loadAdminInfo();
        
        // Load all data
        await loadAllDashboardData();

        // Connect notifications
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

// Load admin info headers
async function loadAdminInfo() {
  try {
    const doc = await db.collection('users').doc(currentAdminUser.uid).get();
    if (doc.exists) {
      const data = doc.data();
      document.getElementById('header-welcome-name').innerText = `Welcome, ${data.name}`;
      document.getElementById('profile-card-name').innerText = data.name;
    }
  } catch (err) {
    console.error(err);
  }
}

// Fetch all database records for the dashboard
async function loadAllDashboardData() {
  try {
    // 1. Fetch Students
    const studSnap = await db.collection('students').get();
    studentsList = [];
    studSnap.forEach(doc => {
      const s = doc.data();
      s.uid = doc.id;
      studentsList.push(s);
    });

    // 2. Fetch Recruiters
    const recSnap = await db.collection('recruiters').get();
    recruitersList = [];
    recSnap.forEach(doc => {
      const r = doc.data();
      r.uid = doc.id;
      recruitersList.push(r);
    });

    // 3. Fetch Jobs
    const jobSnap = await db.collection('jobs').get();
    jobsList = [];
    jobSnap.forEach(doc => {
      const j = doc.data();
      j.id = doc.id;
      jobsList.push(j);
    });

    // 4. Fetch Applications
    const appSnap = await db.collection('applications').get();
    applicationsList = [];
    appSnap.forEach(doc => {
      const a = doc.data();
      a.id = doc.id;
      applicationsList.push(a);
    });

    // 5. Fetch Drives
    const driveSnap = await db.collection('placement_drives').get();
    drivesList = [];
    driveSnap.forEach(doc => {
      const d = doc.data();
      d.id = doc.id;
      drivesList.push(d);
    });

    // Update UI Elements
    updateOverviewStats();
    renderStudentsList(studentsList);
    renderRecruitersList(recruitersList);
    renderDrivesList(drivesList);
    renderRecentApplications(applicationsList);
    renderRecruiterRequests(recruitersList);
    generateReports();
  } catch (error) {
    console.error("Error fetching admin data:", error);
  }
}

// Sidebar panel switcher
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

  // Trigger charts rendering when entering reports tab to load animations
  if (tabName === 'reports') {
    setTimeout(generateReports, 100);
  }
}

// Populate stats counts
function updateOverviewStats() {
  document.getElementById('stat-students-count').innerText = studentsList.length;
  document.getElementById('stat-recruiters-count').innerText = recruitersList.filter(r => r.status === 'approved').length;
  document.getElementById('stat-jobs-count').innerText = jobsList.length;
  
  const selectedCount = applicationsList.filter(a => a.status === 'Selected').length;
  document.getElementById('stat-selected-count').innerText = selectedCount;

  document.getElementById('stat-total-applications').innerText = `${applicationsList.length} Total Apps`;
}

// Populate student lists table
function renderStudentsList(students) {
  const tbody = document.getElementById('admin-students-tbody');
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No student records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = students.map(s => `
    <tr>
      <td><strong>${escapeHTML(s.registerNumber)}</strong></td>
      <td>${escapeHTML(s.name)}</td>
      <td>${escapeHTML(s.department)} - ${escapeHTML(s.year)} Year</td>
      <td><strong>${s.cgpa.toFixed(2)}</strong></td>
      <td>
        ${s.resumeUrl ? `<a href="${s.resumeUrl}" target="_blank" class="badge badge-eligible" style="text-decoration:none;">📄 View PDF</a>` : `<span class="badge badge-ineligible">No PDF</span>`}
      </td>
      <td>
        <button class="btn-primary" style="padding:0.35rem 0.65rem; font-size:0.8rem; background: var(--primary-light);" onclick="openStudentEditModal('${s.uid}')">✏ Edit</button>
        <button class="btn-secondary" style="padding:0.35rem 0.65rem; font-size:0.8rem; border-color:var(--danger-color); color:var(--danger-color);" onclick="handleDeleteStudent('${s.uid}')">🗑 Delete</button>
      </td>
    </tr>
  `).join('');
}

// Client-side Searching and Filtering Students
function filterStudentsList() {
  const query = document.getElementById('student-search').value.toLowerCase();
  const deptFilter = document.getElementById('student-filter-dept').value;
  const cgpaFilter = parseFloat(document.getElementById('student-filter-cgpa').value);

  const filtered = studentsList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(query) || s.registerNumber.toLowerCase().includes(query);
    const matchesDept = deptFilter === 'all' || s.department === deptFilter;
    const matchesCgpa = s.cgpa >= cgpaFilter;

    return matchesSearch && matchesDept && matchesCgpa;
  });

  renderStudentsList(filtered);
}

// Open Student Edit Modal
function openStudentEditModal(studentUid) {
  const s = studentsList.find(student => student.uid === studentUid);
  if (!s) return;

  document.getElementById('edit-student-id').value = s.uid;
  document.getElementById('edit-student-name').value = s.name;
  document.getElementById('edit-student-reg').value = s.registerNumber;
  document.getElementById('edit-student-dept').value = s.department;
  document.getElementById('edit-student-year').value = s.year;
  document.getElementById('edit-student-cgpa').value = s.cgpa;
  document.getElementById('edit-student-phone').value = s.phone || '';
  document.getElementById('edit-student-skills').value = s.skills ? s.skills.join(', ') : '';

  openModal('student-edit-modal');
}

// Save student details update
async function handleStudentUpdate(e) {
  e.preventDefault();

  const uid = document.getElementById('edit-student-id').value;
  const name = document.getElementById('edit-student-name').value.trim();
  const department = document.getElementById('edit-student-dept').value;
  const year = document.getElementById('edit-student-year').value;
  const cgpa = parseFloat(document.getElementById('edit-student-cgpa').value);
  const phone = document.getElementById('edit-student-phone').value.trim();
  const skills = document.getElementById('edit-student-skills').value.split(',').map(sk => sk.trim()).filter(sk => sk);

  try {
    // 1. Update Student Profile
    await db.collection('students').doc(uid).update({
      name,
      department,
      year,
      cgpa,
      phone,
      skills,
      updatedAt: new Date().toISOString()
    });

    // 2. Update user name field
    await db.collection('users').doc(uid).update({ name });

    alert("Student record updated successfully!");
    closeModal('student-edit-modal');
    await loadAllDashboardData();
  } catch (error) {
    console.error("Error updating student:", error);
    alert("Failed to update student profile.");
  }
}

// Delete student record
async function handleDeleteStudent(uid) {
  const confirmDelete = confirm("Are you sure you want to permanently delete this student record? This removes profile info and user accounts.");
  if (!confirmDelete) return;

  try {
    await db.collection('students').doc(uid).delete();
    await db.collection('users').doc(uid).delete();
    
    alert("Student record deleted successfully.");
    await loadAllDashboardData();
  } catch (err) {
    console.error("Delete student error:", err);
    alert("Failed deleting student.");
  }
}

// Populate recruiters table
function renderRecruitersList(recruiters) {
  const tbody = document.getElementById('admin-recruiters-tbody');
  if (!tbody) return;

  if (recruiters.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No recruiter records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = recruiters.map(r => {
    let statusBadge = '';
    let actionBtn = '';

    if (r.status === 'approved') {
      statusBadge = `<span class="badge badge-eligible">Approved</span>`;
      actionBtn = `<button class="btn-secondary" style="padding:0.35rem 0.65rem; font-size:0.8rem; border-color:var(--danger-color); color:var(--danger-color);" onclick="handleRemoveRecruiter('${r.uid}')">Remove</button>`;
    } else {
      statusBadge = `<span class="badge badge-review">Pending</span>`;
      actionBtn = `
        <button class="btn-primary" style="padding:0.35rem 0.65rem; font-size:0.8rem; background: var(--success-color); border:none;" onclick="handleApproveRecruiter('${r.uid}')">✔ Approve</button>
        <button class="btn-secondary" style="padding:0.35rem 0.65rem; font-size:0.8rem; border-color:var(--danger-color); color:var(--danger-color);" onclick="handleRemoveRecruiter('${r.uid}')">Reject</button>
      `;
    }

    return `
      <tr>
        <td><strong>${escapeHTML(r.companyName)}</strong></td>
        <td>${escapeHTML(r.name)}</td>
        <td>${escapeHTML(r.email)}</td>
        <td>${escapeHTML(r.phone)}</td>
        <td>${statusBadge}</td>
        <td>${actionBtn}</td>
      </tr>
    `;
  }).join('');
}

// Client-side Searching and Filtering Recruiters
function filterRecruitersList() {
  const query = document.getElementById('recruiter-search').value.toLowerCase();
  const statusFilter = document.getElementById('recruiter-filter-status').value;

  const filtered = recruitersList.filter(r => {
    const matchesSearch = r.companyName.toLowerCase().includes(query) || r.name.toLowerCase().includes(query);
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      matchesStatus = r.status === statusFilter;
    }
    return matchesSearch && matchesStatus;
  });

  renderRecruitersList(filtered);
}

// Approve recruiter request
async function handleApproveRecruiter(uid) {
  try {
    await db.collection('recruiters').doc(uid).update({
      status: 'approved',
      updatedAt: new Date().toISOString()
    });

    // Notify recruiter
    await sendSystemNotification(
      uid,
      "Recruiter Account Approved! ✔",
      "Your company profile has been approved by the Placement Cell. You can now log in and publish job postings."
    );

    alert("Recruiter account approved.");
    await loadAllDashboardData();
  } catch (error) {
    console.error("Approve recruiter error:", error);
  }
}

// Remove recruiter record
async function handleRemoveRecruiter(uid) {
  const confirmRemove = confirm("Are you sure you want to remove this recruiter? This removes their account profile, company listing, and job postings.");
  if (!confirmRemove) return;

  try {
    await db.collection('recruiters').doc(uid).delete();
    await db.collection('companies').doc(uid).delete();
    await db.collection('users').doc(uid).delete();

    // Delete jobs created by this recruiter
    const recJobs = jobsList.filter(j => j.recruiterId === uid);
    for (const job of recJobs) {
      await db.collection('jobs').doc(job.id).delete();
    }

    alert("Recruiter deleted.");
    await loadAllDashboardData();
  } catch (error) {
    console.error("Delete recruiter error:", error);
  }
}

// Populate Placement Drives table
function renderDrivesList(drives) {
  const tbody = document.getElementById('admin-drives-tbody');
  if (!tbody) return;

  if (drives.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No drives announced yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = drives.map(d => {
    let statClass = 'badge-applied';
    if (d.status === 'Upcoming') statClass = 'badge-scheduled';
    else if (d.status === 'Ongoing') statClass = 'badge-shortlisted';
    else if (d.status === 'Completed') statClass = 'badge-review';

    return `
      <tr>
        <td>
          <strong>${escapeHTML(d.title)}</strong>
          <div class="text-muted" style="font-size:0.8rem; max-width:300px; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${escapeHTML(d.description)}</div>
        </td>
        <td>${d.date}</td>
        <td><span class="badge ${statClass}">${d.status}</span></td>
        <td>
          <button class="btn-primary" style="padding:0.35rem 0.65rem; font-size:0.8rem; background: var(--primary-light);" onclick="openDriveEdit('${d.id}')">Edit</button>
          <button class="btn-secondary" style="padding:0.35rem 0.65rem; font-size:0.8rem; border-color:var(--danger-color); color:var(--danger-color);" onclick="handleDeleteDrive('${d.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Announce / Update Placement Drive
async function handleDriveSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('drive-modal-id').value;
  const title = document.getElementById('drive-title').value.trim();
  const date = document.getElementById('drive-date').value;
  const status = document.getElementById('drive-status').value;
  const description = document.getElementById('drive-desc').value.trim();

  const btn = document.getElementById('drive-submit-btn');
  btn.disabled = true;
  btn.innerText = "Saving Drive...";

  try {
    const driveData = {
      title,
      date,
      status,
      description
    };

    if (id) {
      await db.collection('placement_drives').doc(id).update({
        ...driveData,
        updatedAt: new Date().toISOString()
      });
      alert("Placement drive updated.");
    } else {
      await db.collection('placement_drives').add({
        ...driveData,
        createdAt: new Date().toISOString()
      });

      // Broadcast global announcement to student notifications
      await sendSystemNotification(
        'all',
        "New Placement Drive Announced!",
        `${title} is scheduled for campus visit on ${date}. Read drive instructions for details.`
      );
      
      alert("Placement drive announced successfully!");
    }

    cancelDriveEdit();
    await loadAllDashboardData();
  } catch (error) {
    console.error("Save placement drive error:", error);
    alert("Failed saving drive.");
  } finally {
    btn.disabled = false;
    btn.innerText = "Announce Drive";
  }
}

// Delete Drive
async function handleDeleteDrive(driveId) {
  const confirmDelete = confirm("Are you sure you want to delete this placement drive announcement?");
  if (!confirmDelete) return;

  try {
    await db.collection('placement_drives').doc(driveId).delete();
    alert("Announcement deleted.");
    await loadAllDashboardData();
  } catch (error) {
    console.error("Delete drive error:", error);
  }
}

// Set up editing drive
function openDriveEdit(driveId) {
  const d = drivesList.find(drive => drive.id === driveId);
  if (!d) return;

  document.getElementById('drive-modal-id').value = d.id;
  document.getElementById('drive-title').value = d.title;
  document.getElementById('drive-date').value = d.date;
  document.getElementById('drive-status').value = d.status;
  document.getElementById('drive-desc').value = d.description;

  document.getElementById('drive-form-title').innerText = "Edit Drive Details";
  document.getElementById('drive-submit-btn').innerText = "Update Drive";
  document.getElementById('drive-cancel-btn').style.display = 'inline-block';
}

function cancelDriveEdit() {
  document.getElementById('drivePostForm').reset();
  document.getElementById('drive-modal-id').value = "";
  
  document.getElementById('drive-form-title').innerText = "Announce Placement Drive";
  document.getElementById('drive-submit-btn').innerText = "Announce Drive";
  document.getElementById('drive-cancel-btn').style.display = 'none';
}

// Populate Recent Applications table (Overview)
function renderRecentApplications(apps) {
  const tbody = document.getElementById('admin-recent-applications-tbody');
  if (!tbody) return;

  const recent = apps.slice(0, 5);
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No applications submitted yet.</td></tr>`;
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
        <td>${escapeHTML(app.companyName)}</td>
        <td>${escapeHTML(app.jobTitle)}</td>
        <td><strong>${app.studentCgpa.toFixed(2)}</strong></td>
        <td><span class="badge ${statusClass}">${app.status}</span></td>
      </tr>
    `;
  }).join('');
}

// Populate Pending Recruiter Requests list (Overview)
function renderRecruiterRequests(recruiters) {
  const container = document.getElementById('admin-recruiter-requests-list');
  if (!container) return;

  const pending = recruiters.filter(r => r.status === 'pending');
  if (pending.length === 0) {
    container.innerHTML = `<p class="text-muted" style="text-align:center; padding: 1.5rem 0;">No pending recruiter requests.</p>`;
    return;
  }

  container.innerHTML = pending.slice(0, 3).map(r => `
    <div style="background:#f7fafc; padding:0.75rem; border: 1px solid var(--border-color); border-radius:4px; margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong>${escapeHTML(r.companyName)}</strong>
        <div class="text-muted" style="font-size:0.75rem;">Contact: ${escapeHTML(r.name)}</div>
      </div>
      <button class="btn-primary" style="padding:0.3rem 0.6rem; font-size:0.75rem; background:var(--success-color); border:none;" onclick="handleApproveRecruiter('${r.uid}')">Approve</button>
    </div>
  `).join('');
}

// Generate Reports and custom CSS Bar Charts
function generateReports() {
  const uniqueStudentsPlaced = new Set();
  const uniqueStudentsApplied = new Set();
  
  // Hash maps for counts
  const deptSelections = {};
  const companySelections = {};

  // Group applications
  applicationsList.forEach(app => {
    uniqueStudentsApplied.add(app.studentId);
    
    if (app.status === 'Selected') {
      uniqueStudentsPlaced.add(app.studentId);
      
      // Group by company
      companySelections[app.companyName] = (companySelections[app.companyName] || 0) + 1;
      
      // Group by department (need to fetch student department)
      const student = studentsList.find(s => s.uid === app.studentId);
      if (student) {
        const dept = student.department || 'Unknown';
        deptSelections[dept] = (deptSelections[dept] || 0) + 1;
      }
    }
  });

  // Calculate statistics
  const appliedCount = uniqueStudentsApplied.size;
  const placedCount = uniqueStudentsPlaced.size;
  const placementRate = appliedCount > 0 ? Math.round((placedCount / appliedCount) * 100) : 0;

  // Render text reports
  const rateEl = document.getElementById('report-placement-rate');
  const placedEl = document.getElementById('report-placed-count');
  const appliedEl = document.getElementById('report-applied-count');
  
  if (rateEl) rateEl.innerText = `${placementRate}%`;
  if (placedEl) placedEl.innerText = placedCount;
  if (appliedEl) appliedEl.innerText = appliedCount;

  // 1. Render Department Selections Chart
  const deptContainer = document.getElementById('chart-dept-container');
  if (deptContainer) {
    const depts = Object.keys(deptSelections);
    if (depts.length === 0) {
      deptContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:2rem 0;">No selections recorded yet.</div>`;
    } else {
      // Find max count for scaling bar width
      const maxVal = Math.max(...Object.values(deptSelections));
      
      deptContainer.innerHTML = depts.map(dept => {
        const val = deptSelections[dept];
        const pctWidth = maxVal > 0 ? (val / maxVal) * 100 : 0;
        
        return `
          <div class="bar-row">
            <div class="bar-label">${escapeHTML(dept)}</div>
            <div class="bar-wrapper">
              <div class="bar-fill" style="width: ${pctWidth}%; background-color: var(--primary-light);"></div>
            </div>
            <div class="bar-value">${val}</div>
          </div>
        `;
      }).join('');
    }
  }

  // 2. Render Company Selections Chart
  const companyContainer = document.getElementById('chart-company-container');
  if (companyContainer) {
    const companies = Object.keys(companySelections);
    if (companies.length === 0) {
      companyContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:2rem 0;">No selections recorded yet.</div>`;
    } else {
      const maxVal = Math.max(...Object.values(companySelections));
      
      companyContainer.innerHTML = companies.map(comp => {
        const val = companySelections[comp];
        const pctWidth = maxVal > 0 ? (val / maxVal) * 100 : 0;
        
        return `
          <div class="bar-row">
            <div class="bar-label">${escapeHTML(comp)}</div>
            <div class="bar-wrapper">
              <div class="bar-fill" style="width: ${pctWidth}%; background-color: var(--success-color);"></div>
            </div>
            <div class="bar-value">${val}</div>
          </div>
        `;
      }).join('');
    }
  }
}

// Modal helper controls
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// Announcements dropdown bell handler
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
