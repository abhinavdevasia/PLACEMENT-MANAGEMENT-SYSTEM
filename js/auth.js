// Authentication & Session Management Logic
// Handles Sign In, Sign Up, Log Out, Forgot Password, and Route Protection based on roles.

// Listen for Auth changes to protect pages and handle redirects
document.addEventListener('DOMContentLoaded', () => {
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged((user) => {
      handleRouteProtection(user);
    });
  }
});

// Protect routes depending on user login state and role
async function handleRouteProtection(user) {
  const currentPath = window.location.pathname;
  const isDashboardPage = currentPath.includes('/student/') || currentPath.includes('/recruiter/') || currentPath.includes('/admin/');
  const isAuthPage = currentPath.includes('login.html') || currentPath.includes('register.html');

  if (!user) {
    // If not logged in and trying to access dashboard, redirect to login page
    if (isDashboardPage) {
      window.location.href = getRelativePathPrefix(currentPath) + 'login.html';
    }
  } else {
    // User is logged in, fetch their role from the 'users' collection
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const role = userData.role;

        // Redirect logged-in users away from login/register to their dashboard
        if (isAuthPage) {
          redirectToDashboard(role, currentPath);
        }

        // Verify they are on the correct dashboard. If not, redirect to the correct one
        if (currentPath.includes('/student/') && role !== 'student') {
          redirectToDashboard(role, currentPath);
        } else if (currentPath.includes('/recruiter/') && role !== 'recruiter') {
          redirectToDashboard(role, currentPath);
        } else if (currentPath.includes('/admin/') && role !== 'admin') {
          redirectToDashboard(role, currentPath);
        }
      } else {
        console.error("User document does not exist in Firestore.");
        // Log out user if profile not found (cleanup)
        await auth.signOut();
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
    }
  }
}

// Redirect utility based on role and path structure
function redirectToDashboard(role, currentPath) {
  const prefix = getRelativePathPrefix(currentPath);
  if (role === 'student') {
    window.location.href = prefix + 'student/dashboard.html';
  } else if (role === 'recruiter') {
    window.location.href = prefix + 'recruiter/dashboard.html';
  } else if (role === 'admin') {
    window.location.href = prefix + 'admin/dashboard.html';
  }
}

// Calculate the relative path prefix (../) based on the depth of the current folder
function getRelativePathPrefix(path) {
  if (path.includes('/student/') || path.includes('/recruiter/') || path.includes('/admin/')) {
    return '../';
  }
  return './';
}

// Register student user (Firebase Auth + Firestore Profile Setup)
async function registerStudent(name, registerNumber, email, phone, department, year, cgpa, skills, password) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;

    // 1. Add user identity role map
    await db.collection('users').doc(uid).set({
      uid: uid,
      email: email,
      name: name,
      role: 'student',
      createdAt: new Date().toISOString()
    });

    // 2. Add detailed student profile info
    await db.collection('students').doc(uid).set({
      uid: uid,
      name: name,
      registerNumber: registerNumber,
      email: email,
      phone: phone,
      department: department,
      year: year,
      cgpa: parseFloat(cgpa),
      skills: skills.split(',').map(s => s.trim()).filter(s => s),
      resumeUrl: '',
      resumeName: '',
      status: 'approved', // Approved by default for simple academic prototype
      updatedAt: new Date().toISOString()
    });

    return { success: true };
  } catch (error) {
    console.error("Error registering student:", error);
    return { success: false, message: error.message };
  }
}

// Register recruiter user (Firebase Auth + Firestore Profile Setup)
async function registerRecruiter(name, email, phone, companyName, password) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;

    // 1. Add user identity role map
    await db.collection('users').doc(uid).set({
      uid: uid,
      email: email,
      name: name,
      role: 'recruiter',
      createdAt: new Date().toISOString()
    });

    // 2. Add detailed recruiter profile info
    await db.collection('recruiters').doc(uid).set({
      uid: uid,
      name: name,
      email: email,
      phone: phone,
      companyName: companyName,
      status: 'pending', // Awaiting Placement Officer's Approval
      updatedAt: new Date().toISOString()
    });

    // 3. Setup default company profile info
    await db.collection('companies').doc(uid).set({
      name: companyName,
      industry: 'Technology Services',
      website: '',
      description: `Welcome to ${companyName}! We are a newly registered business looking for talented freshers.`,
      location: 'India'
    });

    return { success: true, pendingApproval: true };
  } catch (error) {
    console.error("Error registering recruiter:", error);
    return { success: false, message: error.message };
  }
}

// Login User
async function loginUser(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;
    
    // Check recruiter approval status before dashboard redirection
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      
      if (userData.role === 'recruiter') {
        const recDoc = await db.collection('recruiters').doc(uid).get();
        if (recDoc.exists && recDoc.data().status === 'pending') {
          // Temporarily sign out
          await auth.signOut();
          return { success: false, message: "Your recruiter profile is pending approval from the Placement Officer." };
        }
      }
      return { success: true, role: userData.role };
    }
    return { success: false, message: "User role configuration not found." };
  } catch (error) {
    console.error("Error logging in:", error);
    return { success: false, message: error.message };
  }
}

// Logout User
async function logoutUser() {
  try {
    await auth.signOut();
    const currentPath = window.location.pathname;
    window.location.href = getRelativePathPrefix(currentPath) + 'login.html';
  } catch (error) {
    console.error("Error logging out:", error);
  }
}

// Forgot Password Request
async function resetPassword(email) {
  try {
    await auth.sendPasswordResetEmail(email);
    return { success: true };
  } catch (error) {
    console.error("Error sending password reset:", error);
    return { success: false, message: error.message };
  }
}
