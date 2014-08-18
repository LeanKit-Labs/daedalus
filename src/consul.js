var request = require( 'request' ),
	os = require( 'os' ),
	when = require( 'when' ),
	_ = require( 'lodash' ),
	machina = require( 'machina' )( _ ),
	hostName = os.hostname(),
	interfaces = os.networkInterfaces(),
	debug = require( 'debug' )( 'daedalus:consul' ),
	addresses = _.find( interfaces, function( interface, id ) { return /^[eE]([nN]|[tT][hH])[0-9]$/.test( id ); } );
	address = _.where( addresses, { family: 'IPv4' } )[ 0 ].address;

function waitForService( catalog, serviceName, tag, wait ) {
	return function() { 
		return catalog.getService( serviceName, tag, wait || '10ms' ); 
	};
}

function iterativeWait( iterate, predicate, limit ) {
	var iterations = 0,
		resolved = false;
	limit = limit || 10;
	return when.iterate( iterate, 
		function( resp ) {
			iterations++;
			return predicate( resp ) || iterations > limit;
		},
		function( resp ) {
			if( predicate( resp ) ){
				resolved = true;
			}
		}, 0 )
		.then( function( thing ) {
			return thing;
		} );
}

function getAny( catalog, serviceName, tag, wait, limit ) {
	var iterate = waitForService( catalog, serviceName, tag, wait );
	return when.promise( function( resolve, reject ) {
		catalog.getService( serviceName, tag )
			.then( function( list ) {
				if( list.length === 0 ) {
					iterativeWait( iterate, function( x ) { return x && x.length; } ,limit )
						.then( resolve );
				} else {
					resolve( list );
				}
			} )
			.then( null, reject );
	} );
}

function getConfig( kv, serviceName ) {
	return kv.get( serviceName );
}

function getInfo( agent ) {
	return agent.getInfo();
}

function getLocal( catalog, agent, node, serviceName, tag, wait, limit ) {
	var iterate = waitForService( catalog, serviceName, tag, wait );
	return when.promise( function( resolve, reject ) {
		agent.listServices()
			.then( function( list ) {
				if( !list[ serviceName ] ) {
					iterativeWait( iterate, function( x ) { return x && x.length; } ,limit )
						.then( function( matches ) {
							resolve( _.where( matches, { 'Node': node } ) );
						} );
				} else {
					resolve( list[ serviceName ] );
				}
			} )
			.then( null, reject );
	} ); 
}

function register( agent, serviceName, port, tags, check ) {
	return agent.register( serviceName, port, tags, check );
}

function setConfig( kv, serviceName, config ) {
	return kv.set( serviceName, config );
}

module.exports = function( dc, agentHost, catalogHost ) {
	var node = { name: hostName, address: address },
		kv = require( './kv.js' )( dc, agentHost ),
		agent = require( './agent.js' )( dc, agentHost ),
		catalog = require( './catalog.js' )( dc, catalogHost, node.name, address ),
		services = {},
		servicePolls = {};

	var proxy = {
		agent: agent,
		catalog: catalog,
		kv: kv,
		hostName: hostName,
		address: node.address,
		node: node.name,

		checkAndSet: kv.cas,
		deleteKey: kv.del,
		getAny: getAny.bind( undefined, catalog ),
		getKey: kv.get,
		getConfig: getConfig.bind( undefined, kv ),
		getInfo: getInfo.bind( undefined, agent ),
		getLocal: function( serviceName, tag ) {
			return getLocal( catalog, agent, node.name || hostName, serviceName, tag );
		},
		register: register.bind( undefined, agent, node.name || hostName, address ),
		setConfig: setConfig.bind( undefined, kv ),
		setKey: kv.set
	};

	var Machine = machina.Fsm.extend( {
		_acquire: function() {
			agent.getInfo()
				.then( function( info ) {
					node.name = info.Config.NodeName;
					node.address = info.Config.AdvertiseAddr;
					this.transition( 'ready' );
				}.bind( this ) );
		},
		operate: function( call, args ) {
			var op = { operation: call, argList: args, index: this.index },
				promise = when.promise( function( resolve, reject ) {
					op.resolve = resolve;
					op.reject = reject;
				} );
			this.handle( 'operate', op );
			return promise;
		},
		initialState: 'waiting',
		states: {
			waiting: {
				_onEnter: function() {
					this._acquire();
				},
				operate: function( call ) {
					this.deferUntilTransition( 'ready' );
				}
			},
			ready: {
				operate: function( call ) {
					try {
						var result = call.operation.apply( undefined, call.argList );
						if( result && result.then ) {
							result
								.then( call.resolve )
								.then( null, call.reject );
						} else {
							call.resolve( result );
						}
					} catch( err ) {
						call.reject( err );
					}
				}
			}
		}
	} );

	var machine = new Machine();

	function map( source, target ) {
		_.each( source, function( prop, name ) {
			if( _.isFunction( prop ) ) {
				target[ name ] = function() { 
					var list = Array.prototype.slice.call( arguments, 0 );
					return machine.operate( prop, list );
				}.bind( machine );
			} else if( _.isObject( prop ) ) {
				target[ name ] = {};
				map( prop, target[ name ] );
			} else {
				target[ name ] = prop;
			}
		} );
	}

	map( proxy, machine );
	return machine;
};