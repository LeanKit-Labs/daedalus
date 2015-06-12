var _ = require( 'lodash' );
var debug = require( 'debug' )( 'daedalus:agent' );

var tokenizeFn = function( client, options ) {
	if ( client.ACL_TOKEN ) {
		options = _.merge( { token: client.ACL_TOKEN }, options );
	}
	return options;
};

var tokenize;

function normalizeResult( result ) {
	return result[ 0 ];
}

function deregisterCheck( agent, checkId ) {
	return agent.check.deregister( tokenize( {
		id: checkId
	} ) ).then( normalizeResult );
}

function failCheck( agent, checkId, note ) {
	return agent.check.fail( tokenize( {
		id: checkId,
		note: note
	} ) ).then( normalizeResult );
}

function listChecks( agent ) {
	return agent.check.list( tokenize( {} ) )
		.then( normalizeResult );
}

function passCheck( agent, checkId, note ) {
	return agent.check.pass( tokenize( {
		id: checkId,
		note: note
	} ) ).then( normalizeResult );
}

function registerCheck( agent, check ) {
	return agent.check.register( tokenize( check ) )
		.then( normalizeResult );
}

function warnCheck( agent, checkId, note ) {
	return agent.check.warn( tokenize( {
		id: checkId,
		note: note
	} ) ).then( normalizeResult );
}

function deregister( agent, hostName, serviceId ) {
	var id = [ serviceId, hostName ].join( '@' );
	return agent.service.deregister( tokenize( {
		id: id
	} ) );
}

function getInfo( agent ) {
	return agent.self( tokenize( {} ) )
		.then( normalizeResult );
}

function listMembers( agent ) {
	return agent.members( tokenize( {} ) )
		.then( normalizeResult );
}

function listServices( agent, address ) {
	return agent.service.list( tokenize( {} ) )
		.then( function( result ) {
			var list = result[ 0 ];

			_.each( list, function( service ) {
				service.Address = address;
			} );

			return list;
		} );
}

function joinNode( agent, nodeUrl, wan ) {
	return agent.join( tokenize( {
		address: nodeUrl,
		wan: wan
	} ) ).then( normalizeResult );
}

function leaveNode( agent, nodeUrl ) {
	return agent.forceLeave( tokenize( {
		node: nodeUrl
	} ) ).then( normalizeResult );
}

function register( agent, hostName, name, port, tags, check ) {
	var props = tokenize( {
		id: [ name, hostName ].join( '@' ),
		name: name,
		tags: tags,
		port: port,
		check: check
	} );

	return agent.service.register( props );
}

module.exports = function( dc, client, hostName ) {

	tokenize = tokenizeFn.bind( undefined, client );

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
