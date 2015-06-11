var api = require( './consul.js' );
var path = require( 'path' );
var debug = require( 'debug' )( 'daedalus:main' );
var _ = require( 'lodash' );
var when = require( 'when' );
var whenKeys = require( 'when/keys' );
var config, dc, dcName, serviceName;

function initialize( name, fount, opts ) {
	fount = fount || require( 'fount' );
	var configMap = {};
	var configKeyMap = {};
	var requiredKey = {};
	var serviceMap = {};
	var modules = {};
	var lifeCycles = {};

	configMap[ serviceName ] = dc.getConfig( serviceName );

	_.each( opts, function( opt, dep ) {
		var conf = opt.config || opt.options;
		var svc = opt.service;
		var keys = [];
		lifeCycles[ dep ] = opt.lifecycle;
		if ( svc ) {
			keys.push( 'service.' + dep );
			serviceMap[ dep ] = when.join( dc.getLocal( svc ), dc.getAny( svc ) )
				.then( function( list ) {
					var nodes = _.uniq( _.flatten( list ), function( x ) {
						return x.ID;
					} );
					debug( 'Nodes found for %s: %s', dep, JSON.stringify( nodes ) );
					return opt.all ? nodes : nodes[ 0 ];
				} )
				.then( null, function( err ) {
					debug( 'Failed to locate service %s', svc );
				} );
		}
		if ( conf ) {
			var key = [ serviceName, conf ].join( '-' );
			keys.push( 'config.' + dep );
			configKeyMap[ dep ] = key;
			configMap[ dep ] = dc.getConfig( key );
			if ( opt.config ) {
				requiredKey[ dep ] = true;
			}
		}
		if ( opt.module ) {
			modules[ dep ] = { dependencies: keys, module: opt.module };
		}
	} );

	var configPromises = whenKeys.all( configMap )
		.then( function( configuration ) {
			_.each( configuration, function( config, name ) {
				if ( config !== undefined || !requiredKey[ name ] ) {
					var val = config ? config.value : undefined;
					debug( 'Registering %s for %s', JSON.stringify( val ), name );
					fount( 'config' ).register( name, val );
				} else if ( requiredKey[ name ] ) {
					throw new Error( 'config key "' + configKeyMap[ name ] + '" could not be found.' );
				}
			} );
		} )
		.then( null, function( err ) {
			var msg = ( err.toString().replace( 'Error:', '' ));
			throw new Error( 'failed to retrieve configuration because' + msg );
		} );

	var servicePromises = whenKeys.all( serviceMap )
		.then( function( services ) {
			_.each( services, function( service, name ) {
				if ( _.isEmpty( service ) ) {
					throw new Error( 'service "' + name + '" could not be found.' );
				} else {
					debug( 'Registering %s for %s', JSON.stringify( service ), name );
					fount( 'service' ).register( name, service );
				}
			} );
		} )
		.then( null, function( err ) {
			var msg = ( err.toString().replace( 'Error:', '' ));
			throw new Error( 'failed to resolve dependencies because' + msg );
		} );

	return when.all( [
		configPromises,
		servicePromises
	] )
		.then( function() {
			_.each( modules, function( opts, name ) {
				var userModule = fount.inject( opts.dependencies, require( path.join( process.cwd(), opts.module ) ) );
				fount.register( name, userModule, lifeCycles[ name ] || 'static' );
			} );
			return fount;
		} );
}

module.exports = function( name, cfg, fount ) {
	cfg = cfg || {};

	config = require( 'configya' )( {
		SERVICE_NAME: name,
		CONSUL_DC: cfg.dc || 'dc1',
		CONSUL_HOST: cfg.host || 'localhost',
		CONSUL_PORT: cfg.port || 8500,
		CONSUL_CA: cfg.ca || null,
		CONSUL_CERT: cfg.cert || null,
		CONSUL_KEY: cfg.key || null,
		CONSUL_SECURE: cfg.secure || false,
		CONSUL_TOKEN: cfg.token || null
	} );

	serviceName = config.service.name;

	dc = api( config.consul );

	return {
		initialize: initialize.bind( undefined, serviceName, fount ),
		register: dc.register.bind( undefined, serviceName )
	};
};
