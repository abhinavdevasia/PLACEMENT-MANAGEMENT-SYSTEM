// Eligibility Verification Engine
// Checks student profile details against job requirements and returns eligibility status + reasons.

/**
 * Checks if a student is eligible for a specific job post.
 * @param {Object} student - Student profile document from Firestore
 * @param {Object} job - Job post document from Firestore
 * @returns {Object} { eligible: boolean, reason: string }
 */
function checkJobEligibility(student, job) {
  // 1. Check CGPA Eligibility
  if (student.cgpa < job.minCgpa) {
    return {
      eligible: false,
      reason: `Minimum CGPA Required: ${job.minCgpa.toFixed(2)} (Your CGPA: ${student.cgpa.toFixed(2)})`
    };
  }

  // 2. Check Department Eligibility
  if (job.departments && job.departments.length > 0) {
    const studentDept = student.department ? student.department.toUpperCase() : '';
    const eligibleDepts = job.departments.map(d => d.toUpperCase());
    
    if (!eligibleDepts.includes(studentDept)) {
      return {
        eligible: false,
        reason: `Eligible Departments: ${job.departments.join(', ')} (Your Department: ${student.department || 'N/A'})`
      };
    }
  }

  // 3. Check Required Skills Eligibility
  if (job.skills && job.skills.length > 0) {
    const studentSkills = (student.skills || []).map(s => s.toLowerCase().trim());
    const requiredSkills = job.skills.map(s => s.toLowerCase().trim());
    
    const missingSkills = requiredSkills.filter(skill => !studentSkills.includes(skill));
    
    if (missingSkills.length > 0) {
      // Capitalize missing skills for professional display
      const formattedMissing = missingSkills.map(s => s.toUpperCase());
      return {
        eligible: false,
        reason: `Missing Required Skills: ${formattedMissing.join(', ')}`
      };
    }
  }

  // If all criteria passed, student is eligible!
  return {
    eligible: true,
    reason: "Eligible to Apply"
  };
}
