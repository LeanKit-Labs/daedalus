require( 'should' );
var _ = require( 'lodash' );
var api = require( '../../src/consul.js' )( 'daedalus-spec', 'localhost', 'localhost', 8501 );

describe.skip( 'when registering service with catalog', function() {
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

describe( 'when getting a node\'s services', function() {
	var result;
	before( function( done ) {
		api.catalog.getNode( 'consul-server1' )
			.then( function( res ) {
				result = res;
				done();
			} );
	} );

	it( 'should return the node information', function() {
		result.Node.Node.should.equal( 'consul-server1' );
	} );

	it( 'should return the list of services', function() {
		result.Services.consul.should.be.an.object;
	} );

} );

describe( 'when listing services', function() {
	var result;
	before( function( done ) {
		api.catalog.listServices()
			.then( function( res ) {
				result = res;
				done();
			} );
	} );

	it( 'should return the full list', function() {
		result.consul.should.exist;
	} );
} );

describe( "when listing the datacenters", function() {
	var result;
	before( function( done ) {
		api.catalog.listDatacenters()
			.then( function( res ) {
				result = res;
				done();
			} );
	} );

	it( 'should return the full list', function() {
		result.should.containEql( 'daedalus-spec' );
	} );
} );

describe( 'when listing nodes', function() {
	var result;
	before( function( done ) {
		api.catalog.listNodes()
			.then( function( res ) {
				result = res;
				done();
			} );
	} );

	it( 'should return the full list', function() {
		var nodes = _.pluck( result, "Node" );
		nodes.should.containEql( "consul-agent1" );
		nodes.should.containEql( "consul-server1" );
	} );
} );