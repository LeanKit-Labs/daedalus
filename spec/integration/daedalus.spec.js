require( 'should' );
var path = require( 'path' ),
	_ = require( 'lodash' ),
	api = require( '../../src/consul.js' )( 'dc1' ),
	daedalus = require( '../../src/index.js' )( 'test' ),
	when = require( 'when' );

describe( 'when retrieving configuration', function() {
	this.timeout( 10000 );
	before( function( done ) {
		when.all( [
			api.setConfig( 'test-redis', {} ),
			api.setConfig( 'test-riak', {} ),
			api.setConfig( 'test-rabbitmq', {} ),
			api.agent.register( 'redis', 6379 ),
			api.agent.register( 'rabbitmq', 5672 ),
			api.catalog.registerService( 'ubuntu', 'ubuntu', 'riak', 8087 ),
			api.agent.register( 'riak', 8087 )
		] )
		.then( function() {
			done();
		} );
	} );

	describe( 'with valid daedalus initialization', function() {
		var fount;

		before( function( done ) {
			daedalus( {
				riak: { service: 	'riak', 	config: 'riak',		module: process.cwd() + '/spec/integration/riak.js', all: true },
				rabbit: { service: 	'rabbitmq', config: 'rabbitmq',	module: process.cwd() + '/spec/integration/rabbit.js' },
				redis: { service: 	'redis', 	config: 'redis',	module: process.cwd() + '/spec/integration/redis.js' }
			}, 'test' )
			.then( function( di ) {
				fount = di;
				done();
			} );
		} );

		it( 'should configure and register redis', function( done ) {
			fount.resolve( [ 'redis', 'riak', 'rabbit' ] )
				.then( function( deps ) {
					deps.should.have.keys( 'redis', 'riak', 'rabbit' );
					done();
				} );
		} );

	} );

	describe( 'with invalid service dependency', function() {
		var err;

		before( function( done ) {
			daedalus( {
				riak: { service: 	'durp', 	config: 'riak',		module: process.cwd() + '/spec/integration/riak.js' },
				rabbit: { service: 	'rabbitmq', config: 'rabbitmq',	module: process.cwd() + '/spec/integration/rabbit.js' },
				redis: { service: 	'redis', 	config: 'redis',	module: process.cwd() + '/spec/integration/redis.js' }
			}, 'test' )
			.then( undefined, function( e ) {
				err = e.toString();
				done();
			} );
		} );

		it( 'should fail with clear error', function() {
			err.should.equal( 'Error: failed to resolve dependencies because service "riak" could not be found.' );
		} );
	} );

	describe( 'with invalid configuration dependency', function() {
		var err;

		before( function( done ) {
			daedalus( {
				riak: { service: 	'riak', 	config: 'fAiL',		module: process.cwd() + '/spec/integration/riak.js' },
				rabbit: { service: 	'rabbitmq', config: 'rabbitmq',	module: process.cwd() + '/spec/integration/rabbit.js' },
				redis: { service: 	'redis', 	config: 'redis',	module: process.cwd() + '/spec/integration/redis.js' }
			}, 'test' )
			.then( undefined, function( e ) {
				err = e.toString();
				done();
			} );
		} );

		it( 'should fail with clear error', function() {
			err.should.equal( 'Error: failed to retrieve configuration because config key "test-fAiL" could not be found.' );
		} );
	} );

	describe( 'with missing option', function() {
		var fount;

		before( function( done ) {
			daedalus( {
				riak: { service: 	'riak', 	options: 'fAiL',	module: process.cwd() + '/spec/integration/riak.js' },
				rabbit: { service: 	'rabbitmq', config: 'rabbitmq',	module: process.cwd() + '/spec/integration/rabbit.js' },
				redis: { service: 	'redis', 	config: 'redis',	module: process.cwd() + '/spec/integration/redis.js' }
			}, 'test' )
			.then( function( di ) {
				fount = di;
				done();
			} );
		} );

		it( 'should configure and register redis', function( done ) {
			fount.resolve( [ 'redis', 'riak', 'rabbit' ] )
				.then( function( deps ) {
					deps.should.have.keys( 'redis', 'riak', 'rabbit' );
					done();
				} );
		} );
	} );

	after( function( done ) {
		when.all( [
			api.kv.del( 'test-redis' ),
			api.kv.del( 'test-riak' ),
			api.kv.del( 'test-rabbitmq' ),
			api.agent.deregister( 'redis' ),
			api.agent.deregister( 'rabbitmq' ),
			api.agent.deregister( 'riak' ),
			api.catalog.deregisterService( 'ubuntu', 'riak@' + api.node )
		] ).then( function() {
			done();
		} );
	} );
} );