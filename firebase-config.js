/* ============================================================
   SHARED ONLINE DATABASE (free Firebase "Spark" plan, no card needed)
   Follow SETUP.md to fill this in (takes ~10 minutes).

   Leave it empty and the site still works in LOCAL STUDIO MODE:
   custom picture uploads, rotations, and slot edits are saved
   automatically in this browser (localStorage + IndexedDB +
   direct HTML file auto-save), so you can edit everything right away.
   ============================================================ */
window.FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: ""
};

// Optional admin email list if connecting Firebase Auth + Firestore for live remote studio editing.
window.ADMIN_EMAILS = [
  // "studio@bethanyleeman.com",
];

// Studio Admin Passcode (used when Firebase is not connected so only you can open the editing dashboard).
// Change this to any private passcode you like before uploading!
window.STUDIO_PASSCODE = "bethany2026";
