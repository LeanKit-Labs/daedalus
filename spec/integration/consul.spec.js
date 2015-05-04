var should = require( 'should' );
var when = require( 'when' );
var api;

describe( 'Daedalus Consul Wrapper', function() {
	before( function( done ) {
		api = require( '../../src/consul.js' )( 'daedalus-spec', 'localhost', 8501 );

		when.all( [
			api.agent.register( 'service1', 6370 ),
			api.agent.register( 'service2', 6371 )
		] ).then( function() {
			done();
		} );

	} );

	after( function( done ) {
		when.all( [
			api.agent.deregister( 'service1' ),
			api.agent.deregister( 'service2' )
		] ).then( function() {
			done();
		} );
	} );

	describe( 'when getting a local service', function() {
		var list;
		before( function( done ) {
			api.catalog.listServices()
				.then( function( res ) {
					list = res;
					done();
				} );
		} );

		it( 'should get the service list', function() {
			//console.log( list );
		} );
	} );

	describe( 'when getting any service', function() {} );

} );