var _ = require( 'lodash' );
var http = require( './http.js' );

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

function getNode( dc, base, name, wait ) {
	var query = {
			dc: dc,
			wait: wait
		},
		url = http.join( base, 'node/', name );
	return http.blockingGet( url, query, 'nodes', name )
		.then( function( doc ) {
			return doc;
		} );
}

function getService( dc, base, name, tag, wait ) {
	var query = {
			dc: dc,
			wait: wait,
			tag: tag
		},
		url = http.join( base, 'service/', name );
	return http.blockingGet( url, query, 'services', name )
		.then( function( doc ) {
			return _.map( doc, normalizeService );
		} );
}

function listDatacenters( catalog ) {
	return catalog.datacenters().then( normalizeResult );
}

function listNodes( dc, base, wait ) {
	var query = {
			dc: dc,
			wait: wait
		},
		url = http.join( base, 'nodes/' );
	return blockingGet( url, query, 'nodeList' );
}

function listServices( dc, base, wait ) {
	var query = {
			dc: dc,
			wait: wait
		},
		url = http.join( base, 'services/' );
	return http.blockingGet( url, query, 'serviceList' );
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
		getNode: getNode.bind( undefined, dc, base ),
		getService: getService.bind( undefined, dc, base ),
		listDatacenters: listDatacenters.bind( undefined, base ),
		listNodes: listNodes.bind( undefined, base ),
		listServices: listServices.bind( undefined, base ),
		registerCheck: registerNode.bind( undefined, dc, base ),
		registerNode: registerNode.bind( undefined, dc, base ),
		registerService: registerService.bind( undefined, dc, base )
	};
};