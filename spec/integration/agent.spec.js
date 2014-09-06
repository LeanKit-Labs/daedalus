require( 'should' );
var path = require( 'path' ),
	_ = require( 'lodash' ),
	api = require( '../../src/consul.js' )( 'daedalus-spec', 'localhost', 'localhost', 8501 ),
	os = require( 'os' ),
	pipeline = require( 'when/pipeline' ),
	nodeName = 'daedalus1';

describe( 'when getting a list of services without any', function() {
	var result;

	before( function( done ) {
		api.agent.listServices()
			.then( function( value ) {
				result = value;
				done();
			} );
	} );

	it( 'should get nothing', function() {
		result.should.eql( {} );
	} );
} );

describe( 'when getting a list of services', function() {
	var list;
	
	before( function( done ) {
		var getList = function() {
			api.agent.listServices()
				.then( function( result ) {
					list = result;
					done();
				} );
			};

		api.agent.register( 'test-service', 1000, [ 'test', 'registration' ] )
			.then( getList );
	} );

	it( 'should get test service', function() {
		var key = 'test-service@' + nodeName,
			expected = {};
		expected[ key ] = {
			Address: api.address,
			ID: 'test-service@' + nodeName,
			Service: 'test-service',
			Port: 1000,
			Tags: [ 'test', 'registration' ]
		};
		list.should.eql( expected );
	} );

	after( function( done ) {
		api.agent.deregister( 'test-service' )

			.then( function() {
				done();
			} );
	} );
} );