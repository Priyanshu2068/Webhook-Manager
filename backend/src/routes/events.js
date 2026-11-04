const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Event = require('../models/Event');
const Webhook = require('../models/Webhook');
const deliver = require('../deliver');

router.use(auth);

// 6. List events (filter by ?status= & ?webhook=, paginated)
router.get('/', async (req, res) => {
  const { status, webhook } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 25, 100);
  const filter = { user: req.userId };
  if (status) filter.status = status;
  if (webhook && mongoose.isValidObjectId(webhook)) filter.webhook = webhook;
  const [items, total] = await Promise.all([
    Event.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit).populate('webhook', 'name').lean(),
    Event.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

// 7. Event detail
router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Bad id' });
  const ev = await Event.findOne({ _id: req.params.id, user: req.userId }).populate('webhook', 'name targetUrl');
  if (!ev) return res.status(404).json({ error: 'Not found' });
  res.json(ev);
});

// 8. Replay an event (re-deliver to the webhook's target)
router.post('/:id/replay', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Bad id' });
  const ev = await Event.findOne({ _id: req.params.id, user: req.userId });
  if (!ev) return res.status(404).json({ error: 'Not found' });
  const webhook = await Webhook.findById(ev.webhook);
  if (!webhook) return res.status(404).json({ error: 'Webhook no longer exists' });
  if (!webhook.targetUrl) return res.status(400).json({ error: 'Webhook has no targetUrl to replay to' });
  await deliver(ev, webhook);
  res.json(ev);
});

module.exports = router;
