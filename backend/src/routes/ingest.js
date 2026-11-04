const router = require('express').Router();
const Webhook = require('../models/Webhook');
const Event = require('../models/Event');
const deliver = require('../deliver');

// 9. Public token-based ingestion: POST /hook/:token with a JSON body
router.post('/:token', async (req, res) => {
  const webhook = await Webhook.findOne({ token: req.params.token });
  if (!webhook || !webhook.active) return res.status(404).json({ error: 'Unknown webhook token' });
  const { host, 'content-type': ct, 'user-agent': ua } = req.headers;
  const event = await Event.create({
    webhook: webhook._id,
    user: webhook.user,
    payload: req.body,
    headers: { host, 'content-type': ct, 'user-agent': ua },
  });
  await deliver(event, webhook);
  res.status(202).json({ id: event._id, status: event.status });
});

module.exports = router;
