require( 'should' );
var path = require( 'path' );
var _ = require( 'lodash' );
var consulCfg = require( './consul.config.js' )();
var consulCfgCopy = require( './consul.config.js' )();
var api = require( '../../src/consul.js' )( consulCfg );
var daedalus = require( '../../src/index.js' )( 'test', consulCfgCopy );
var when = require( 'when' );
var duration = 3000;

describe( 'when retrieving configuration', function() {
	this.timeout( duration );
	before( function( done ) {
		when.all( [
			api.setConfig( 'test-redis', {} ),
			api.setConfig( 'test-riak', {} ),
			api.setConfig( 'test-rabbitmq', {} ),
			api.agent.register( 'redis', 6379 ),
			api.agent.register( 'rabbitmq', 5672 ),
			api.agent.register( 'riak', 8087 )
		] )
			.then( function() {
				done();
			} );
	} );

	describe( 'with valid daedalus initialization', function() {
		var fount;

		before( function( done ) {
			daedalus.initialize( {
				riak: { service: 'riak', config: 'riak', module: './spec/integration/riak.js', all: true },
				rabbit: { service: 'rabbitmq', config: 'rabbitmq', module: './spec/integration/rabbit.js' },
				redis: { service: 'redis', config: 'redis', module: './spec/integration/redis.js' }
			}, 'test' )
				.then( function( di ) {
					fount = di;
					done();
				} )
				.then( null, function( err ) {
					console.log( err.stack );
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
			daedalus.initialize( {
				riak: { service: 'durp', config: 'riak', module: './spec/integration/riak.js' },
				rabbit: { service: 'rabbitmq', config: 'rabbitmq', module: './spec/integration/rabbit.js' },
				redis: { service: 'redis', config: 'redis', module: './spec/integration/redis.js' }
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
			daedalus.initialize( {
				riak: { service: 'riak', config: 'fAiL', module: './spec/integration/riak.js' },
				rabbit: { service: 'rabbitmq', config: 'rabbitmq', module: './spec/integration/rabbit.js' },
				redis: { service: 'redis', config: 'redis', module: './spec/integration/redis.js' }
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
			daedalus.initialize( {
				riak: { service: 'riak', options: 'fAiL', module: './spec/integration/riak.js', all: true },
				rabbit: { service: 'rabbitmq', config: 'rabbitmq', module: './spec/integration/rabbit.js' },
				redis: { service: 'redis', config: 'redis', module: './spec/integration/redis.js' }
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
			api.agent.deregister( 'riak' )
		] ).then( function() {
			done();
		} );
	} );
} );
