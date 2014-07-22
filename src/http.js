var _ = require( 'lodash' ),
	req = require( 'request' ),
	when = require( 'when' ),
	whenNode = require( 'when/node'),
	request = whenNode.liftAll( req );
request.raw = req;

var indexCache = {
	serviceList: 0,
	services: {},
	nodeList: 0,
	nodes: {}
};

function blockingGet( url, query, type, id ) {
	if( query.wait ) {
		var indexType = indexCache[ type ];
		query.index = id ? indexType[ id ] : indexType;
	}
	url = join( url, buildQuery( query ) );
	return request.get( { url: url, timeout: 60000 } )
		.then( function( resp ) {
			storeIndex( resp, type, id );
			return JSON.parse( resp[ 1 ] );
		} );
}

function buildQuery( opts ) {
	var args = [];
	if( opts.dc ) {
		args.push( 'dc=' + opts.dc );
	}
	if( opts.tag !== undefined ) {
		args.push( 'tag=' + opts.tag );
	}
	if( opts.cas !== undefined ) {
		args.push( 'cas=' + opts.cas );
	}
	if( opts.note ) {
		args.push( 'note=' + opts.note );
	}
	if( opts.wait ) {
		args.push( 'wait=' + opts.wait );
		args.push( 'index=' + ( opts.index || 0 ) );
	}
	if( opts.recurse ) {
		args.push( 'recurse' );
	}
	if( opts.wan ) {
		args.push( 'wan=1' );
	}
	return ( '?' + args.join( '&' ) );
}

function del( url ) {
	return request
		.del( { url: url } )
		.then( function( resp ) {
			storeIndex( resp );
			return resp[ 0 ].statusCode == 200;
		} );
}

function filter( x ) { return x !== undefined; }

function get( url ) {
	return request
		.get( { url: url } ) 
		.then( function( resp ) {
			storeIndex( resp );
			if( resp[ 0 ].statusCode !== 200 ) {
				return undefined;
			} else {
				if( resp[ 1 ] ) {
					return JSON.parse( resp[ 1 ] );
				} else {
					return true;
				}
			}
		} );
}

function join() {
	return _.filter( Array.prototype.slice.call( arguments ), filter ).join( '' );
}

function put( url, body ) {
	var json = JSON.stringify( body );
	return request
		.put( { url: url, body: json } )
		.then( function( resp ) {
			storeIndex( resp );
			return { 
				succeeded: resp[ 0 ].statusCode === 200,
				body: resp[ 1 ]
			};
		} );
}

function storeIndex( result, type, id ) {
	var index = result[ 0 ].headers[ 'x-consul-index' ];
	if( index ) {
		if( id ) {
			indexCache[ type ][ id ] = index;
		} else {
			indexCache[ type ] = index;
		}
	}
}

module.exports = {
	blockingGet: blockingGet,
	buildQuery: buildQuery,
	del: del,
	get: get,
	join: join,
	put: put
}

