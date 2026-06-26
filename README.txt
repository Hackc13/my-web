CinemaHub v5 - Separate Admin + User Login

Pages:
- index.html = main website
- login.html = normal user login
- signup.html = normal user create account
- admin.html = separate admin login only
- dashboard.html = admin panel after admin login
- watch.html = video player

Important setup:
1. Add Firebase config in firebase/firebase.js
2. Enable Firebase Authentication:
   - Email/Password
   - Google provider if you want Google login
3. Enable Firestore Database

Admin email:
Open these two files:
- assets/admin-login.js
- assets/dashboard.js

Replace:
YOUR_ADMIN_EMAIL@example.com

with your real admin email.

Firestore rules:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /items/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /users/{userId} {
      allow create: if request.auth != null && request.auth.uid == userId;
      allow read, update: if request.auth != null && request.auth.uid == userId;
    }
  }
}

Flow:
- Login button opens normal user login.
- Admin button opens admin.html.
- After admin login, it redirects to dashboard.html.

Theme update: Login, signup, and admin login pages now use the original CinemaHub black/red colors.


LOGIN REQUIRED UPDATE

Now users must sign in or create an account before viewing content.

Flow:
1. User opens index.html
2. If not logged in, website redirects to login.html
3. User can log in or click Create account
4. After login/signup, user can view content
5. Watch page also requires login


SMART LOGIN FLOW UPDATE

New flow:
1. Everyone starts at login.html.
2. After login:
   - If email matches ADMIN_EMAIL, user goes to choose.html.
   - choose.html asks:
     Go to Admin Panel OR Go to Normal Page.
   - If not admin, user goes directly to index.html.
3. Main content still requires login.
4. Admin panel still requires admin email.

Important:
Replace YOUR_ADMIN_EMAIL@example.com in:
- assets/user-login.js
- assets/signup.js
- assets/choose.js
- assets/admin-login.js
- assets/dashboard.js


LOGOUT UPDATE

Logout is now available on:
- index.html content page
- watch.html video page
- choose.html admin choice page
- dashboard.html admin panel

When user clicks Logout:
- Firebase signs the user out
- User is redirected to login.html


CLEAN FIREBASE ERROR UPDATE

Login/signup/admin login pages now show short error codes only.

Example:
Instead of:
Firebase: Error (auth/invalid-email).

It shows:
auth/invalid-email


GLOBAL CLEAN ERROR UPDATE

All visible Firebase/Auth/Firestore errors are cleaned.

Examples:
Firebase: Error (auth/invalid-email). -> auth/invalid-email
Firebase: Error (auth/wrong-password). -> auth/wrong-password
FirebaseError: Missing or insufficient permissions. -> permission-denied
Firebase: Error (auth/api-key-not-valid...) -> auth/api-key-not-valid


FIRESTORE ADMIN CHECK UPDATE

This version does NOT keep admin email in JavaScript.

Admin access is checked from Firestore:

Collection:
admins

Document ID:
your admin email

Example document:
Collection: admins
Document ID: manginenichinnu13@gmail.com

Fields can be:
role: admin

The field is optional. The website only checks if the admin email document exists.

How to add admin:
1. Firebase Console
2. Firestore Database
3. Start collection
4. Collection ID: admins
5. Document ID: your admin email
6. Add field:
   role = admin

Flow:
1. User opens login.html
2. User logs in
3. Website checks Firestore admins/{userEmail}
4. If document exists, user sees choose.html:
   - Go to Admin Panel
   - Go to Normal Page
5. If document does not exist, user goes directly to index.html
6. On index.html, Admin Panel button appears only for admin users

Recommended Firestore Rules:

rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return request.auth != null
        && exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
    }

    match /admins/{email} {
      allow read: if request.auth != null && request.auth.token.email == email;
      allow write: if false;
    }

    match /items/{document} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    match /users/{userId} {
      allow create: if request.auth != null && request.auth.uid == userId;
      allow read, update: if request.auth != null && request.auth.uid == userId;
    }
  }
}


FIREBASE CONFIG ADDED

The Firebase config for project crazykiller-aff67 has been added to:
firebase/firebase.js

