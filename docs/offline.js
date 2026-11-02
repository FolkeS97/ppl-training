// Offline readiness is confirmed by the controlling worker, not navigator.onLine.
export class OfflineApp {
  constructor(onChange, environment = globalThis) {
    this.env = environment;
    this.onChange = onChange;
    this.registration = null;
    this.reloading = false;
    this.report = {phase:'preparing', ready:false, updateReady:false, durable:null, version:'', cached:0, total:0};
  }
  publish(changes) {
    this.report = {...this.report, ...changes};
    this.onChange({...this.report});
  }
  async start() {
    const {navigator, isSecureContext} = this.env;
    if (!isSecureContext || !navigator.serviceWorker) {
      this.publish({phase:'unsupported', ready:false});
      return;
    }
    try {
      this.registration = await navigator.serviceWorker.register('./sw.js', {scope:'./', updateViaCache:'none'});
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (this.reloading) this.env.location.reload();
        else this.check();
      });
      this.registration.addEventListener('updatefound', () => this.watchInstall());
      this.watchInstall();
      if (navigator.serviceWorker.controller) await this.check();
      else if (this.registration.active) this.publish({phase:'preparing'});
      try { this.publish({durable:await navigator.storage?.persisted?.() ?? null}); } catch {}
    } catch {
      this.publish({phase:'error', ready:false});
    }
  }
  watchInstall() {
    const registration = this.registration;
    const worker = registration.installing;
    const update = () => {
      this.publish({updateReady:!!registration.waiting});
      if (this.env.navigator.serviceWorker.controller) this.check();
      else if (worker?.state === 'redundant') this.publish({phase:'error', ready:false});
    };
    worker?.addEventListener('statechange', update);
    update();
  }
  async check() {
    const worker = this.env.navigator.serviceWorker?.controller;
    if (!worker) return false;
    try {
      const status = await new Promise((resolve, reject) => {
        const channel = new this.env.MessageChannel();
        const timeout = this.env.setTimeout(() => {channel.port1.close(); reject(new Error('timeout'));}, 5000);
        channel.port1.onmessage = event => {
          this.env.clearTimeout(timeout);
          channel.port1.close();
          resolve(event.data);
        };
        worker.postMessage({type:'CHECK_OFFLINE'}, [channel.port2]);
      });
      if (typeof status.ready !== 'boolean' || !Number.isInteger(status.total) || status.total < 1) throw new Error('invalid status');
      this.publish({...status, phase:status.ready?'ready':'incomplete', updateReady:!!this.registration?.waiting});
      return status.ready;
    } catch {
      this.publish({phase:'error', ready:false, updateReady:!!this.registration?.waiting});
      return false;
    }
  }
  async retry() {
    if (!this.registration) await this.start();
    else {
      try { await this.registration.update(); } catch {}
      await this.check();
    }
    return this.report.ready;
  }
  async keepStorage() {
    try {
      const storage = this.env.navigator.storage;
      if (storage?.persist) this.publish({durable:await storage.persist()});
    } catch {}
  }
  applyUpdate() {
    if (!this.registration?.waiting) return false;
    this.reloading = true;
    this.registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
    return true;
  }
}
