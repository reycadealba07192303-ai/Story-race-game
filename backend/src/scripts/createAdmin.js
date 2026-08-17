/**
 * One-off helper: create an admin user in Firebase + MongoDB.
 * Usage: node src/scripts/createAdmin.js admin@school.edu "Admin Name" "StrongPass123"
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { auth } = require('../config/firebase');
const User = require('../models/User');

async function main() {
  const [email, name, password] = process.argv.slice(2);
  if (!email || !name || !password) {
    console.error('Usage: node src/scripts/createAdmin.js <email> <name> <password>');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    console.error('User already exists in MongoDB');
    process.exit(1);
  }

  const firebaseUser = await auth.createUser({
    email: normalizedEmail,
    password,
    displayName: name,
    emailVerified: true,
  });
  await auth.setCustomUserClaims(firebaseUser.uid, { role: 'admin' });

  const user = await User.create({
    firebaseUid: firebaseUser.uid,
    email: normalizedEmail,
    name,
    role: 'admin',
    section: 'NA',
    emailVerified: true,
    status: 'active',
  });

  console.log('Admin created:', {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  });
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
