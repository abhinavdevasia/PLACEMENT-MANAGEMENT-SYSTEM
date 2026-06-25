// Notification Utilities
// Handles real-time listener bindings and sending alerts across roles.

/**
 * Sends a notification to a specific user.
 * @param {string} userId - Recipient User ID (student, recruiter, or admin ID, or 'all' for broadcast)
 * @param {string} title - Title of the notification
 * @param {string} message - Message body text
 */
async function sendSystemNotification(userId, title, message) {
  try {
    if (typeof db !== 'undefined') {
      await db.collection('notifications').add({
        userId: userId,
        title: title,
        message: message,
        read: false,
        createdAt: new Date().toISOString()
      });
      console.log(`Notification sent to ${userId}: ${title}`);
    }
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

/**
 * Setup real-time notifications listener for a specific logged-in user.
 * @param {string} userId - Current user's UID
 * @param {Function} updateUiCallback - Callback that receives the lists of notifications
 */
function bindNotificationsListener(userId, updateUiCallback) {
  if (typeof db === 'undefined') return () => {};

  // Listen to user-specific notifications OR global notifications ('all' or 'admin' depending on role)
  // For simplicity, we query notifications where userId is either the user's UID or 'all'
  // Since Firestore doesn't support 'OR' queries on the same field easily in standard SDK without complex setups,
  // we listen to the user's specific collection or do a snapshot list.
  return db.collection('notifications')
    .onSnapshot((snapshot) => {
      if (snapshot && !snapshot.empty) {
        const list = [];
        snapshot.forEach(doc => {
          const notif = doc.data();
          notif.id = doc.id;
          // Filter in memory for simplicity and robust compatibility
          if (notif.userId === userId || notif.userId === 'all') {
            list.push(notif);
          }
        });
        
        // Sort notifications by date descending
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        updateUiCallback(list);
      } else {
        updateUiCallback([]);
      }
    }, (error) => {
      console.error("Notifications listener error:", error);
    });
}

/**
 * Marks a single notification as read.
 * @param {string} notificationId 
 */
async function markNotificationAsRead(notificationId) {
  try {
    if (typeof db !== 'undefined') {
      await db.collection('notifications').doc(notificationId).update({
        read: true
      });
    }
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
  }
}

/**
 * Clears or marks all notifications as read for a user.
 * @param {string} userId 
 * @param {Array} notificationsList 
 */
async function markAllNotificationsAsRead(userId, notificationsList) {
  try {
    if (typeof db !== 'undefined') {
      const batch = db.batch ? db.batch() : null;
      
      if (batch) {
        // Real firestore batch support
        const unread = notificationsList.filter(n => !n.read && (n.userId === userId || n.userId === 'all'));
        unread.forEach(n => {
          const ref = db.collection('notifications').doc(n.id);
          batch.update(ref, { read: true });
        });
        await batch.commit();
      } else {
        // Fallback for mock db
        const unread = notificationsList.filter(n => !n.read);
        for (const n of unread) {
          await db.collection('notifications').doc(n.id).update({ read: true });
        }
      }
    }
  } catch (error) {
    console.error("Failed to clear notifications:", error);
  }
}

// UI helper to update the notification dropdown list and unread badge count
function updateNotificationUI(notifications, listElementId, badgeElementId) {
  const listEl = document.getElementById(listElementId);
  const badgeEl = document.getElementById(badgeElementId);
  
  if (!listEl) return;
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Update badge
  if (badgeEl) {
    if (unreadCount > 0) {
      badgeEl.innerText = unreadCount;
      badgeEl.style.display = 'flex';
    } else {
      badgeEl.style.display = 'none';
    }
  }

  // Populate dropdown list
  if (notifications.length === 0) {
    listEl.innerHTML = `<li class="notification-empty">No new notifications</li>`;
    return;
  }

  listEl.innerHTML = notifications.map(n => `
    <li class="notification-item ${n.read ? '' : 'unread'}" onclick="handleNotificationClick('${n.id}', '${n.read}')">
      <div class="notification-item-title">${escapeHTML(n.title)}</div>
      <div style="color: var(--text-dark);">${escapeHTML(n.message)}</div>
      <div class="notification-item-time">${formatTimeAgo(n.createdAt)}</div>
    </li>
  `).join('');
}

// Global click handler to mark read
function handleNotificationClick(id, isRead) {
  if (isRead === 'false') {
    markNotificationAsRead(id);
  }
}

// Helper to escape HTML tags to prevent XSS in academic projects
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

// Simple time formatter
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  return date.toLocaleDateString();
}
