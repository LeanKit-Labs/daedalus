require( 'should' );
var path = require( 'path' ),
	_ = require( 'lodash' ),
	api = require( '../src/api.js' );

describe( 'when trying to get non-existent key', function() {

	it( 'should get nothing', function( done ) {
		api.kv.get( 'beef-its-whats-for-dinner' )
			.then( function( value ) {
				( value == undefined ).should.be.true;
				done();
			} )
			.then( null, function( err ) {
				console.log( err );
				done();
			} );
	} );

} );

describe( 'when putting a new value', function() {

	it( 'should put without error', function( done ) {
		api.kv.put( 'test-key-1', {
			a: 1,
			b: 'two',
			c: [ 3, 4, 5 ],
			d: { e: 6 }
		} )
		.then( function() {
			done();
		} )
		.then( null, function( err ) {
			console.log( err );
			done();
		} );
	} );

} );

describe( 'when getting an existing value', function() {
	var expected = {
			a: 1,
			b: 'two',
			c: [ 3, 4, 5 ],
			d: { e: 6 }
		};

	it( 'should get the correct value', function( done ) {
		api.kv.get( 'test-key-1' )
			.then( function( doc ) {
				doc._key.should.be.ok;
				doc._modifyIndex.should.be.ok;
				doc._createIndex.should.be.ok;

				_.omit( doc, '_key', '_flags', '_createIndex', '_modifyIndex' ).should.eql( expected );
				done();
			} )
			.then( null, function( err ) {
				console.log( err );
				done();
			} );
	} );

} );

describe( 'when using check and set without correct index', function() {

	it( 'should fail', function( done ) {
		api.kv.cas( 'test-key-1', {
			a: 1,
			b: 'two',
			c: [ 3, 4, 5 ],
			d: { e: 6 }
		} )
		.then( function( result ) {
			result.should.be.false;
			done();
		} )
		.then( null, function( err ) {
			console.log( err );
			done();
		} );
	} );

} );

describe( 'when using check and set with correct index', function() {
	var doc;

	before( function( done ) {
		api.kv.get( 'test-key-1' )
			.then( function( d ) {
				doc = d;
				done();
			} )
			.then( null, function( err ) {
				console.log( err );
				done();
			} );
	} );

	it( 'should succeed', function( done ) {
		console.log( doc );
		api.kv.cas( 'test-key-1', doc )
		.then( function( result ) {
			result.should.be.true;
			done();
		} )
		.then( null, function( err ) {
			console.log( err );
			done();
		} );
	} );

	after( function( done ) {

		done();
	} );
} );