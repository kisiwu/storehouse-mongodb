import { 
  HealthCheckResult, 
  IManager, 
  InvalidManagerConfigError, 
  ManagerArg, 
  ManagerNotFoundError, 
  ModelNotFoundError, 
  Registry 
} from '@storehouse/core';
import {
  MongoClient,
  MongoClientOptions,
  Document,
  Collection
} from 'mongodb';
import Logger from '@novice1/logger';
import { randomBytes } from 'node:crypto';


const Log = Logger.debugger('@storehouse/mongodb:manager');

/**
 * Configuration argument for creating a MongoDbManager instance.
 *
 * @extends ManagerArg
 *
 * @example
 * ```typescript
 * const managerArg: MongoDbManagerArg = {
 *   name: 'my-mongodb-manager',
 *   config: {
 *     url: 'mongodb://localhost:27017/mydb',
 *     options: {
 *       maxPoolSize: 10
 *     }
 *   }
 * };
 * ```
 */
export interface MongoDbManagerArg extends ManagerArg {
  /**
   * Configuration for the MongoDB connection.
   */
  config?: {
    /**
     * MongoDB connection URL.
     * @example 'mongodb://localhost:27017/mydb'
     */
    url: string;
    /**
     * MongoDB client connection options.
     * See MongoDB driver documentation for available options.
     */
    options?: MongoClientOptions;
  },
}

/**
 * Retrieves a MongoDB Collection (model) from the registry.
 *
 * This function has two overload signatures:
 * 1. When called with 2 arguments, retrieves the model using the second argument as the model name from the default manager
 * 2. When called with 3 arguments, retrieves the model from a specific manager
 *
 * @template T - The document type for the collection, defaults to Document
 *
 * @param registry - The Storehouse registry containing registered managers and models
 * @param modelName - When used with 2 arguments, this is the name of the model to retrieve
 * @returns The requested MongoDB Collection
 *
 * @throws {ModelNotFoundError} If the model is not found in the registry
 *
 * @example
 * ```typescript
 * // Get model from default manager
 * const users = getModel(registry, 'users');
 * const allUsers = await users.find({}).toArray();
 *
 * // With type parameter
 * interface User {
 *   name: string;
 *   email: string;
 * }
 * const users = getModel<User>(registry, 'users');
 * ```
 */
export function getModel<T extends Document = Document>(registry: Registry, modelName: string): Collection<T>

/**
 * Retrieves a MongoDB Collection (model) from a specific manager in the registry.
 *
 * @template T - The document type for the collection, defaults to Document
 *
 * @param registry - The Storehouse registry containing registered managers and models
 * @param managerName - The name of the manager containing the model
 * @param modelName - The name of the specific model to retrieve
 * @returns The requested MongoDB Collection
 *
 * @throws {ModelNotFoundError} If the model is not found in the registry
 *
 * @example
 * ```typescript
 * // Get model from specific manager
 * const users = getModel(registry, 'mongodb', 'users');
 *
 * // With type parameter
 * interface Product {
 *   title: string;
 *   price: number;
 * }
 * const products = getModel<Product>(registry, 'mongodb', 'products');
 * const allProducts = await products.find({}).toArray();
 * ```
 */
export function getModel<T extends Document = Document>(registry: Registry, managerName: string, modelName: string): Collection<T>;

export function getModel<T extends Document = Document>(registry: Registry, managerName: string, modelName?: string): Collection<T> {
  const model = registry.getModel<Collection<T>>(managerName, modelName);
  if (!model) {
    throw new ModelNotFoundError(
      modelName || managerName,
      modelName ? managerName : undefined
    );
  }
  return model;
}

/**
 * Retrieves a MongoDbManager instance from the registry.
 *
 * @template M - The specific MongoDbManager type to return, defaults to MongoDbManager
 *
 * @param registry - The Storehouse registry containing registered managers
 * @param managerName - Optional name of the manager to retrieve. If omitted, retrieves the default manager
 *
 * @returns The requested MongoDbManager instance
 *
 * @throws {ManagerNotFoundError} If the manager is not found in the registry
 * @throws {InvalidManagerConfigError} If the manager exists but is not an instance of MongoDbManager
 *
 * @example
 * ```typescript
 * const mongoManager = getManager(registry, 'mongodb');
 * await mongoManager.connect();
 * ```
 */
