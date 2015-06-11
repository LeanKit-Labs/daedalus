var _ = require( 'lodash' );
var debug = require( 'debug' )( 'daedalus:kv' );

var tokenizeFn = function( client, options ) {
	if ( client.ACL_TOKEN ) {
		options = _.merge( { token: client.ACL_TOKEN }, options );
	}
	return options;
};

var tokenize;

function cas( dc, kv, key, value ) {
	var options = tokenize( {
		key: key,
		value: prepare( value ),
		dc: dc,
		cas: value._consul ? value._consul.ModifyIndex : 0
	} );

	debug( 'Check and set key %s as %s', key, JSON.stringify( options.value ) );

	return kv.set( options ).then( function( result ) {
		return result[ 0 ];
	} );
}

function del( dc, kv, key, recurse ) {
	debug( 'Deleting key %s', key );
	return kv.del( tokenize( {
		key: key,
		dc: dc,
		recurse: recurse
	} ) ).then( function( result ) {
		return result[ 0 ];
	} );
}

function get( dc, kv, key ) {
	var options = tokenize( {
		dc: dc,
		key: key
	} );

	debug( 'Getting key %s', key );

	return kv.get( options )
		.then( function( list ) {
			var result = list[ 0 ];

			if ( !result ) {
				return result;
			}

			if ( !_.isArray( result ) ) {
				result = [ result ];
			}

			var items = _.map( result, function( item ) {
				var parsed = item && item.Value ? JSON.parse( item.Value ) : {};
				parsed._consul = {
					CreateIndex: item.CreateIndex,
					ModifyIndex: item.ModifyIndex,
					Flags: item.Flags,
					Key: item.Key
				};
				return parsed;
			} );

			var returnVal = items.length === 0 ? undefined :
				( items.length > 1 ) ? items : items[ 0 ];

			debug( 'Result for %s is %s', key, JSON.stringify( returnVal ) );
			return returnVal;
		} );
}

function put( dc, kv, key, value ) {
	var options = tokenize( {
		key: key,
		value: prepare( value ),
		dc: dc
	} );

	debug( 'Setting key %s to %s', key, JSON.stringify( options.value ) );

	return kv.set( options )
		.then( function( result ) {
			return result[ 0 ];
		} );
}

function prepare( doc ) {
	return JSON.stringify( _.omit( doc, '_consul' ) );
}

module.exports = function( dc, client ) {

	tokenize = tokenizeFn.bind( undefined, client );

	var kv = client.kv;
	return {
		cas: cas.bind( undefined, dc, kv ),
		del: del.bind( undefined, dc, kv ),
		get: get.bind( undefined, dc, kv ),
		set: put.bind( undefined, dc, kv )
	};
};
