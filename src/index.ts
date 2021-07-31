import { IManager, ManagerArg } from '@storehouse/core/lib/manager';
import { Registry } from '@storehouse/core/lib/registry';
import { 
  MongoClient,
  MongoClientOptions,
  Document,
  Collection
} from 'mongodb';
import Logger from '@novice1/logger';


const Log = Logger.debugger('@storehouse/mongodb:manager');

export interface MongoDBManagerArg extends ManagerArg {
  config?: {
    url: string;
    options?: MongoClientOptions;
  },
}

/**
 * 
 * @param registry 
 * @param manager Manager name or model name
 * @param modelName Model name
 * @returns 
 */
export function getModel<T extends Document = Document>(registry: Registry, managerName: string, modelName?: string): Collection<T> {
  const model = registry.getModel<Collection<T>>(managerName, modelName);
  if (!model) {
    throw new ReferenceError(`Could not find model "${modelName || managerName}"`);
  }
  return model;
}

export function getManager<M extends MongoDBManager = MongoDBManager>(registry: Registry, managerName?: string): M {
  const manager = registry.getManager<M>(managerName);
  if (!manager) {
    throw new ReferenceError(`Could not find manager "${managerName || registry.defaultManager}"`);
  }
  if (!(manager instanceof MongoDBManager)) {
    throw new TypeError(`Manager "${managerName || registry.defaultManager}" is not instance of MongooseManager`);
  }
  return manager;
}

export function getConnection(registry: Registry, managerName?: string): MongoClient {
  const conn = registry.getConnection<MongoClient>(managerName);
  if (!conn) {
    throw new ReferenceError(`Could not find connection "${managerName || registry.defaultManager}"`);
  }
  return conn;
}

export class MongoDBManager implements IManager {
  static readonly type = '@storehouse/mongodb';

  protected connection: MongoClient;

  protected name: string;

  constructor(settings: MongoDBManagerArg) {
    this.name = settings.name || `MongoDB ${Date.now()}_${Math.ceil(Math.random() * 10000) + 10}`;

    if (!settings.config?.url) {
      throw new TypeError('Missing connection url');
    }

    this.connection = new MongoClient(settings.config.url, settings.config.options);

    this._registerConnectionEvents(this.connection);

    Log.info('[%s] MongoClient created. Must call "MongoClient.connect()".', this.name);
  }

  private _registerConnectionEvents(connection: MongoClient) {
    connection.on('connecting', () => {
      Log.warn('Connecting [%s] ...', this.name);
    });
    connection.on('serverOpening', () => {
      Log.info('[%s] connection opens!', this.name);
    });
    connection.on('serverClosed', () => {
      Log.info('[%s] connection closes!', this.name);
    });
    connection.on('disconnecting', () => {
      Log.warn('Disconnecting [%s] ...', this.name);
    });
    connection.on('disconnected', () => {
      Log.warn('[%s] has been disconnected!', this.name);
    });
    connection.on('reconnected', () => {
      Log.warn('[%s] has been reconnected!', this.name);
    });
    connection.on('error', (err) => {
      Log.error('[%s] %O', this.name, err);
    });
    connection.on('fullsetup', () => {
      Log.info('[%s] connected to the primary and one secondary server', this.name);
    });
    connection.on('all', () => {
      Log.info('[%s] connected to all servers', this.name);
    });
    connection.on('reconnectFailed', () => {
      Log.error('[%s] failed to reconnect', this.name);
    });
  }

  getConnection(): MongoClient {
    return this.connection;
  }

  async closeConnection(force?: boolean): Promise<void> {
    if (force) {
      await this.connection.close(force);
    } else {
      await this.connection.close();
    }
  }

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
}