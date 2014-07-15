var request = require( 'request' ),
	when = require( 'when' ),
	_ = require( 'lodash' ),
	Monologue = require( 'monologue.js' )( _ );

module.exports = function( hostName, version, port ) {

	var KV = function() {
		this.port = port || 8500;
		this.version = version || 'v1';
		this.base = 'http://localhost:' + this.port + '/' + this.version + '/kv/';
	};

	KV.prototype.cas = function( key, value ) {
		var index = value._modifyIndex || 0,
			url = this.base + key + '?cas=' + index,
			doc = JSON.stringify( _.omit( value, '_key', '_flags', '_createIndex', '_modifyIndex' ) );
		console.log( index, doc, url );
		return when.promise( function( resolve, reject ) {
			request.put( {
				url: url,
				body: doc
			}, 
			function( err, resp ) {
				if( err ) {
					reject( err );
				} else {
					var success = resp == 'true';
					resolve( success );
				}
			} );
		} );
	};

	KV.prototype.del = function( key, recurse ) {
		var url = this.base + key;
		if( recurse ) {
			url + '?recurse';
		}
		return when.promise( function( resolve, reject ) {
			request.get( {
				url: url
			}, 
			function( err, json ) {
				if( err ) {
					reject( err );
				} else {
					var services = JSON.parse( json );
					this.services = services;
					resolve( services );
				}
			}.bind( this ) );
		}.bind( this ) );
	};

	KV.prototype.get = function( key, recurse ) {
		var url = this.base + key;
		if( recurse ) {
			url + '?recurse';
		}
		return when.promise( function( resolve, reject, notify ) {
			request.get( {
				url: url
			}, 
			function( err, resp ) {
				if( err ) {
					reject( err );
				} else {
					if( resp.statusCode != 200 ) {
						resolve( undefined );
					} else {
						var list = JSON.parse( resp.body );
						var items = _.map( list, function( item ) {
							var val = JSON.parse( new Buffer( item.Value, 'base64' ).toString( 'ascii' ) );
							console.log( item );
							val._createIndex = item.CreateIndex;
							val._modifyIndex = item.ModifyIndex;
							val._flags = item.Flags;
							val._key = item.Key;
							notify( val );
							return val;
						} );
						if( items.length == 0 ) {
							resolve( undefined );
						} else if( items.length > 1 ) {
							resolve( items );
						} else {
							resolve( items[ 0 ] );
						}
					}
				}
			}.bind( this ) );
		}.bind( this ) );
	};

	KV.prototype.put = function( key, value ) {
		var url = this.base + key;
		return when.promise( function( resolve, reject ) {
			request.put( {
				url: url,
				body: JSON.stringify( value )
			}, 
			function( err ) {
				if( err ) {
					reject( err );
				} else {
					resolve();
				}
			} );
		} );
	};

	return KV;
};