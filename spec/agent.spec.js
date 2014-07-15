require( 'should' );
var path = require( 'path' ),
	_ = require( 'lodash' ),
	api = require( '../src/api.js' ),
	os = require( 'os' ),
	machineName = os.hostname();

describe( 'when waiting for service events', function () {



} );

describe( 'when getting a list of services without any', function() {
	var result;
	before( function( done ) {
		api.agent.listServices()
			.then( function( value ) {
				result = value;
				done();
			} )
			.then( null, function( err ) {
				done();
			} );
	} );
	it( 'should get nothing', function() {
		result.should.eql( {} );
	} );
} );

describe( 'when getting a list of services', function() {

	before( function( done ) {
		api.on( 'test-service', function( service ) {
			console.log( 'EVENTY-BITS' );
			eventedService = service;
		} );

		api.agent.register( 'test-service', 1000, [ 'test', 'registration' ] )
			.then( null, function( err ) {
				console.log( err );
				done();
			} )
			.then( function() {
				done();
			} );
	} );

	it( 'should get test service', function( done ) {
		api.agent.listServices()
			.then( function( list ) {
				list.should.eql( { 'test-service': [ {
					id: 'test-service@' + machineName,
					name: 'test-service',
					host: 'alexs-mbp-3',
					port: 1000,
					tags: [ 'test', 'registration' ]
				} ] } );
				done();
			} )
			.then( null, function( err ) {
				console.log( err );
				done();
			} );
	} );

	after( function() {
		api.agent.deregister( 'test-service' )
			.then( null, function( err ) {
				console.log( err );
			} )
			.then( function() {
			} );
	} );

} );