var _ = require( 'lodash' ),
	http = require( './http.js' );

function cas( dc, base, key, value ) {
	var doc = strip( value ),
		opts = {
			dc: dc,
			cas: value._consul ? value._consul.ModifyIndex : 0
		},
		query = http.buildQuery( opts ),
		url = http.join( base, key, query );
	return http
		.put( url, doc )
		.then( function( resp ) {
			return resp.body == 'true\n';
		} );
}

function del( dc, base, key, recurse ) {
	var query = http.buildQuery( {
			dc: dc,
			recurse: recurse
		} ),
		url = http.join( base, key, query );
	return http.del( url );
}

function get( dc, base, key ) {
	var query = http.buildQuery( { dc: dc } ),
		url = http.join( base, key, query );
	return http
		.get( url ) 
		.then( function( list ) {
			var items = _.map( list, function( item ) {
				var json = new Buffer( item.Value, 'base64' ).toString( 'ascii' ),
					parsed = JSON.parse( json );
				parsed._consul = {
					CreateIndex: item.CreateIndex,
					ModifyIndex: item.ModifyIndex,
					Flags: item.Flags,
					Key: item.Key
				};
				return parsed;
			} );
			return items.length === 0 ? undefined : 
				( items.length > 1 ) ? items : items[ 0 ];
		} );
}

function put( dc, base, key, value ) {
	var doc = strip( value ),
		opts = { dc: dc },
		query = http.buildQuery( opts ),
		url = http.join( base, key, query );
	return http
		.put( url, doc )
		.then( function( resp ) {
			return resp.body == 'true\n';
		} );
}

function strip( doc ) {
	return _.omit( doc, '_consul' );
}

module.exports = function( dc, hostName, version, port ) {
	port = port || 8500;
	version = version || 'v1';
	hostName = hostName || 'localhost';
	var base = http.join( 'http://', hostName, ':', port, '/', version, '/kv/' );
	
	return {
		cas: cas.bind( undefined, dc, base ),
		del: del.bind( undefined, dc, base ),
		get: get.bind( undefined, dc, base ),
		set: put.bind( undefined, dc, base )
	};
};