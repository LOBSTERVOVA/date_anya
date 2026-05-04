// Lock management with WebSocket (SockJS + STOMP)
// Provides: init(lecturerUuid), ensure(channel), acquire(cell), release(cell), isLocked(cell), onChange(callback), loadActive(channel), broadcastReload(channel)
// cell = { lecturerUuid, groupUuid, dateIso, pairOrder } // lecturerUuid acts as channel id (e.g., 'students' for student grid)

import { buildCsrfHeaders } from './api.js';

const WS_ENDPOINT = '/ws';
const TOPIC_PREFIX = '/topic/locks.';

function uuid4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class LockClient {
  constructor() {
    this.ownerId = uuid4();
    this.lecturerUuid = null; // primary channel (used by init)
    this.stomp = null;
    this.socket = null;
    this.connected = false;
    this.locked = new Map(); // key: channel|group|date|order -> { ownerId }
    this.channels = new Set(); // subscribed channels
    this.listeners = new Set();
  }

  onChange(cb) { if (typeof cb === 'function') this.listeners.add(cb); }
  offChange(cb) { this.listeners.delete(cb); }
  notify() { this.listeners.forEach(cb => { try { cb(); } catch (_) {} }); }

  keyOf(cell) {
    if (!cell) return '';
    const c = cell.lecturerUuid || '';
    const g = cell.groupUuid || '';
    const d = cell.dateIso || '';
    const o = cell.pairOrder || '';
    return `${c}|${g}|${d}|${o}`;
  }

  async init(lecturerUuid) {
    console.log('LockClient init called with lecturerUuid:', lecturerUuid);
    this.lecturerUuid = lecturerUuid || null;
    this.disconnect();
    if (!lecturerUuid) {
      console.log('No lecturerUuid provided, skipping WebSocket connection');
      return;
    }

    // Connect WS and subscribe only to primary channel
    try {
      console.log('Connecting to WebSocket endpoint:', WS_ENDPOINT);
      this.socket = new SockJS(WS_ENDPOINT);
      this.stomp = Stomp.over(this.socket);
      this.stomp.reconnect_delay = 3000;
      const self = this;
      await new Promise((resolve, reject) => {
        self.stomp.connect({}, () => { 
          self.connected = true; 
          console.log('WebSocket connected successfully');
          resolve(); 
        }, err => { 
          console.error('WebSocket connection failed:', err);
          reject(err); 
        });
      });
      this.channels = new Set();
      await this.ensure(lecturerUuid);
      console.log('LockClient initialization completed');
    } catch (e) { 
      console.error('LockClient initialization failed:', e);
    }
  }

  async ensure(channel) {
    console.log('ensure called for channel:', channel, 'connected:', this.connected, 'channels count:', this.channels.size);
    if (!this.stomp || !this.connected || !channel) {
      console.log('Skipping ensure - not connected or no channel');
      return;
    }
    if (this.channels.has(channel)) {
      console.log('Channel already subscribed:', channel);
      return;
    }
    const topic = TOPIC_PREFIX + channel;
    console.log('Subscribing to topic:', topic, 'for channel:', channel);
    this.stomp.subscribe(topic, (msg) => {
      try {
        const body = JSON.parse(msg.body || '{}');
        const cell = body.cell || {};
        console.log('WebSocket message received:', {
          type: body.type,
          ownerId: body.ownerId,
          cell: cell,
          channel: channel
        });
        // enforce channel if missing
        if (!cell.lecturerUuid) cell.lecturerUuid = channel;
        const k = this.keyOf(cell);
        if (!k && body.type !== 'RELOAD') return;
        
        if (body.type === 'LOCKED') {
          console.log('Cell LOCKED:', k, 'by owner:', body.ownerId);
          this.locked.set(k, { ownerId: body.ownerId });
        } else if (body.type === 'UNLOCKED') {
          console.log('Cell UNLOCKED:', k, 'by owner:', body.ownerId);
          this.locked.delete(k);
        } else if (body.type === 'RELOAD') {
          console.log('RELOAD event received for channel:', channel);
          // No state change, just notify
        }
        console.log('Notifying listeners, current locks count:', this.locked.size);
        this.notify();
      } catch (e) {
        console.error('Error processing WebSocket message:', e, 'Message body:', msg.body);
      }
    });
    this.channels.add(channel);
    console.log('Successfully subscribed to channel:', channel, 'Total channels:', this.channels.size);
  }

  disconnect() {
    try { if (this.stomp && this.connected) this.stomp.disconnect(() => {}); } catch (_) {}
    this.stomp = null; this.socket = null; this.connected = false; this.locked.clear(); this.channels = new Set(); this.notify();
  }

  isLocked(cell) {
    const k = this.keyOf(cell);
    const li = this.locked.get(k);
    if (!li) return false;
    if (li.ownerId === this.ownerId) return false;
    return true;
  }

  async acquire(cell, ttlSeconds = 30) {
    // REST acquire
    const headers = buildCsrfHeaders();
    const resp = await fetch('/api/lock/acquire', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ cell, ownerId: this.ownerId, ttlSeconds })
    });
    if (!resp.ok) throw new Error('acquire failed');
    const data = await resp.json();
    return !!(data && data.acquired);
  }

  async release(cell) {
    const headers = buildCsrfHeaders();
    try {
      await fetch('/api/lock/release', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ cell, ownerId: this.ownerId })
      });
    } catch (_) {}
    return true;
  }

  async loadActive(lecturerUuid) {
    if (!lecturerUuid) return;
    try {
      const resp = await fetch('/api/lock/active?lecturer=' + encodeURIComponent(lecturerUuid), { headers: { 'Accept': 'application/json' } });
      if (!resp.ok) return;
      const list = await resp.json();
      // Merge snapshot for this channel
      const channel = lecturerUuid;
      // First, remove old entries for this channel
      const filtered = new Map();
      this.locked.forEach((v, k) => { if (!k.startsWith(channel + '|')) filtered.set(k, v); });
      (list || []).forEach(li => {
        const cell = li && li.cell ? li.cell : null;
        if (cell) cell.lecturerUuid = channel;
        const k = this.keyOf(cell);
        if (k) filtered.set(k, { ownerId: li.ownerId });
      });
      this.locked = filtered;
      this.notify();
    } catch (_) { /* ignore */ }
  }

  async broadcastReload(lecturerUuid) {
    if (!lecturerUuid) return;
    try {
      await fetch('/api/lock/reload?lecturer=' + encodeURIComponent(lecturerUuid), { method: 'POST' });
    } catch (_) { /* ignore */ }
  }
}

const instance = new LockClient();
export default instance;
