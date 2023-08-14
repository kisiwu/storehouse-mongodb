# @storehouse/mongodb
MongoDB driver manager for @storehouse/core.

[Documentation](https://kisiwu.github.io/storehouse/mongodb/latest/).


## Installation

Make sure you have [@storehouse/core](https://www.npmjs.com/package/@storehouse/core) and [mongodb](https://www.npmjs.com/package/mongodb) installed.

```bash
$ npm install @storehouse/mongodb
```

## Usage

### Basic

movies.ts
```ts
export interface Movie {
  title: string;
  rate?: number;
}
```

index.ts
```ts
import Storehouse from '@storehouse/core';
import { MongoDBManager } from '@storehouse/mongodb';

// register
Storehouse.add({
  local: {
    // type: '@storehouse/mongodb' if you called Storehouse.setManagerType(MongoDBManager)
    type: MongoDBManager, 
    config: {
      // string
      url: 'mongodb://localhost:27017/database',
      
      // MongoClientOptions
      options: {
        keepAlive: true,
      }
    }
  }
});
```

Once the manager registered, you should open the connection to get access to the database.

```ts
import Storehouse from '@storehouse/core';
import { MongoDBManager } from '@storehouse/mongodb';
import { Collection, MongoClient } from 'mongodb';
import { Movie } from './movies';

// open the connection by calling MongoClient.connect()
const conn = await Storehouse.getConnection<MongoClient>('local')?.connect();
if (conn) {
  console.log('retrieved connection for database', conn.db().databaseName);
}

// manager
const localManager = Storehouse.getManager<MongoDBManager>('local');
if (localManager) {
  // model
  const moviesModel = manager.getModel<Collection<Movie>>('movies');
  if (moviesModel) {
    console.log('nb movies', await moviesModel.countDocuments());
  }
}

// model
const Movies = Storehouse.getModel<Collection<Movie>>('movies');
if(Movies) {
  console.log('nb movies', await Movies.countDocuments());
}
```

### Helpers

There are methods to help you retrieve the connection, manager and models so you don't have to check if they are undefined.
Those methods throw an error when they fail.

```ts
import Storehouse from '@storehouse/core';
import { getConnection, getManager, getModel } from '@storehouse/mongodb';
import { Collection } from 'mongodb';
import { Movie } from './movies';

// connection
const conn = await getConnection(Storehouse, 'local').connect();
console.log('retrieved connection for database', conn.db().databaseName);

// manager
const manager = getManager(Storehouse, 'local');
manager.getModel<Collection<Movie>>('movies');

// model
const Movies = getModel<Movie>(Storehouse, 'local', 'movies');
console.log('nb movies', await Movies.countDocuments());
```

### Collections from another database

You can access data from another database sharing the same socket connection.
To get access to a collection from another database with the method `getModel`, the name of the model should be in the following format: `<database-name>.<collection-name>`.

```ts
const Movies = Storehouse.getModel<Collection<Movie>>('local', 'otherdatabase.movies');
```
```ts
const Movies = getModel(Storehouse, 'local', 'otherdatabase.movies');
```

## References

- [Documentation](https://kisiwu.github.io/storehouse/mongodb/latest/)
- [@storehouse/core](https://www.npmjs.com/package/@storehouse/core)
- [mongodb](https://www.npmjs.com/package/mongodb)

