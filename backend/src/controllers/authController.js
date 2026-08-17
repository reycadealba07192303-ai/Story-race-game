const {
  auth,
  signInWithEmailPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
} = require('../config/firebase');
const User = require('../models/User');
const Section = require('../models/Section');
const AcademicYear = require('../models/AcademicYear');
const { createNotification } = require('../utils/notify');
const { getOrCreateSettings } = require('../utils/systemSettings');
const { logAudit } = require('../utils/audit');

const ALLOWED_ROLES = ['student', 'teacher', 'admin'];

function publicUser(user) {
  return {
    id: user._id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar || '',
    section: user.section,
    sectionId: user.sectionId || null,
    xp: user.xp || 0,
    streak: user.streak || 0,
    awards: user.awards || [],
    emailVerified: Boolean(user.emailVerified),
    status: user.status || 'active',
    createdAt: user.createdAt,
  };
}

async function listSignupSections(req, res) {
  try {
    const activeYears = await AcademicYear.find({ status: 'active' }).select('_id name').lean();
    const filter = {};
    if (activeYears.length) {
      filter.$or = [
        { academicYearId: { $in: activeYears.map((y) => y._id) } },
        { academicYear: { $in: activeYears.map((y) => y.name) } },
      ];
    }

    const sections = await Section.find(filter).sort({ name: 1 }).select('name academicYear').lean();
    return res.json({
      sections: sections.map((s) => ({
        id: String(s._id),
        name: s.name,
        academicYear: s.academicYear || '',
      })),
    });
  } catch (err) {
    console.error('listSignupSections error:', err);
    return res.status(500).json({ message: 'Could not load sections.' });
  }
}

function mapAuthError(code) {
  const map = {
    EMAIL_EXISTS: 'An account with this email already exists.',
    EMAIL_NOT_FOUND: 'Invalid email or password.',
    INVALID_PASSWORD: 'Invalid email or password.',
    INVALID_LOGIN_CREDENTIALS: 'Invalid email or password.',
    USER_DISABLED: 'This account has been disabled.',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts. Please try again later.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    WEAK_PASSWORD: 'Password should be at least 6 characters.',
  };
  return map[code] || 'Authentication failed. Please try again.';
}

async function signup(req, res) {
  try {
    const { name, email, password, role: rawRole = 'student', section = 'NA', sectionId = null } = req.body;
    const role = String(rawRole || 'student').trim().toLowerCase();

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password should be at least 6 characters.' });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Choose student, teacher, or admin.' });
    }

    const settings = await getOrCreateSettings();
    if (!settings.allowRegistration && role !== 'admin') {
      return res.status(403).json({ message: 'New registrations are currently disabled by the admin.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    let firebaseUser;
    try {
      firebaseUser = await auth.createUser({
        email: normalizedEmail,
        password,
        displayName: name.trim(),
        emailVerified: false,
      });
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        return res.status(409).json({ message: 'An account with this email already exists.' });
      }
      if (err.code === 'auth/invalid-email') {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
      }
      if (err.code === 'auth/weak-password') {
        return res.status(400).json({ message: 'Password should be at least 6 characters.' });
      }
      console.error('Firebase createUser error:', err.code, err.message);
      return res.status(400).json({ message: 'Could not create account. Please try again.' });
    }

    let resolvedSection = 'NA';
    let resolvedSectionId = null;
    if (role === 'student') {
      const chosenId = sectionId && sectionId !== 'NA' ? sectionId : (section && section !== 'NA' ? section : null);
      if (chosenId) {
        const found = await Section.findById(chosenId).catch(() => null)
          || await Section.findOne({ name: String(chosenId).trim() });
        if (found) {
          resolvedSection = found.name;
          resolvedSectionId = found._id;
        }
      }
    }

    await auth.setCustomUserClaims(firebaseUser.uid, { role });

    let user;
    try {
      user = await User.create({
        firebaseUid: firebaseUser.uid,
        email: normalizedEmail,
        name: name.trim(),
        role,
        section: resolvedSection,
        sectionId: resolvedSectionId,
        emailVerified: false,
        status: 'pending',
      });
    } catch (dbErr) {
      await auth.deleteUser(firebaseUser.uid).catch(() => {});
      throw dbErr;
    }

    // Sign in once to obtain idToken for verification email — do not return session to client
    try {
      const authResult = await signInWithEmailPassword(normalizedEmail, password);
      await sendEmailVerification(authResult.idToken);
    } catch (verifyErr) {
      console.error('Could not send verification email:', verifyErr.code || verifyErr.message);
    }

    await createNotification({
      userId: user._id,
      title: 'Verify your email',
      message: 'We sent a verification link to your inbox. Confirm it before signing in.',
      type: 'system',
      link: '/signin',
    });

    await logAudit({
      req,
      actor: user,
      action: 'auth.signup',
      category: 'auth',
      summary: `${user.name} signed up as ${user.role}`,
      targetType: 'user',
      targetId: user._id,
      targetName: user.email,
    });

    return res.status(201).json({
      message: 'Account created! Check your email for a verification link before signing in.',
      requiresVerification: true,
      email: normalizedEmail,
    });
  } catch (err) {
    console.error('Signup error:', err);
    if (err?.name === 'MongooseError' || err?.name === 'MongoServerError' || /buffering timed out|ECONNREFUSED|MongoNetwork/i.test(String(err?.message || ''))) {
      return res.status(503).json({ message: 'Database is not connected. Please restart the backend and try again.' });
    }
    return res.status(500).json({ message: 'Could not create account. Please try again.' });
  }
}

