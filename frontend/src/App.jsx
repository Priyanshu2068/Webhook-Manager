import React, { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { token } = await api(`/auth/${mode}`, { method: 'POST', body: { email, password } });
      setToken(token);
      onAuth();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="card auth" onSubmit={submit}>
      <h1>Webhook Manager</h1>
      <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="err">{error}</p>}
      <button>{mode === 'login' ? 'Log in' : 'Create account'}</button>
      <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'register' : 'login'); }}>
        {mode === 'login' ? 'Need an account? Register' : 'Have an account? Log in'}
      </a>
    </form>
  );
}

function Webhooks({ webhooks, reload, selected, onSelect }) {
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [error, setError] = useState('');

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/webhooks', { method: 'POST', body: { name, targetUrl } });
      setName('');
      setTargetUrl('');
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this webhook and all its events?')) return;
    await api(`/webhooks/${id}`, { method: 'DELETE' });
    if (selected === id) onSelect('');
    reload();
  };

  const ingestUrl = (t) => `${location.origin}/hook/${t}`;

  return (
    <section className="card">
      <h2>Webhooks</h2>
      <form className="row" onSubmit={create}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Target URL (optional, for delivery/replay)" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />
        <button>Add</button>
      </form>
      {error && <p className="err">{error}</p>}
      <ul className="list">
        {webhooks.map((w) => (
          <li key={w._id} className={selected === w._id ? 'sel' : ''}>
            <div onClick={() => onSelect(selected === w._id ? '' : w._id)}>
              <strong>{w.name}</strong>
              <small>
                {w.stats.received + w.stats.delivered + w.stats.failed} events ·{' '}
                <span className="ok">{w.stats.delivered} ok</span> · <span className="bad">{w.stats.failed} failed</span>
              </small>
              <code onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(ingestUrl(w.token)); }} title="Click to copy">
                POST {ingestUrl(w.token)}
              </code>
            </div>
            <button className="link" onClick={() => remove(w._id)}>Delete</button>
          </li>
        ))}
        {!webhooks.length && <li className="muted">No webhooks yet.</li>}
      </ul>
    </section>
  );
}

function EventDetail({ id, onClose, onChanged }) {
  const [ev, setEv] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api(`/events/${id}`).then(setEv).catch((e) => setError(e.message)); }, [id]);

  const replay = async () => {
    setError('');
    try {
      setEv(await api(`/events/${id}/replay`, { method: 'POST' }));
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!ev) return <section className="card">{error || 'Loading…'}</section>;
  return (
    <section className="card">
      <div className="between">
        <h2>Event <span className={`badge ${ev.status}`}>{ev.status}</span></h2>
        <div>
          <button onClick={replay}>Replay</button> <button className="link" onClick={onClose}>Close</button>
        </div>
      </div>
      {error && <p className="err">{error}</p>}
      <p className="muted">{ev.webhook?.name} · {new Date(ev.createdAt).toLocaleString()}</p>
      <h3>Payload</h3>
      <pre>{JSON.stringify(ev.payload, null, 2)}</pre>
      <h3>Delivery attempts ({ev.attempts.length})</h3>
      <ul className="list">
        {ev.attempts.map((a, i) => (
          <li key={i}>
            <span className={a.success ? 'ok' : 'bad'}>{a.success ? 'Success' : 'Failed'}</span>{' '}
            {a.statusCode ?? ''} {a.error && `— ${a.error}`} <small>{new Date(a.at).toLocaleString()}</small>
          </li>
        ))}
        {!ev.attempts.length && <li className="muted">None (no target URL configured).</li>}
      </ul>
    </section>
  );
}

function Events({ webhook, refreshKey, onChanged }) {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pages: 1, total: 0 });
  const [open, setOpen] = useState('');

  useEffect(() => { setPage(1); }, [status, webhook]);
  useEffect(() => {
    const q = new URLSearchParams({ page, ...(status && { status }), ...(webhook && { webhook }) });
    api(`/events?${q}`).then(setData).catch(() => {});
  }, [status, webhook, page, refreshKey]);

  return (
    <>
      <section className="card">
        <div className="between">
          <h2>Events ({data.total})</h2>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="received">Received</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <table>
          <thead><tr><th>Time</th><th>Webhook</th><th>Status</th><th>Attempts</th></tr></thead>
          <tbody>
            {data.items.map((e) => (
              <tr key={e._id} onClick={() => setOpen(e._id)} className={open === e._id ? 'sel' : ''}>
                <td>{new Date(e.createdAt).toLocaleString()}</td>
                <td>{e.webhook?.name}</td>
                <td><span className={`badge ${e.status}`}>{e.status}</span></td>
                <td>{e.attempts.length}</td>
              </tr>
            ))}
            {!data.items.length && <tr><td colSpan="4" className="muted">No events.</td></tr>}
          </tbody>
        </table>
        <div className="between">
          <button className="link" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <small>Page {page} / {data.pages || 1}</small>
          <button className="link" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      </section>
      {open && <EventDetail id={open} onClose={() => setOpen('')} onChanged={onChanged} />}
    </>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [webhooks, setWebhooks] = useState([]);
  const [selected, setSelected] = useState('');
  const [tick, setTick] = useState(0);

  const loadWebhooks = useCallback(() => api('/webhooks').then(setWebhooks).catch(() => {}), []);
  useEffect(() => { if (authed) loadWebhooks(); }, [authed, loadWebhooks, tick]);

  if (!authed) return <Auth onAuth={() => setAuthed(true)} />;

  return (
    <div className="app">
      <header className="between">
        <h1>Webhook Manager</h1>
        <div>
          <button className="link" onClick={() => setTick(tick + 1)}>Refresh</button>
          <button className="link" onClick={() => { setToken(null); setAuthed(false); }}>Log out</button>
        </div>
      </header>
      <Webhooks webhooks={webhooks} reload={() => setTick(tick + 1)} selected={selected} onSelect={setSelected} />
      <Events webhook={selected} refreshKey={tick} onChanged={() => setTick((t) => t + 1)} />
    </div>
  );
}