Next required setup:
1. Enable Firebase Authentication > Email/Password
2. Enable Firestore Database
3. Create collection: admins
4. Add document ID as your admin email
5. Add field: role = admin


SIGNUP + EMAIL VERIFICATION UPDATE

Signup now asks:
- First name
- Last name
- Phone number optional
- Email
- Password

After signup, Firebase sends an email verification message. The user must verify email before viewing content. If the user logs in before verification, another verification email is sent and verify.html opens.

Note: Firebase client-side email verification sends a secure verification link, not a 6-digit OTP. A true 6-digit email OTP requires a backend email sender such as Firebase Cloud Functions plus an email service.

Enable in Firebase:
Authentication > Sign-in method > Email/Password
Authentication > Templates > Email address verification


VERIFY REDIRECT UPDATE

When the user clicks:
I verified my email

The website now:
1. Reloads Firebase user status
2. Checks emailVerified
3. If verified:
   - Admin user goes to choose.html
   - Normal user goes to index.html
4. If not verified:
   - Shows email-not-verified-yet


BRANDING UPDATE
- CinemaHub renamed to CrazyHub
- Added custom CrazyHub logo across the website


TAB LAYOUT FIX

The large hero section now appears only on Home.
When users click Videos, Movies, Series, Images, Software, or Downloads:
- Hero banner hides
- Section title changes to the selected tab
- Only that category is shown


DOWNLOAD PROGRESS UPDATE

The Downloads tab now has a Google-style download panel.

When users click a download item:
- It shows file name
- Download percentage
- Downloaded size
- Progress bar
- Status

Important limitation:
For Google Drive or other external links, browsers may block JavaScript progress tracking because of CORS.
In that case, CrazyHub opens the browser download/new tab and shows status as opened-in-browser.
For direct same-origin files or CORS-enabled URLs, full progress tracking works.


LOGIN / VERIFY UPDATE

Email verification now appears only after signup.

New behaviour:
- Signup: sends verification email and opens verify.html.
- Login: does not ask for verification again.
- Home page and watch page allow logged-in users even if email is not verified.

If you are using Firestore rules, do not require:
request.auth.token.email_verified == true

Use:
request.auth != null

Example:
function isSignedIn() {
  return request.auth != null;
}


LOGIN REDIRECT FIX

Login button fixed.

New login behaviour:
- Click Login
- Shows checking-login
- If login is correct, redirects immediately
- Admin goes to choose.html
- Normal user goes to index.html
- No verify page during login
- If admin check fails because of Firestore permission, user still goes to index.html


GOOGLE LOGIN FINAL FIX

Fixed:
- Google login no longer goes to verify page.
- Choose page no longer checks email verification.
- Dashboard no longer checks email verification.
- Login button now works with correct page IDs.
- Google login redirects:
  Admin -> choose.html
  Normal user -> index.html

Verification behaviour:
- Signup only -> verify.html
- Login / Google login -> no verify page


LOGIN DIRECT HOME FIX

Login is now simplified:
- Email login -> index.html directly
- Google login -> index.html directly
- No admin check during login
- No verify check during login
- Admin can still use admin.html / dashboard.html

This avoids the problem where login shows success but gets stuck before redirect.


FINAL LOGIN / SIGNUP FLOW UPDATE

Email login:
- Checks Firestore admins/{email}
- Admin -> choose.html
- Normal user -> index.html

Google login:
- Checks Firestore admins/{email}
- Admin -> choose.html
- Normal user -> index.html

Choose page:
- Admin can choose Admin Panel or Normal Website
- Non-admin users are sent to index.html

Signup:
- Goes to verify.html after signup
- After successful verification, user is signed out and sent to login.html
- User must login normally after verification

Important Firestore rule for admins:
match /admins/{email} {
  allow read: if request.auth != null && request.auth.token.email == email;
  allow write: if false;
}


ADMIN DATABASE ID FIX

This version uses a named Firestore database:

export const db = getFirestore(app, "crazykiller");

Use this version if your Firestore Database dropdown shows:
crazykiller