async function signin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let authResult;

    try {
      authResult = await signInWithEmailPassword(normalizedEmail, password);
    } catch (err) {
      return res.status(401).json({ message: mapAuthError(err.code) });
    }

    let user = await User.findOne({ firebaseUid: authResult.localId });

    if (!user) {
      const firebaseUser = await auth.getUser(authResult.localId);
      const role = firebaseUser.customClaims?.role || 'student';
      user = await User.create({
        firebaseUid: authResult.localId,
        email: normalizedEmail,
        name: firebaseUser.displayName || normalizedEmail.split('@')[0],
        role: ['student', 'teacher', 'admin'].includes(role) ? role : 'student',
        section: 'NA',
        emailVerified: Boolean(firebaseUser.emailVerified),
        status: firebaseUser.emailVerified ? 'active' : 'pending',
      });
    }

    const firebaseVerified = authResult.emailVerified === true || authResult.emailVerified === 'true';
    // Also trust Admin SDK in case Identity Toolkit payload omits the flag
    let verified = firebaseVerified;
    if (!verified) {
      try {
        const fb = await auth.getUser(authResult.localId);
        verified = Boolean(fb.emailVerified);
      } catch {
        verified = false;
      }
    }

    if (verified && !user.emailVerified) {
      user.emailVerified = true;
      user.status = user.status === 'disabled' ? 'disabled' : 'active';
      await user.save();
    }

    // New signups are status=pending until verified. Legacy active accounts can still sign in.
    if (!verified && user.status === 'pending') {
      return res.status(403).json({
        message: 'Please verify your email before signing in. Check your inbox for the link.',
        code: 'EMAIL_NOT_VERIFIED',
        email: normalizedEmail,
      });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({ message: 'This account has been disabled.' });
    }

    const settings = await getOrCreateSettings();
    if (settings.maintenanceMode && user.role !== 'admin') {
      return res.status(503).json({
        message: 'The system is under maintenance. Please try again later.',
        code: 'MAINTENANCE_MODE',
      });
    }

    await logAudit({
      req,
      actor: user,
      action: 'auth.signin',
      category: 'auth',
      summary: `${user.name} signed in`,
      targetType: 'user',
      targetId: user._id,
      targetName: user.email,
    });

    return res.json({
      message: 'Signed in successfully.',
      token: authResult.idToken,
      refreshToken: authResult.refreshToken,
      expiresIn: authResult.expiresIn,
      user: publicUser(user),
    });
  } catch (err) {
    console.error('Signin error:', err);
    return res.status(500).json({ message: 'Could not sign in. Please try again.' });
  }
}

async function resendVerification(req, res) {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ message: 'Email and password are required to resend verification.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let authResult;
    try {
      authResult = await signInWithEmailPassword(normalizedEmail, password);
    } catch (err) {
      return res.status(401).json({ message: mapAuthError(err.code) });
    }

    const fb = await auth.getUser(authResult.localId);
    if (fb.emailVerified) {
      const user = await User.findOne({ firebaseUid: authResult.localId });
      if (user) {
        user.emailVerified = true;
        user.status = user.status === 'disabled' ? 'disabled' : 'active';
        await user.save();
      }
      return res.json({ message: 'Your email is already verified. You can sign in.', alreadyVerified: true });
    }

    await sendEmailVerification(authResult.idToken);
    return res.json({ message: 'Verification link sent. Please check your email.' });
  } catch (err) {
    console.error('Resend verification error:', err);
    return res.status(500).json({ message: 'Could not resend verification email.' });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      await auth.getUserByEmail(normalizedEmail);
      await sendPasswordResetEmail(normalizedEmail);
      console.log(`Password reset email requested for ${normalizedEmail}`);
    } catch (err) {
      if (err?.code === 'auth/user-not-found') {
        console.warn(`Password reset skipped — no Firebase user for ${normalizedEmail}`);
      } else {
        console.error('Password reset error:', err.code || err.message);
      }
    }

    await logAudit({
      req,
      action: 'auth.password_reset_requested',
      category: 'auth',
      summary: `Password reset requested for ${normalizedEmail}`,
      targetType: 'user',
      targetName: normalizedEmail,
    });

    return res.json({
      message: 'If an account exists for that email, a password reset link has been sent.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Could not process password reset request.' });
  }
}

async function me(req, res) {
  return res.json({ user: publicUser(req.user) });
}

module.exports = { signup, signin, forgotPassword, resendVerification, me, publicUser, listSignupSections };
