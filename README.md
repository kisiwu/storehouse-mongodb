# @storehouse/mongodb

MongoDB driver manager adapter for [@storehouse/core](https://www.npmjs.com/package/@storehouse/core). Provides seamless integration with [MongoDB](https://www.mongodb.com/) using the official [Node.js driver](https://www.npmjs.com/package/mongodb).

## Features

- **Type-safe MongoDB operations** with TypeScript support
- **Connection lifecycle management** with automatic event logging
- **Health check utilities** for monitoring (works without admin privileges)
- **Multi-manager support** via Storehouse registry
- **Cross-database access** using dot notation

## Prerequisites

- **MongoDB server**
- **Node.js** 18 or higher

## Installation

```bash
npm install @storehouse/core mongodb @storehouse/mongodb
```

## Quick Start

### 1. Define Your Types

**models/movie.ts**
```ts
export interface Movie {
  title: string;
  director: string;
  year: number;
  rating?: number;
}
```

### 2. Register the Manager

**index.ts**
```ts
import { Storehouse } from '@storehouse/core';
import { MongoDbManager } from '@storehouse/mongodb';

// Register the manager
Storehouse.add({
  mongodb: {
    type: MongoDbManager,
    config: {
      url: 'mongodb://localhost:27017/mydb',
      // MongoClientOptions
      options: {
        maxPoolSize: 10,
        minPoolSize: 5
      }
    }
  }
});
```

### 3. Connect and Use

```ts
import { Storehouse } from '@storehouse/core';
import { MongoDbManager } from '@storehouse/mongodb';
import { Collection, MongoClient } from 'mongodb';
import { Movie } from './models/movie';

// Get the manager and connect
const manager = Storehouse.getManager<MongoDbManager>('mongodb');

if (manager) {
  // Open the connection
  await manager.connect();
  
  console.log('Connected to database:', manager.db().databaseName);
  
  // Get a collection
  const moviesCollection = manager.getModel<Movie>('movies');
  
  // Insert a document
  await moviesCollection.insertOne({
    title: 'Sinners',
    director: 'Ryan Coogler',
    year: 2025,
    rating: 8.5
  });
  
  // Query documents
  const movies = await moviesCollection.find({ year: { $gte: 2010 } }).toArray();
  console.log('Movies:', movies);
  
  // Count documents
  const count = await moviesCollection.countDocuments();
  console.log('Total movies:', count);
}
```

## API Reference

### Helper Functions

The package provides helper functions that throw errors instead of returning undefined, making your code cleaner and safer.

#### `getManager()`

Retrieves a MongoDbManager instance from the registry.

```ts
import { Storehouse } from '@storehouse/core';
import { getManager } from '@storehouse/mongodb';

const manager = getManager(Storehouse, 'mongodb');
await manager.connect();
```

**Throws:**
- `ManagerNotFoundError` - If the manager doesn't exist
- `InvalidManagerConfigError` - If the manager is not a MongoDbManager instance

#### `getConnection()`

Retrieves the underlying MongoDB client connection.

```ts
import { Storehouse } from '@storehouse/core';
import { getConnection } from '@storehouse/mongodb';

const client = getConnection(Storehouse, 'mongodb');
await client.connect();

// Access the database
const db = client.db('mydb');
const collections = await db.listCollections().toArray();
```

**Throws:**
- `ManagerNotFoundError` - If the manager doesn't exist
- `InvalidManagerConfigError` - If the manager is not a MongoClient instance

#### `getModel()`

Retrieves a MongoDB Collection by name.

```ts
import { Storehouse } from '@storehouse/core';
import { getModel } from '@storehouse/mongodb';
import { Movie } from './models/movie';

// Get model from default manager
const movies = getModel<Movie>(Storehouse, 'movies');

// Get model from specific manager
const users = getModel(Storehouse, 'mongodb', 'users');

// Use the collection
const count = await movies.countDocuments();
console.log('Total movies:', count);
```

**Throws:**
- `ModelNotFoundError` - If the model doesn't exist

### MongoDbManager Class

#### Methods

##### `connect(): Promise<this>`

Establishes connection to MongoDB.

```ts
await manager.connect();
```

##### `close(force?: boolean): Promise<void>`

Closes the MongoDB connection.

```ts
// Graceful close
await manager.close();

// Force close
await manager.close(true);
```

##### `closeConnection(force?: boolean): Promise<void>`

Alias for `close()`. Closes the MongoDB connection.

```ts
await manager.closeConnection();
```

##### `getConnection(): MongoClient`

Returns the underlying MongoDB client instance.

```ts
const client = manager.getConnection();
const db = client.db('mydb');
```

##### `getModel<T>(name: string): Collection<T>`

Retrieves a MongoDB collection by name. Supports dot notation for cross-database access.

```ts
// Get collection from default database
const movies = manager.getModel<Movie>('movies');

// Get collection from specific database
const users = manager.getModel('otherdb.users');
```

##### `isConnected(): Promise<boolean>`

Checks if the connection is currently active. Works without admin privileges.

```ts
const connected = await manager.isConnected();
if (connected) {
  console.log('MongoDB is connected');
}
```

##### `healthCheck(): Promise<MongoDbHealthCheckResult>`

Performs a comprehensive health check including ping test and latency measurement. Works without admin privileges.

```ts
const health = await manager.healthCheck();

if (health.healthy) {
  console.log(`✓ MongoDB is healthy`);
  console.log(`  Database: ${health.details.databaseName}`);
  console.log(`  Latency: ${health.details.latency}`);
} else {
  console.error(`✗ MongoDB is unhealthy: ${health.message}`);
}
```

### Health Check Result

The health check returns a detailed result object:

- `healthy: boolean` - Overall health status
- `message: string` - Descriptive message about the health status
- `timestamp: number` - Timestamp when the health check was performed
- `latency?: number` - Response time in milliseconds
- `details: object` - Detailed connection information
  - `name: string` - Manager name
  - `isOpen: boolean` - Connection open status
  - `isReady: boolean` - Connection ready status
  - `pingResponse?: Document` - MongoDB ping response
  - `latency?: string` - Response time in ms
  - `error?: string` - Error details (if unhealthy)

## Advanced Usage

### Multiple Managers

You can register multiple MongoDB connections:

```ts
import { Storehouse } from '@storehouse/core';
import { MongoDbManager, getManager } from '@storehouse/mongodb';

Storehouse.add({
  primary: {
    type: MongoDbManager,
    config: {
      url: 'mongodb://localhost:27017/maindb'
    }
  },
  analytics: {
    type: MongoDbManager,
    config: {
      url: 'mongodb://localhost:27017/analyticsdb'
    }
  }
});

// Access specific managers
const primaryManager = getManager(Storehouse, 'primary');
const analyticsManager = getManager(Storehouse, 'analytics');
```

### Using the Manager Type

Set the manager type to simplify configuration and use string identifiers instead of class references:

```ts
import { Storehouse } from '@storehouse/core';
import { MongoDbManager } from '@storehouse/mongodb';

// Set default manager type
Storehouse.setManagerType(MongoDbManager);

// Now you can use type string instead of class
Storehouse.add({
  mongodb: {
    type: '@storehouse/mongodb',
    config: {
      url: 'mongodb://localhost:27017/mydb'
    }
  }
});
```

### Cross-Database Access

Access collections from different databases sharing the same socket connection using dot notation:

```ts
import { Storehouse } from '@storehouse/core';
import { getModel } from '@storehouse/mongodb';

// Access collection from another database
const otherDbMovies = getModel(Storehouse, 'mongodb', 'otherdatabase.movies');

// Or using Storehouse directly
const Movies = Storehouse.getModel('mongodb', 'otherdatabase.movies');

// Query the collection
const movies = await otherDbMovies?.find({}).toArray();
```

The format is: `<database-name>.<collection-name>`

### Connection Event Handling

The manager automatically logs connection lifecycle events. These are logged using the `@novice1/logger` package and can be enabled with Debug mode:

```ts
import { Debug } from '@novice1/logger';

Debug.enable('@storehouse/mongodb*');
```

**Events logged:**
- `topologyOpening` - Connection initiated
- `serverOpening` - Server connection established
- `serverClosed` - Server connection closed
- `topologyClosed` - Connection closed
- `error` - Connection errors

## TypeScript Support

The package is written in TypeScript and provides full type definitions for type-safe operations:

```ts
import { Storehouse } from '@storehouse/core';
import { MongoClient, Collection } from 'mongodb';
import { MongoDbManager, getManager, getConnection, getModel } from '@storehouse/mongodb';

// Typed manager
const manager = getManager<MongoDbManager>(Storehouse, 'mongodb');

// Typed connection
const client: MongoClient = getConnection(Storehouse, 'mongodb');

// Typed collection with document interface
interface User {
  name: string;
  email: string;
  age: number;
}

const users = getModel<User>(Storehouse, 'mongodb', 'users');
// users is typed as Collection<User>

// Type-safe operations
const allUsers = await users.find({}).toArray();
// allUsers is typed as User[]
```

## Error Handling

All helper functions throw specific errors for better error handling:

```ts
import { Storehouse } from '@storehouse/core';
import { getManager, getModel, getConnection } from '@storehouse/mongodb';
import {
  ManagerNotFoundError,
  ModelNotFoundError,
  InvalidManagerConfigError
} from '@storehouse/core';

try {
  const manager = getManager(Storehouse, 'nonexistent');
} catch (error) {
  if (error instanceof ManagerNotFoundError) {
    console.error('Manager not found:', error.message);
  } else if (error instanceof InvalidManagerConfigError) {
    console.error('Invalid manager type:', error.message);
  }
}

try {
  const model = getModel(Storehouse, 'nonexistent');
} catch (error) {
  if (error instanceof ModelNotFoundError) {
    console.error('Model not found:', error.message);
  }
}
```

## Best Practices

1. **Always connect** - Call `connect()` after registering the manager to establish the connection
2. **Use health checks** - Monitor connection health in production environments
3. **Handle disconnections** - Implement reconnection and retry logic for critical operations
4. **Close connections** - Always call `close()` when shutting down your application
5. **Use TypeScript** - Leverage type definitions for safer database operations

## Resources

- [Documentation](https://kisiwu.github.io/storehouse/mongodb/latest/)
- [@storehouse/core](https://www.npmjs.com/package/@storehouse/core)
- [MongoDB Node.js Driver](https://www.npmjs.com/package/mongodb)
- [MongoDB Documentation](https://www.mongodb.com/docs/)

## License

MIT