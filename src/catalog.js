var _ = require( 'lodash' );
var http = require( './http.js' );
var DEFAULT_TIMEOUT = 60000;

var indexCache = {
	serviceList: 0,
	services: {},
	nodeList: 0,
	nodes: {}
};

function storeIndex( response, type, id ) {
	var index = response.headers[ 'x-consul-index' ];
	if ( index ) {
		if ( id ) {
			indexCache[ type ][ id ] = index;
		} else {
			indexCache[ type ] = index;
		}
	}
}

function normalizeResult( result ) {
	return result[ 0 ];
}

function deregister( dc, base, type, node, id ) {
	var url = http.join( base, 'deregister' );
	var doc = {
		'Datacenter': dc,
		'Node': node
	};
	if ( type !== 'Node' ) {
		doc[ type + 'ID' ] = [ id, node ].join( '@' );
	}
	return http.put( url, doc );
}

function getNode( dc, catalog, name, wait ) {
	var query = {
		node: name,
		dc: dc,
		wait: wait,
		timeout: DEFAULT_TIMEOUT
	};

	if ( wait && indexCache.nodes[ name ] ) {
		query.index = indexCache.nodes[ name ];
	}

	return catalog.node.services( query )
		.then( function( result ) {
			var doc = result[ 0 ];
			var response = result[ 1 ];
			storeIndex( response, 'nodes', name );
			return doc;
		} );
}

function getService( dc, catalog, name, tag, wait ) {

	var query = {
		service: name,
		dc: dc,
		wait: wait,
		tag: tag,
		timeout: DEFAULT_TIMEOUT
	};

	if ( wait && indexCache.services[ name ] ) {
		query.index = indexCache.services[ name ];
	}

	return catalog.service.nodes( query )
		.then( function( result ) {
			var doc = result[ 0 ];
			var response = result[ 1 ];
			storeIndex( response, 'services', name );
			return _.map( doc, normalizeService );
		} );
}

function listDatacenters( catalog ) {
	return catalog.datacenters().then( normalizeResult );
}

function listNodes( dc, catalog, wait ) {
	var query = {
		dc: dc,
		wait: wait,
		timeout: DEFAULT_TIMEOUT
	};

	if ( wait && indexCache.nodeList ) {
		query.index = indexCache.nodeList;
	}

	return catalog.node.list( query )
		.then( function( result ) {
			var list = result[ 0 ];
			var response = result[ 1 ];
			storeIndex( response, 'nodeList' );
			return list;
		} );
}

function listServices( dc, catalog, wait ) {
	var query = {
		dc: dc,
		wait: wait,
		timeout: DEFAULT_TIMEOUT
	};

	if ( wait && indexCache.serviceList ) {
		query.index = indexCache.serviceList;
	}

	return catalog.service.list( query )
		.then( function( result ) {
			var list = result[ 0 ];
			var response = result[ 1 ];
			storeIndex( response, 'serviceList' );
			return list;
		} );
}

function registerCheck( dc, base, node, id, title, notes, service ) {
	var url = http.join( base, 'register' );
	return http.put( url, {
		'Datacenter': dc,
		'Check': {
			'Node': node,
			'CheckID': id,
			'Name': title,
			'Notes': notes,
			'ServiceID': service
		}
	} );
}

function registerNode( dc, base, host, node ) {
	var url = http.join( base, 'register' );
	return http.put( url, {
		'Datacenter': dc,
		'Address': host,
		'Node': node
	} );
}

function registerService( dc, base, node, address, service, port, tags ) {
	var url = http.join( base, 'register' );
	return http.put( url, {
		Datacenter: dc,
		Node: node,
		Address: address,
		Service: {
			ID: [ service, node ].join( '@' ),
			Service: service,
			Tags: tags || [],
			Port: port
		}
	} );
}

function normalizeService( doc ) {
	return {
		Node: doc.Node,
		Address: doc.Address,
		Service: doc.ServiceName,
		ID: doc.ServiceID,
		Port: doc.ServicePort,
		Tags: doc.ServiceTags,
	};
}

module.exports = function( dc, client, hostName, port, version ) {
	var catalog = client.catalog;

	version = version || 'v1';
	hostName = hostName || 'localhost';
	var base = http.join( 'http://', hostName, ':', port, '/', version, '/catalog/' );

	return {
		deregisterCheck: deregister.bind( undefined, dc, base, 'Check' ),
		deregisterNode: deregister.bind( undefined, dc, base, 'Node' ),
		deregisterService: deregister.bind( undefined, dc, base, 'Service' ),
		getNode: getNode.bind( undefined, dc, catalog ),
		getService: getService.bind( undefined, dc, catalog ),
		listDatacenters: listDatacenters.bind( undefined, catalog ),
		listNodes: listNodes.bind( undefined, dc, catalog ),
		listServices: listServices.bind( undefined, dc, catalog ),
		registerCheck: registerNode.bind( undefined, dc, base ),
		registerNode: registerNode.bind( undefined, dc, base ),
		registerService: registerService.bind( undefined, dc, base )
	};
};