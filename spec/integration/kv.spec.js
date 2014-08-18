var should = require( 'should' );
var path = require( 'path' ),
	_ = require( 'lodash' ),
	api = require( '../../src/consul.js' )( 'dc1' );

describe( 'when trying to get non-existent key', function() {
	var result;
	
	before( function( done ) {
		api.kv.get( 'beef-its-whats-for-dinner' )
			.then( function( value ) {
				result = value;
				done();
			} );
	} );

	it( 'should get nothing', function() {
		should( result ).not.exist; // jshint ignore:line
	} );
} );

describe( 'when putting a new value', function() {
	var error, result;

	before( function( done ) {
		api.kv.set( 'test-key-1', {
			a: 1,
			b: 'two',
			c: [ 3, 4, 5 ],
			d: { e: 6 }
		} )
		.then( function( resp ) {
			result = resp;
			done();
		} )
		.then( null, function( err ) {
			error = err;
			done();
		} );
	} );

	it( 'should set without error', function() {
		result.should.be.true; // jshint ignore:line
		should( error ).not.exist; // jshint ignore:line
	} );
} );

describe( 'when getting an existing value', function() {
	var expected = {
			a: 1,
			b: 'two',
			c: [ 3, 4, 5 ],
			d: { e: 6 }
		},
		result;

	before( function( done ) {
		api.kv.get( 'test-key-1' )
			.then( function( doc ) {
				result = doc;
				done();
			} );
	} );

	it( 'should have the correct metadata', function() {
		result._consul.should.have.keys( 'Key', 'ModifyIndex', 'CreateIndex', 'Flags' );
	} );

	it( 'should get the correct value', function() {
		_.omit( result, '_consul' ).should.eql( expected );
	} );
} );

describe( 'when using check and set without correct index', function() {
	var result;

	before( function( done ) {
		api.kv.cas( 'test-key-1', {
			a: 1,
			b: 'two',
			c: [ 3, 4, 5 ],
			d: { e: 6 }
		} )
		.then( function( resp ) {
			result = resp;
			done();
		} ); 
	} );

	it( 'should fail', function() {
		result.should.be.false; // jshint ignore:line
	} );
} );

describe( 'when using check and set with correct index', function() {
	var result;

	before( function( done ) {
		api.kv.get( 'test-key-1' )
			.then( function( doc ) {
				doc.a = 'test';
				api.kv.cas( 'test-key-1', doc )
					.then( function( resp ) {
						result = resp;
						done();
					} );
			} );
	} );

	it( 'should succeed', function() {
		result.should.be.true; // jshint ignore:line
	} );

	after( function( done ) {
		api.kv.del( 'test-key-1' )
			.then( function() {
				done();
			} );
	} );
} );