export function getManager<M extends MongoDbManager = MongoDbManager>(registry: Registry, managerName?: string): M {
  const manager = registry.getManager<M>(managerName);
  if (!manager) {
    throw new ManagerNotFoundError(managerName || registry.defaultManager);
  }
  if (!(manager instanceof MongoDbManager)) {
    throw new InvalidManagerConfigError(
      `Manager "${managerName || registry.defaultManager}" is not instance of MongoDbManager`
    );
  }
  return manager;
}

/**
 * Retrieves the underlying MongoDB client connection from a manager in the registry.
 *
 * @param registry - The Storehouse registry containing registered managers
 * @param managerName - Optional name of the manager. If omitted, uses the default manager
 *
 * @returns The MongoDB client instance
 *
 * @throws {ManagerNotFoundError} If the manager is not found in the registry
 * @throws {InvalidManagerConfigError} If the connection is not an instance of MongoClient
 *
 * @example
 * ```typescript
 * const client = getConnection(registry, 'mongodb');
 * const admin = client.db().admin();
 * const dbs = await admin.listDatabases();
 * ```
 */
export function getConnection(registry: Registry, managerName?: string): MongoClient {
  const conn = registry.getConnection<MongoClient>(managerName);
  if (!conn) {
    throw new ManagerNotFoundError(managerName || registry.defaultManager);
  }
  if (!(conn instanceof MongoClient)) {
    throw new InvalidManagerConfigError(
      `Connection "${managerName || registry.defaultManager}" is not instance of MongoClient`
    );
  }
  return conn;
}

/**
 * Extended health check result specific to MongoDB managers.
 * Includes MongoDB connection status and ping response.
 *
 * @extends HealthCheckResult
 */
export interface MongoDbHealthCheckResult extends HealthCheckResult {
  /**
   * Detailed information about the MongoDB connection health.
   */
  details: {
    /** The name of the manager */
    name: string;
    /** The name of the database */
    databaseName?: string;
    /** Whether the MongoDB connection is currently open */
    isOpen: boolean;
    /** Whether the MongoDB connection is ready to accept commands */
    isReady: boolean;
    /** The response from the MongoDB PING command */
    pingResponse?: Document;
    /** Time taken to perform the health check in milliseconds */
    latency?: string;
    /** Error message if the health check failed */
    error?: string;
    /** Additional custom properties */
    [key: string]: unknown;
  };
}

/**
 * Manager class for MongoDB integration with Storehouse.
 * Provides connection management, model registration, and health checking for MongoDB databases.
 *
 * This manager extends the MongoDB MongoClient, offering a unified interface
 * for working with MongoDB databases through the Storehouse registry system.
 *
 * @extends MongoClient
 * @implements {IManager}
 *
 * @example
 * ```typescript
 * const manager = new MongoDbManager({
 *   name: 'mongodb-main',
 *   config: {
 *     url: 'mongodb://localhost:27017/mydb',
 *     options: {
 *       maxPoolSize: 10,
 *       minPoolSize: 5
 *     }
 *   }
 * });
 *
 * await manager.connect();
 *
 * const usersCollection = manager.getModel('users');
 * const users = await usersCollection.find({}).toArray();
 * ```
 */
export class MongoDbManager extends MongoClient implements IManager {
  /**
   * Identifier for the manager type.
   * @readonly
   */
  static readonly type = '@storehouse/mongodb';

  /**
   * The name of this manager instance.
   * @protected
   */
  protected name: string;

  /**
   * Creates a new MongoDbManager instance.
   *
   * @param settings - Configuration settings for the manager
   *
   * @throws {InvalidManagerConfigError} If the connection URL is missing
   *
   * @remarks
   * The connection is created but not opened. You must call `connect()` to establish the connection.
   * Connection events (topologyOpening, serverOpening, serverClosed, topologyClosed, error) are automatically registered and logged.
   */
  constructor(settings: MongoDbManagerArg) {
    if (!settings.config?.url) {
      throw new InvalidManagerConfigError('Missing connection url');
    }

    super(settings.config.url, settings.config.options);

    this.name = settings.name || `MongoDB ${Date.now()}_${randomBytes(3).toString('hex')}`;

    this.#registerConnectionEvents();

    Log.info(`[${this.name}] MongoClient created. Must call "MongoClient.connect()".`);
  }

