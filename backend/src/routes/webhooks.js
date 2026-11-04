const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Webhook = require('../models/Webhook');
const Event = require('../models/Event');

router.use(auth);

// 3. Register a webhook
router.post('/', async (req, res) => {
  const { name, targetUrl } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (targetUrl && !/^https?:\/\//i.test(targetUrl))
    return res.status(400).json({ error: 'targetUrl must be http(s)' });
  const webhook = await Webhook.create({ user: req.userId, name, targetUrl });
  res.status(201).json(webhook);
});

// 4. List webhooks with event counts
router.get('/', async (req, res) => {
  const webhooks = await Webhook.find({ user: req.userId }).sort('-createdAt').lean();
  const counts = await Event.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(req.userId) } },
    { $group: { _id: { w: '$webhook', s: '$status' }, n: { $sum: 1 } } },
  ]);
  for (const w of webhooks) {
    w.stats = { received: 0, delivered: 0, failed: 0 };
    counts.filter((c) => String(c._id.w) === String(w._id)).forEach((c) => (w.stats[c._id.s] = c.n));
  }
  res.json(webhooks);
});

// 5. Delete a webhook (and its events)
router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Bad id' });
  const w = await Webhook.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!w) return res.status(404).json({ error: 'Not found' });
  await Event.deleteMany({ webhook: w._id });
  res.json({ ok: true });
});

module.exports = router;
