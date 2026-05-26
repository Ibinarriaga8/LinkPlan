const http = require('http');
const { URL } = require('url');

class ApiClient {
  constructor({ baseUrl = 'http://localhost:4000', timeout = 5000 } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeout = timeout;
  }

  async request(method, pathname, body) {
    const url = new URL(this.baseUrl + pathname);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      },
      timeout: this.timeout
    };

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf-8');
          let data = text;
          try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }
          resolve({ status: res.statusCode, data });
        });
      });
      req.on('timeout', () => req.destroy(new Error(`Timeout tras ${this.timeout}ms`)));
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  get(pathname)        { return this.request('GET', pathname); }
  post(pathname, body) { return this.request('POST', pathname, body); }
  del(pathname)        { return this.request('DELETE', pathname); }

  async health() {
    try {
      const res = await this.request('GET', '/health');
      return { reachable: res.status === 200, status: res.status, data: res.data };
    } catch (err) {
      return { reachable: false, error: err.message };
    }
  }
}

module.exports = { ApiClient };
