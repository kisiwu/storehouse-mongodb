const { Debug } = require('@novice1/logger');
const { Storehouse } = require('@storehouse/core');
const { MongoDbManager, getModel } = require('../../lib/index');

Debug.enable('@storehouse/mongodb*');

describe('connect', function () {
  const { logger, params } = this.ctx.kaukau;

  it('should init and connect', async function () {
    Storehouse.setManagerType(MongoDbManager);

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
          type: '@storehouse/mongodb',
          config: {
            url: databaseUri,
            // MongoClientOptions
            options: {
            }
          }
        }
      });

      const conn = await Storehouse.getConnection('mongodb').connect();
      logger.info('retrieved connection for database', conn.db().databaseName);

      const manager = Storehouse.getManager('mongodb');
      const MoviesModel = manager.getModel('movies');
      if (MoviesModel) {
        logger.log('nb movies', await MoviesModel.countDocuments());
      }

      const Movies = getModel(Storehouse, 'movies')//Storehouse.getModel('mongodb', 'movies');
  
      const newMovie = {
        title: `Last Knight ${Math.ceil(Math.random() * 1000) + 1}`
      };
      newMovie.rate = 3;
      const r = await Movies.insertOne(newMovie);
      logger.info('added new movie', r.insertedId);
  
      const movies = await Movies.find({}).sort({_id: -1}).limit(1).toArray();
      if (movies.length) {
        const doc = movies[0];
        logger.log('new movie title:', doc.title);
      }

      logger.info('deleted movie', await Movies.deleteOne({ _id: r.insertedId }));

      logger.log('nb current database movies', await Movies.countDocuments());

      //const OtherMovies = getModel(Storehouse, 'otherdatabase.movies');
      //logger.log('nb other database movies', await OtherMovies.countDocuments());

      await Storehouse.close();
      logger.info('closed connections');

      logger.info('Done');
    } catch(e) {
      await Storehouse.close();
      logger.info('closed connections');
      throw e;
    }
  });
});
