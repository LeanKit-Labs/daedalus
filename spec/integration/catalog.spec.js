require( 'should' );
var path = require( 'path' ),
	_ = require( 'lodash' ),
	api = require( '../../src/consul.js' )( 'daedalus-spec', 'localhost', 'localhost', 8501 ),
	os = require( 'os' ),
	machineName = os.hostname();

describe( 'when registering service with catalog', function() {
	var service;

	before( function( done ) {
		api.wait.then( function() {
			api.catalog.registerService( api.node, api.address, 'test-cat-service', 4444 );
		} );
		api.getLocal( 'test-cat-service' )
			.then( function( services ) {
				service = services[ 0 ];
				done();
			} );
	} );

	it( 'should get test service', function() {
		service.should.eql( {
			Node: api.node,
    		Address: api.address,
    		ID: 'test-cat-service@' + api.node,
    		Service: 'test-cat-service',
    		Tags: [],
    		Port: 4444 } );
		} );

	after( function( done ) {
		api.catalog.deregisterService( api.node, 'test-cat-service' )
			.then( function() {
				done();
			} );
	} );
} );