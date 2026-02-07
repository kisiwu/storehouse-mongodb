import { Debug } from '@novice1/logger';
import { Storehouse } from '@storehouse/core';
import { MongoDbManager, getModel, getManager, getConnection } from '../../src/index';

Debug.enable('@storehouse/mongodb*');

interface Movie {
  title: string;
  rate?: number;
}

describe('connect', function () {
  const { logger, params } = this.ctx.kaukau;

  it('should init and connect', async () => {
    // Storehouse.setManagerType(MongooseManager);

    let databaseUri = `${params('mongodb.protocol')}://`;
    if (params('mongodb.username') && params('mongodb.password')) {
      databaseUri += `${params('mongodb.username')}:${params('mongodb.password')}@`;
    }
    databaseUri += `${params('mongodb.hostname')}`;
    if (params('mongodb.port') && params('mongodb.port') !== '0') {
      databaseUri += `:${params('mongodb.port')}`;
    }
    databaseUri += `/${params('mongodb.database')}`;
    if (params('mongodb.options')) {
      databaseUri += `?${params('mongodb.options')}`;
    }

    try {
      Storehouse.add({
        mongodb: {
          type: MongoDbManager,
          config: {
            url: databaseUri,
            // MongoClientOptions
            options: {

            }
          }
        }
      });

      const conn = await getConnection(Storehouse, 'mongodb').connect();// Storehouse.getConnection<MongoClient>()?.connect();
      logger.info('retrieved connection for database', conn.db().databaseName);

      const manager = getManager(Storehouse/*, 'mongodb'*/);
      const MoviesModel = manager.getModel<Movie>('movies');
      if (MoviesModel) {
        logger.log('nb movies', await MoviesModel.countDocuments());
      }

      const Movies = getModel<Movie>(Storehouse, /*'mongodb',*/ 'movies');

      const newMovie: Movie = {
        title: `Last Knight ${Math.ceil(Math.random() * 1000) + 1}`
      };
      newMovie.rate = 3;
      const r = await Movies.insertOne(newMovie);
      logger.info('added new movie', r.insertedId);

      const movies = await Movies.find({}).sort({ _id: -1 }).limit(1).toArray();
      if (movies.length) {
        const doc = movies[0];
        logger.log('new movie title:', doc.title);
      }

      logger.info('deleted movie', await Movies.deleteOne({ _id: r.insertedId }));

      logger.log('nb current database movies', await Movies.countDocuments());

      //const OtherMovies = getModel<Movie>(Storehouse, 'otherdatabase.movies');
      //logger.log('nb other database movies', await OtherMovies.countDocuments());

      await Storehouse.close(/*true*/);
      logger.info('closed connections');

      /*
      await conn.connect();

      logger.info(await Movies.countDocuments());

      await Storehouse.close();
      */

      logger.info('Done');
    } catch (e) {
      await Storehouse.close();
      logger.info('closed connections');
      throw e;
    }
  });
});
