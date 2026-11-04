// Forward an event's payload to the webhook's target URL and record the attempt.
async function deliver(event, webhook) {
  if (!webhook.targetUrl) {
    event.status = 'received';
    return event.save();
  }
  const attempt = { at: new Date() };
  try {
    const res = await fetch(webhook.targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Event-Id': String(event._id) },
      body: JSON.stringify(event.payload),
      signal: AbortSignal.timeout(10000),
    });
    attempt.statusCode = res.status;
    attempt.success = res.ok;
    if (!res.ok) attempt.error = `HTTP ${res.status}`;
  } catch (err) {
    attempt.success = false;
    attempt.error = err.message;
  }
  event.attempts.push(attempt);
  event.status = attempt.success ? 'delivered' : 'failed';
  return event.save();
}

module.exports = deliver;
