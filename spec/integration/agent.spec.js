var should = require( 'should' ),
	path = require( 'path' ),
	_ = require( 'lodash' ),
	api = require( '../../src/consul.js' )( 'daedalus-spec', 'localhost', 8501 ),
	os = require( 'os' ),
	pipeline = require( 'when/pipeline' ),
	nodeName = 'consul-agent1',
	when = require( 'when' );

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

describe( 'when using a check', function() {
	var result;
	var check = {
		ID: 'my-registered-check',
		Name: 'Testing this check',
		Notes: 'Just a test',
		TTL: '60s'
	};

	var expected = {
		'my-registered-check': {
			Node: 'consul-agent1',
			CheckID: 'my-registered-check',
			Name: 'Testing this check',
			Status: 'critical',
			Notes: 'Just a test',
			Output: '',
			ServiceID: '',
			ServiceName: ''
		}
	};

	beforeEach( function( done ) {
		api.agent.checks.register( check )
			.then( function( res ) {
				done();
			} );
	} );

	describe( "when listing checks", function() {
		it( 'should list the created check', function( done ) {
			api.agent.checks.list()
				.then( function( checks ) {
					checks.should.eql( expected );
					done();
				} );
		} );
	} );

	describe( "when warning a check", function() {
		it( 'should mark the check as warning', function( done ) {
			when.all( [
				api.agent.checks.warn( check.ID, 'uh oh' ),
				api.agent.checks.list()
			] ).then( function( res ) {
				var list = res[ 1 ];
				var myCheck = list[ check.ID ];
				myCheck.Status.should.equal( "warning" );
				myCheck.Output.should.equal( "uh oh" );
				done();
			} );

		} );
	} );

	describe( "when passing a check", function() {
		it( 'should mark the check as passing', function( done ) {
			when.all( [
				api.agent.checks.pass( check.ID ),
				api.agent.checks.list()
			] ).then( function( res ) {
				var list = res[ 1 ];
				list[ check.ID ].Status.should.equal( "passing" );
				done();
			} );

		} );
	} );

	describe( "when failing a check", function() {
		it( 'should mark the check as failing', function( done ) {
			when.all( [
				api.agent.checks.fail( check.ID ),
				api.agent.checks.list()
			] ).then( function( res ) {
				var list = res[ 1 ];
				list[ check.ID ].Status.should.equal( "critical" );
				done();
			} );

		} );
	} );

	afterEach( function( done ) {
		api.agent.checks.deregister( check.ID )
			.then( function( res ) {
				done();
			} );
	} );

} );

describe( "when listing members", function() {
	var members;
	before( function( done ) {
		api.agent.listMembers()
			.then( function( res ) {
				members = res;
				done();
			} )
	} );

	it( "should list the agent members", function() {
		var names = _.pluck( members, "Name" );
		names.should.containEql( "consul-agent1" );
		names.should.containEql( "consul-server1" );
	} );
} );