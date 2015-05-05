require( 'should' );
var consulCfg = require( './consul.config.js' )(),
	nodeName = consulCfg.host,
	_ = require( 'lodash' ),
	api = require( '../../src/consul.js' )( 'daedalus-spec', consulCfg );

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
	var check = {
		ID: 'my-registered-check',
		Name: 'Testing this check',
		Notes: 'Just a test',
		TTL: '60s'
	};

	var expected = {
		'my-registered-check': {
			Node: 'consul-agent1.leankit.com',
			CheckID: 'my-registered-check',
			Name: 'Testing this check',
			Status: 'critical',
			Notes: 'Just a test',
			Output: '',
			ServiceID: '',
			ServiceName: ''
		}
	};

	before( function( done ) {
		api.agent.checks.deregister( check.ID )
			.then( function( res ) {
				done();
			} );
	} );

	beforeEach( function( done ) {
		api.agent.checks.register( check )
			.then( function( res ) {
				done();
			} );
	} );

	afterEach( function( done ) {
		api.agent.checks.deregister( check.ID )
			.then( function( res ) {
				done();
			} );
	} );

	describe( 'when listing checks', function() {
		it( 'should list the created check', function( done ) {
			api.agent.checks.list()
				.then( function( checks ) {
					checks.should.eql( expected );
					done();
				} );
		} );
	} );

	describe( 'when warning a check', function() {
		it( 'should mark the check as warning', function( done ) {
			api.agent.checks.warn( check.ID, 'uh oh' )
				.then( function() {
					return api.agent.checks.list();
				} )
				.then( function( list ) {
					var myCheck = list[ check.ID ];
					myCheck.Status.should.equal( 'warning' );
					myCheck.Output.should.equal( 'uh oh' );
					done();
				} );

		} );
	} );

	describe( 'when passing a check', function() {
		it( 'should mark the check as passing', function( done ) {
			api.agent.checks.pass( check.ID )
				.then( function() {
					return api.agent.checks.list();
				} )
				.then( function( list ) {
					list[ check.ID ].Status.should.equal( 'passing' );
					done();
				} );

		} );
	} );

	describe( 'when failing a check', function() {
		it( 'should mark the check as failing', function( done ) {
			api.agent.checks.fail( check.ID )
				.then( function() {
					return api.agent.checks.list();
				} )
				.then( function( list ) {
					list[ check.ID ].Status.should.equal( 'critical' );
					done();
				} );
		} );
	} );



} );

describe( 'when listing members', function() {
	var members;
	before( function( done ) {
		api.agent.listMembers()
			.then( function( res ) {
				members = res;
				done();
			} )
	} );

	it( 'should list the agent members', function() {
		var names = _.pluck( members, 'Name' );
		names.should.containEql( 'consul-agent1.leankit.com' );
		names.should.containEql( 'consul-server1.leankit.com' );
	} );
} );