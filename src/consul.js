var consulFactory = require( 'consul' );
var os = require( 'os' );
var when = require( 'when' );
var lift = require( 'when/node' ).lift;
var _ = require( 'lodash' );
var machina = require( 'machina' );
var hostName = os.hostname();
var interfaces = os.networkInterfaces();
var debug = require( 'debug' )( 'daedalus:consul' );
var addresses = _.find( interfaces, function( interface, id ) {
	return /^[eE]([nN]|[tT][hH])[0-9]$/.test( id );
} );
var address = _.where( addresses, { family: 'IPv4' } )[ 0 ].address;

function waitForService( catalog, serviceName, tag, wait ) {
	return function() {
		debug( 'Wating for service %s in catalog', serviceName );
		return catalog.getService( serviceName, tag, wait || '10ms' );
	};
}

function iterativeWait( iterate, predicate, limit ) {
	var iterations = 0,
		resolved = false;
	limit = limit || 10;
	return when.iterate( iterate, function( resp ) {
		iterations++;
		return predicate( resp ) || iterations > limit;
	}, function( resp ) {
			if ( predicate( resp ) ) {
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
				if ( list.length === 0 ) {
					iterativeWait( iterate, function( x ) {
						return x && x.length;
					}, limit )
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
				if ( !list[ serviceName ] ) {
					debug( 'No service %s in agent list (get local)', serviceName );
					iterativeWait( iterate, function( x ) {
						return x && x.length;
					}, limit )
						.then( function( matches ) {
							resolve( _.where( matches, { 'Node': node } ) );
						} );
				} else {
					debug( 'Found service %s locally in agent list', serviceName );
					resolve( list[ serviceName ] );
				}
			} )
			.then( null, function( err ) {
				debug( 'Error trying to find %s locally: %s', serviceName, err.stack );
			} );
	} );
}

function register( agent, serviceName, port, tags, check ) {
	return agent.register( serviceName, port, tags, check );
}

function setConfig( kv, serviceName, config ) {
	return kv.set( serviceName, config );
}

var toLift = [
	'kv.get', 'kv.keys', 'kv.set', 'kv.del',
	'agent.check.list', 'agent.check.register', 'agent.check.deregister',
	'agent.check.pass', 'agent.check.warn', 'agent.check.fail',
	'agent.service.list', 'agent.service.register', 'agent.service.deregister', 'agent.service.maintenance',
	'agent.members', 'agent.self', 'agent.maintenance', 'agent.join', 'agent.forceLeave',
	'catalog.datacenters', 'catalog.node.list', 'catalog.node.services',
	'catalog.service.list', 'catalog.service.nodes'
];

function _set( obj, k, v ) {
	return _resolve( obj, k, v );
}

function _get( obj, k ) {
	return _resolve( obj, k );
}

function _resolveRecursive( obj, keys, v ) {
	var key = keys.shift();

	if ( key in obj ) {
		if ( keys.length ) {
			return _resolveRecursive( obj[ key ], keys, v );
		} else {
			if ( !_.isUndefined( v ) ) {
				obj[ key ] = v;
			}
			return obj[ key ];
		}
	} else {
		return false;
	}
}

function _resolve( obj, k, v ) {
	var keys = k.split( '.' );
	return _resolveRecursive( obj, keys, v );
}

function getConsulClient( options ) {
	var client = consulFactory( options );
	var lifted;
	_.each( toLift, function( path ) {
		lifted = lift( _get( client, path ) );
		_set( client, path, lifted );
	} );

	return client;
}

module.exports = function( dc, consulCfg ) {

	var agentClient = getConsulClient( consulCfg );

	var node = { name: hostName, address: address };
	var kv = require( './kv.js' )( dc, agentClient );
	var agent = require( './agent.js' )( dc, agentClient );
	var catalog = require( './catalog.js' )( dc, agentClient );
	var services = {};
	var servicePolls = {};

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
		register: register.bind( undefined, agent ),
		setConfig: setConfig.bind( undefined, kv ),
		setKey: kv.set
	};

	var Machine = machina.Fsm.extend( {
		_acquire: function() {
			agent.getInfo()
				.then( function( info ) {
					this.node = node.name = info.Config.NodeName;
					this.address = node.address = info.Config.AdvertiseAddr;
					this.transition( 'ready' );
				}.bind( this ) )
				.then( null, function( err ) {
					this.handle( 'connection.failed', err );
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
					this._wait = when.defer();
					this.wait = this._wait.promise;
					this._acquire();
				},
				operate: function( call ) {
					this.deferUntilTransition( 'ready' );
				},
				'connection.failed': function( err ) {
					debug( 'Cannot connect to local agent %s:%d. Error: %s', consulCfg.host, consulCfg.port, err.stack );
					this.unavailable = true;
					setTimeout( function() {
						this._acquire();
					}.bind( this ), 5000 );
				}
			},
			ready: {
				_onEnter: function() {
					this._wait.resolve();
				},
				operate: function( call ) {
					try {
						var result = call.operation.apply( undefined, call.argList );
						if ( result && result.then ) {
							result
								.then( call.resolve )
								.then( null, call.reject );
						} else {
							call.resolve( result );
						}
					} catch ( err ) {
						call.reject( err );
					}
				}
			}
		}
	} );

	var machine = new Machine();

	function map( source, target ) {
		_.each( source, function( prop, name ) {
			if ( _.isFunction( prop ) ) {
				target[ name ] = function() {
					var list = Array.prototype.slice.call( arguments, 0 );
					return machine.operate( prop, list );
				}.bind( machine );
			} else if ( _.isObject( prop ) ) {
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
