import * as React from "react";

type ServiceLoader<T> = () => Promise<T>;

class DIContainer {
  private services = new Map<string, any>();
  private loaders = new Map<string, ServiceLoader<any>>();
  private listeners = new Map<string, Set<() => void>>();

  /** Register a service instance immediately */
  register<T>(name: string, value: T): void {
    this.services.set(name, value);
    this.notify(name);
  }

  /** Register a lazy loader for a service */
  registerLoader<T>(name: string, loader: ServiceLoader<T>): void {
    this.loaders.set(name, loader);
  }

  /** Retrieve a service asynchronously, loading it if necessary */
  async get<T>(name: string): Promise<T> {
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }
    const loader = this.loaders.get(name);
    if (!loader) {
      throw new Error(`Service "${name}" is not registered in the DI container.`);
    }
    const service = await loader();
    this.services.set(name, service);
    this.notify(name);
    return service;
  }

  /** Retrieve a service synchronously if it has already been loaded */
  getSync<T>(name: string): T | null {
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }
    // Background trigger loader
    const loader = this.loaders.get(name);
    if (loader) {
      void this.get(name).catch(() => {});
    }
    return null;
  }

  /** Subscribe to updates when a service resolves */
  subscribe(name: string, callback: () => void): () => void {
    let set = this.listeners.get(name);
    if (!set) {
      set = new Set();
      this.listeners.set(name, set);
    }
    set.add(callback);
    return () => {
      set?.delete(callback);
    };
  }

  private notify(name: string): void {
    const set = this.listeners.get(name);
    if (set) {
      for (const cb of set) {
        cb();
      }
    }
  }
}

export const container = new DIContainer();

// Register dynamic loaders
container.registerLoader("pdfExport", () => import("@/features/sheets/pdfExport"));

// React Hook to consume DI services reactively
export function useService<T>(name: string): {
  service: T | null;
  loading: boolean;
  error: Error | null;
} {
  const [service, setService] = React.useState<T | null>(() => container.getSync<T>(name));
  const [loading, setLoading] = React.useState(() => !container.getSync<T>(name));
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    // Try to get synced value first
    const current = container.getSync<T>(name);
    if (current) {
      setService(current);
      setLoading(false);
      return;
    }

    let active = true;

    const unsubscribe = container.subscribe(name, () => {
      const resolved = container.getSync<T>(name);
      if (active && resolved) {
        setService(resolved);
        setLoading(false);
      }
    });

    container.get<T>(name)
      .then((res) => {
        if (active) {
          setService(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [name]);

  return { service, loading, error };
}
