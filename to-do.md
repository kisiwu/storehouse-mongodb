## Health check

```ts
export class MongoDBManager extends MongoClient implements IManager {
  // ... existing code ...

  isConnected(): boolean {
    try {
      return this.topology?.isConnected() ?? false;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    const timestamp = start;

    try {
      // Ping the database to check connection
      const adminDb = this.db().admin();
      await adminDb.ping();
      
      const latency = Date.now() - start;
      
      return {
        healthy: true,
        message: 'MongoDB connection is healthy',
        details: {
          serverInfo: await adminDb.serverInfo(),
          latency: `${latency}ms`
        },
        latency,
        timestamp
      };
    } catch (error) {
      return {
        healthy: false,
        message: `MongoDB health check failed: ${error instanceof Error ? error.message : String(error)}`,
        details: {
          error: error instanceof Error ? error.stack : String(error)
        },
        latency: Date.now() - start,
        timestamp
      };
    }
  }
}
```

## Import Custom Error Classes

Replace the generic ReferenceError and TypeError with specific @storehouse/core errors:

```ts
import { 
  IManager, 
  ManagerArg,
  HealthCheckResult 
} from '@storehouse/core/lib/manager';
import { Registry } from '@storehouse/core/lib/registry';
import { 
  ModelNotFoundError,
  ManagerNotFoundError,
  InvalidManagerConfigError
} from '@storehouse/core/lib/errors';

export function getModel<T extends Document = Document>(
  registry: Registry, 
  managerName: string, 
  modelName?: string
): Collection<T> {
  const model = registry.getModel<Collection<T>>(managerName, modelName);
  if (!model) {
    throw new ModelNotFoundError(
      modelName || managerName,
      modelName ? managerName : undefined
    );
  }
  return model;
}

export function getManager<M extends MongoDBManager = MongoDBManager>(
  registry: Registry, 
  managerName?: string
): M {
  const manager = registry.getManager<M>(managerName);
  if (!manager) {
    throw new ManagerNotFoundError(managerName || registry.defaultManager);
  }
  if (!(manager instanceof MongoDBManager)) {
    throw new InvalidManagerConfigError(
      `Manager "${managerName || registry.defaultManager}" is not instance of MongoDBManager`
    );
  }
  return manager;
}

export function getConnection(registry: Registry, managerName?: string): MongoClient {
  const conn = registry.getConnection<MongoClient>(managerName);
  if (!conn) {
    throw new ManagerNotFoundError(managerName || registry.defaultManager);
  }
  return conn;
}


constructor(settings: MongoDBManagerArg) {
  if (!settings.config?.url) {
    throw new InvalidManagerConfigError('Missing connection url');
  }
  // ... rest of constructor
}
```
