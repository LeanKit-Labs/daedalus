require( 'should' );
var _ = require( 'lodash' );
var consulCfg = require( './consul.config.js' )();
var api = require( '../../src/consul.js' )( 'daedalus-spec', consulCfg );

describe( 'when getting a node\'s services', function() {
	var result;
	before( function( done ) {
		api.catalog.getNode( 'consul-server1.leankit.com' )
			.then( function( res ) {
				result = res;
				done();
			} );
	} );

	it( 'should return the node information', function() {
		result.Node.Node.should.equal( 'consul-server1.leankit.com' );
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

describe( 'when listing the datacenters', function() {
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
		var nodes = _.pluck( result, 'Node' );
		nodes.should.containEql( 'consul-agent1.leankit.com' );
		nodes.should.containEql( 'consul-server1.leankit.com' );
	} );
} );