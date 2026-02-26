const bcrypt = require('bcryptjs');
const { User } = require('../models/User');

async function upsertUser({ name, username, email, password, role }) {
  const existing = await User.findOne({ email });
  const passwordHash = await bcrypt.hash(password, 12);
  const resolvedUsername = (username || name || '').trim();

  if (existing) {
    existing.name = name;
    existing.username = resolvedUsername;
    existing.role = role;
    existing.passwordHash = passwordHash;
    existing.sellerStatus = role === 'SELLER' ? 'PENDING' : 'NONE';
    await existing.save();
    return existing;
  }

  const user = await User.create({
    name,
    username: resolvedUsername,
    email,
    passwordHash,
    role,
    sellerStatus: role === 'SELLER' ? 'PENDING' : 'NONE',
  });

  return user;
}

async function seedUsers() {
  await upsertUser({
    name: 'Abhinav',
    username: 'Abhinav',
    email: 'abhinav@trendkart.local',
    password: 'thispanelbelongstoabhi6910$1111',
    role: 'SUPER_ADMIN',
  });

  await upsertUser({
    name: 'Suryadev',
    username: 'Suryadev',
    email: 'suryadev@trendkart.local',
    password: 'thispanelisforsurya4284687',
    role: 'ADMIN',
  });

  await upsertUser({
    name: 'Ayush',
    username: 'Ayush',
    email: 'ayush@trendkart.local',
    password: 'thisaccisforayushyadava66',
    role: 'ADMIN',
  });
}

module.exports = { seedUsers };