Admin checking now searches:
admins / lowercase-email

Example:
admins
 └── youradminemail@gmail.com
      └── role: "admin"

If your Firestore database dropdown shows (default), then change firebase/firebase.js back to:
export const db = getFirestore(app);


SERIES TAB PASSWORD UPDATE

What changed:
- If anyone clicks the Series tab, it asks for a password.
- If password is correct, it opens the Series tab.
- Series items are hidden from Home until password is entered.
- Direct Series watch links also ask for the password.
- Password unlock stays for the current browser session.
- Logout clears Series unlock.

How to set password:
1. Login as admin.
2. Open Admin Dashboard.
3. Find "Series Password".
4. Enter new Series password.
5. Click "Save Series Password".

Firestore rules needed:
Add this settings rule inside match /databases/{database}/documents:

match /settings/{document} {
  allow read: if request.auth != null;
  allow write: if isAdmin();
}

Full important rules section:

function isAdmin() {
  return request.auth != null
    && exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
}

match /admins/{email} {
  allow read: if request.auth != null;
  allow write: if false;
}

match /settings/{document} {
  allow read: if request.auth != null;
  allow write: if isAdmin();
}

match /items/{document} {
  allow read: if request.auth != null;
  allow write: if isAdmin();
}

Security note:
This version stores a SHA-256 hash of the Series password in Firestore, not the plain password.
Use a strong password.


ANIMATED LOGIN UPDATE

Login and signup pages now use a browser-window style animated design inspired by the uploaded reference video.
Only the design/animation was changed.

Firebase login, Google login, admin checking, signup verification, and Series password features are kept.


DARK SPECIAL LOGIN THEME UPDATE

The login/signup animation was updated back to CrazyHub style:
- Black/red cinematic theme
- Glow animation
- Changed "Hello Friend!" to "Welcome to CrazyHub"
- Login button changed to "ENTER HUB"
- Signup button changed to "CREATE ACCESS"
- Firebase login/signup/admin/verify features are unchanged


PIC 1 LOGIN STYLE UPDATE

This update removes the outer browser frame and matches the first screenshot style:
- no top browser bar
- no outer red rectangle frame
- centered login card only
- larger card and cleaner focus


USERNAME LOGIN UPDATE

Signup changed:
- Removed first name and last name
- Added Name
- Added Username
- Phone, email, password remain the same
- Signup still goes to email verification page

Login changed:
- Users can login using Email or Username
- Username is resolved through Firestore collection:
  usernames / username
- Admin checking remains the same after login

Required Firestore rule:
match /usernames/{username} {
  allow read: if true;
  allow create: if request.auth != null
    && request.resource.data.uid == request.auth.uid
    && request.resource.data.email == request.auth.token.email;
  allow update, delete: if false;
}

Note:
Because login by username happens before Firebase Auth login, username lookup must be readable publicly.
Only username-to-email lookup is stored there.


CENTERED LOGIN UPDATE

- Centered the login card properly
- Centered the welcome text and button on the red panel
- Kept all existing functionality the same


FORGOT PASSWORD UPDATE

Added forgot-password.html.

How it works:
- User clicks "Forgot your password?"
- User enters email or username
- Website resolves username to email from Firestore usernames collection
- Firebase sends a secure password reset email
- User opens the email link and changes password securely
- User returns to login page and logs in with new password

Important:
A true 6-digit email code needs backend email sending such as Firebase Cloud Functions + email provider.
This free static version uses Firebase's secure password reset email link.


FORGOT PASSWORD CENTER FIX

- Fixed forgot password card centering
- Centered left form section
- Centered right red panel content
- Kept forgot password functionality unchanged


SIGNUP PAGE CENTER UPDATE

- Signup page is now centered like login page.
- Create Access button on login opens signup.html.
- Signup still uses Name, Username, Phone, Email, Password.
- Username login and forgot password remain unchanged.


FINAL PROFILE FIX

Fixed blank account/email button.
Clicking the email/account button opens a beautiful dropdown.
Edit Profile opens edit-profile.html.
Edit Password opens edit-password.html.
No popup/modal is used for profile editing.
