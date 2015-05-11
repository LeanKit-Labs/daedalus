var _ = require( 'lodash' );
var debug = require( 'debug' )( 'daedalus:agent' );

function normalizeResult( result ) {
	return result[ 0 ];
}

function deregisterCheck( agent, checkId ) {
	return agent.check.deregister( checkId )
		.then( normalizeResult );
}

function failCheck( agent, checkId, note ) {
	return agent.check.fail( {
		id: checkId,
		note: note
	} ).then( normalizeResult );
}

function listChecks( agent ) {
	return agent.check.list()
		.then( normalizeResult );
}

function passCheck( agent, checkId, note ) {
	return agent.check.pass( {
		id: checkId,
		note: note
	} ).then( normalizeResult );
}

function registerCheck( agent, check ) {
	return agent.check.register( check )
		.then( normalizeResult );
}

function warnCheck( agent, checkId, note ) {
	return agent.check.warn( {
		id: checkId,
		note: note
	} ).then( normalizeResult );
}

function deregister( agent, hostName, serviceId ) {
	var id = [ serviceId, hostName ].join( '@' );
	return agent.service.deregister( {
		id: id
	} );
}

function getInfo( agent ) {
	return agent.self()
		.then( normalizeResult );
}

function listMembers( agent ) {
	return agent.members()
		.then( normalizeResult );
}

function listServices( agent, address ) {
	return agent.service.list()
		.then( function( result ) {
			var list = result[ 0 ];

			_.each( list, function( service ) {
				service.Address = address;
			} );

			return list;
		} );
}

function joinNode( agent, nodeUrl, wan ) {
	return agent.join( {
		address: nodeUrl,
		wan: wan
	} ).then( normalizeResult );
}

function leaveNode( agent, nodeUrl ) {
	return agent.forceLeave( {
		node: nodeUrl
	} ).then( normalizeResult );
}

function register( agent, hostName, name, port, tags, check ) {
	var props = {
		id: [ name, hostName ].join( '@' ),
		name: name,
		tags: tags,
		port: port,
		check: check
	};

	return agent.service.register( props );
}

module.exports = function( dc, client, hostName ) {

	var agent = client.agent;

	hostName = hostName || 'localhost';
	var self = { address: undefined, name: undefined };
	return {
		address: self.address,
		checks: {
			deregister: deregisterCheck.bind( undefined, agent ),
			fail: failCheck.bind( undefined, agent ),
			list: listChecks.bind( undefined, agent ),
			pass: passCheck.bind( undefined, agent ),
			register: registerCheck.bind( undefined, agent ),
			warn: warnCheck.bind( undefined, agent )
		},
		deregister: function( serviceId ) {
			return deregister( agent, self.name, serviceId );
		},
		getInfo: function() {
			return getInfo( agent )
				.then( function( info ) {
					self.address = info.Config.AdvertiseAddr;
					self.name = info.Config.NodeName;
					return info;
				} );
		},
		join: joinNode.bind( undefined, agent ),
		leave: leaveNode.bind( undefined, agent ),
		listMembers: listMembers.bind( undefined, agent ),
		listServices: function() {
			return listServices( agent, self.address );
		},
		register: function( serviceName, port, tags, check ) {
			return register( agent, self.name, serviceName, port, tags, check );
		}
	};
};