const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const sign = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// 1. Register
router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || password.length < 6)
    return res.status(400).json({ error: 'Email and password (min 6 chars) required' });
  if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered' });
  const user = await User.create({ email, password: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user), user: { id: user._id, email: user.email } });
});

// 2. Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password || '', user.password)))
    return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: sign(user), user: { id: user._id, email: user.email } });
});

module.exports = router;
