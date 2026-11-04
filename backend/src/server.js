require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

require('express-async-errors'); // forward async route errors to the error handler

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/events', require('./routes/events'));
app.use('/hook', require('./routes/ingest'));

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const port = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => app.listen(port, () => console.log(`API on :${port}`)))
  .catch((e) => {
    console.error('Mongo connection failed:', e.message);
    process.exit(1);
  });
