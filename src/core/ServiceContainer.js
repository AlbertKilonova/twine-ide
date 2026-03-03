export class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  register(name, factory, singleton = true) {
    this.services.set(name, { factory, singleton });
    return this;
  }

  get(name) {
    if (this.singletons.has(name)) return this.singletons.get(name);

    const service = this.services.get(name);
    if (!service) throw new Error(`Service ${name} not found`);

    const instance = service.factory(this);
    if (service.singleton) this.singletons.set(name, instance);
    return instance;
  }

  has(name) {
    return this.services.has(name);
  }

  installPlugin(plugin) {
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.has(dep)) {
          throw new Error(`Plugin "${plugin.name}" requires "${dep}" but it is not registered`);
        }
      }
    }
    plugin.install(this);
    return this;
  }
}
