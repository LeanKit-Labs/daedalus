require( 'should' );
var path = require( 'path' ),
	_ = require( 'lodash' ),
	api = require( '../src/api.js' ),
	os = require( 'os' ),
	machineName = os.hostname();

describe( 'when registering service with catalog', function() {

	it( 'should get test service', function( done ) {
		this.timeout( 6000 );
		
		api.getLocal( 'test-cat-service', function( service ) {
			if( done ) {
				done();
				done = undefined;
			}
		} );

		api.catalog.register( 'test-cat-service', 4444 )
			.then( null, function( err ) {
			} )
			.then( function() {
			} );
	} );

	after( function() {
		api.catalog.deregister( 'test-cat-service' )
			.then( null, function( err ) {
				console.log( err );
			} )
			.then( function() {
			} );
	} );

} );