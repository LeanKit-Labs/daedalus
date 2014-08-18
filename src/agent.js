var _ = require( 'lodash' ),
	http = require( './http.js' ),
	debug = require( 'debug' )( 'daedalus:agent' );

function deregisterCheck( base, checkId ) {
	var url = http.join( base, 'check/deregister/', checkId );
	return http.get( url );
}

function failCheck( base, checkId, note ) {
	var query = http.buildQuery( { note: note } ),
		url = http.join( base, 'check/fail/', checkId, query );
	return http.get( url );
}

function listChecks( base ) {
	return http.get( http.join( base, 'checks' ) );
}

function passCheck( base, checkId, note ) {
	var query = http.buildQuery( { note: note } ),
		url = http.join( base, 'check/pass/', checkId, query );
	return http.get( url );
}

function registerCheck( base, check ) {
	var url = http.join( base, 'check/register' );
	return http.put( url, check )
		.then( function( resp ) {
			return resp.succeeded;
		} );
}

function warnCheck( base, checkId ) {
	var query = http.buildQuery( { note: note } ),
		url = http.join( base, 'check/warn/', checkId, query );
	return http.get( url );
}

function deregister( base, hostName, serviceId ) {
	var url = http.join( base, 'service/deregister/', [ serviceId, hostName ].join( '@' ) );
	return http.get( url );
}

function getInfo( base ) {
	return http.get( http.join( base, 'self' ) );
}

function listMembers( base ) {
	return http.get( http.join( base, 'members' ) );
}

function listServices( base, address ) {
	var url = http.join( base, 'services' );
	return http.get( url )
		.then( function( list ) {
			_.each( list, function( service ) {
				service.Address = address;
			} );
			return list;
		} );
}

function joinNode( base, nodeUrl, wan ) {
	var query = http.buildQuery( { wan: wan } ),
		url = http.join( base, 'agent/join/', nodeUrl, query );
	return http.get( url );
}

function leaveNode( base, nodeUrl ) {
	var url = http.join( base, 'agent/force-leave/', nodeUrl );
	return http.get( url );
}

function register( base, hostName, name, port, tags, check ) {
	var url = http.join( base, 'service/register' );
	return http.put( url, {
		ID: [ name, hostName ].join( '@' ),
		Name: name,
		Tags: tags || [],
		Port: port,
		Check: check
	} ).then( function( resp ) {
		return resp.succeeded;
	} );
}

module.exports = function( dc, hostName, version, port ) {
	port = port || 8500;
	version = version || 'v1';
	hostName = hostName || 'localhost';
	var self = { address: undefined, name: undefined };
	var base = http.join( 'http://', hostName, ':', port, '/', version, '/agent/' );
	debug( 'Local agent url set to %s', base );
	return {
		address: self.address,
		checks: {
			deregister: deregisterCheck.bind( undefined, base ),
			fail: 		failCheck.bind( undefined, base ),
			list: 		listChecks.bind( undefined, base ),
			pass: 		passCheck.bind( undefined, base ),
			register: 	registerCheck.bind( undefined, base ),
			warn: 		warnCheck.bind( undefined, base )
		},
		deregister: 	function( serviceId ) {
			return deregister( base, self.name, serviceId );
		},
		getInfo: 		function() {
			return getInfo( base )
				.then( function( info ) {
					self.address = info.Config.AdvertiseAddr;
					self.name = info.Config.NodeName;
					return info;
				} );
		},
		join: 			joinNode.bind( undefined, base ),
		leave: 			leaveNode.bind( undefined, base ),
		listMembers: 	listMembers.bind( undefined, base ),
		listServices: 	function() {
			return listServices( base, self.address );
		},
		register: 		function( serviceName, port, tags, check ) {
			return register( base, self.name, serviceName, port, tags, check );
		}
	};
};