  /**
   * Registers event listeners for MongoDB connection lifecycle events.
   * Logs connection state changes for debugging and monitoring.
   *
   * @private
   */
  #registerConnectionEvents() {
    this.on('topologyOpening', () => {
      Log.info(`[${this.name}] connecting ...`);
    });
    this.on('serverOpening', () => {
      Log.info(`[${this.name}] connected!`);
    });
    this.on('serverClosed', () => {
      Log.warn(`[${this.name}] disconnected!`);
    });
    this.on('topologyClosed', () => {
      Log.info(`[${this.name}] connection closed!`);
    });
    this.on('error', (err) => {
      Log.error(`[${this.name}] connection error: ${err.message}`);
    });
  }

  /**
   * Gets the underlying MongoDB client connection.
   *
   * @returns The MongoDB client instance (this instance)
   *
   * @example
   * ```typescript
   * const client = manager.getConnection();
   * const db = client.db('mydb');
   * ```
   */
  getConnection(): MongoClient {
    return this;
  }

  /**
   * Closes the MongoDB connection.
   *
   * @param force - Optional flag to force close the connection, bypassing any connection pool cleanup
   * @returns A promise that resolves when the connection is closed
   *
   * @example
   * ```typescript
   * // Graceful close
   * await manager.closeConnection();
   *
   * // Force close
   * await manager.closeConnection(true);
   * ```
   */
  async closeConnection(force?: boolean): Promise<void> {
    if (force) {
      await this.close(force);
    } else {
      await this.close();
    }
  }

  /**
   * Retrieves a MongoDB collection by name.
   * Supports dot notation for database.collection format.
   *
   * @template T - The document type for the collection, defaults to Document
   *
   * @param name - The name of the collection, or database.collection format
   * @returns The MongoDB Collection instance
   *
   * @example
   * ```typescript
   * // Get collection from default database
   * const users = manager.getModel('users');
   *
   * // Get collection with specific database
   * const users = manager.getModel('mydb.users');
   *
   * // With type parameter
   * interface User {
   *   name: string;
   *   email: string;
   * }
   * const users = manager.getModel<User>('users');
   * ```
   */
  getModel<T extends Document = Document>(name: string): Collection<T> {
    const conn = this.getConnection();
    let model: Collection<T>;
    const names = name.split('.');
    if (names.length >= 2) {
      model = conn.db(names[0]).collection<T>(names[1]);
    } else {
      model = conn.db().collection<T>(names[0]);
    }
    return model;
  }

  /**
   * Checks if the MongoDB connection is currently active.
   * Uses a simple ping command that doesn't require admin privileges.
   *
   * @returns A promise that resolves to true if connected, false otherwise
   *
   * @example
   * ```typescript
   * if (await manager.isConnected()) {
   *   console.log('MongoDB is connected');
   * }
   * ```
   */
  async isConnected(): Promise<boolean> {
    try {
      // Use a simple ping command on the database
      await this.db().command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Performs a comprehensive health check on the MongoDB connection.
   * Tests connectivity by sending a PING command and gathering connection metrics.
   * This method works with restricted database access (non-admin users).
   *
   * @returns A promise that resolves to a detailed health check result including:
   * - Connection status (open/ready)
   * - Ping response
   * - Response latency
   * - Error details (if unhealthy)
   *
   * @example
   * ```typescript
   * const health = await manager.healthCheck();
   * if (health.healthy) {
   *   console.log(`MongoDB is healthy. Latency: ${health.details.latency}`);
   *   console.log(`Ping response:`, health.details.pingResponse);
   * } else {
   *   console.error(`MongoDB is unhealthy: ${health.message}`);
   * }
   * ```
   */
  async healthCheck(): Promise<MongoDbHealthCheckResult> {
    const start = Date.now();
    const timestamp = start;

    try {
      // Use ping command on the database
      const db = this.db();
      const pingResult = await db.command({ ping: 1 });

      const latency = Date.now() - start;

      return {
        healthy: true,
        message: 'MongoDB connection is healthy',
        details: {
          name: this.name,
          databaseName: db.databaseName,
          isOpen: true,
          isReady: pingResult.ok === 1,
          pingResponse: pingResult,
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
          name: this.name,
          isOpen: false,
          isReady: false,
          error: error instanceof Error ? error.stack : String(error)
        },
        latency: Date.now() - start,
        timestamp
      };
    }
  }
}