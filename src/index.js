var api = require( './consul.js' )
var config;
var _ = require( 'lodash' );
var when = require( 'when' );
var whenKeys = require( 'when/keys' );

function initialize( name, fount, opts ) {
	fount = fount || require( 'fount' );
	config = require( 'configya' )( {
		CONSUL_DC: 'dc1',
		SERVICE_NAME: name
	} );
	var dcName = config.consul.datacenter,
		serviceName = config.service.name,
		dc = api( dcName ),
		configMap = {},
		configKeyMap = {},
		requiredKey = {},
		serviceMap = {},
		modules = {},
		lifeCycles = {};

	configMap[ serviceName ] = dc.getConfig( serviceName );

	_.each( opts, function( opt, dep ) {
		var conf = opt.config || opt.options,
			svc = opt.service,
			keys = [];
		lifeCycles[ dep ] = opt.lifecycle;
		if( svc ) {
			keys.push( 'service.' + dep );
			serviceMap[ dep ] = when.any( [ dc.getLocal( svc ), dc.getAny( svc ) ] );
		}
		if( conf ) {
			var key = [ serviceName, conf ].join( '-' );
			keys.push( 'config.' + dep );
			configKeyMap[ dep ] = key;
			configMap[ dep ] = dc.getConfig( key );
			if( opt.config ) {
				requiredKey[ dep ] = true;
			}
		}
		if( opt.module ) {
			modules[ dep ] = { dependencies: keys, module: opt.module };
		}
	} );

	var configPromises = whenKeys.all( configMap )
		.then( function( configuration ) {
			_.each( configuration, function( config, name ) {
				if( config !== undefined || !requiredKey[ name ] ) {
					fount( 'config' ).register( name, config ? config.value : undefined );
				} else if( requiredKey[ name ] ){
					throw new Error( 'config key "' + configKeyMap[ name ] + '" could not be found.' );
				}
			} );
		} )
		.then( null, function( err ) {
			var msg = ( err.toString().replace( 'Error:', '' ) );
			throw new Error( 'failed to retrieve configuration because' + msg );
		} );

	var servicePromises = whenKeys.all( serviceMap )
		.then( function( services ) {
			_.each( services, function( service, name ) {
				if( _.isEmpty( service[ 0 ] ) ) {
					throw new Error( 'service "' + name + '" could not be found.' );
				} else {
					fount( 'service' ).register( name, service[ 0 ] );
				}
			} );
		} )
		.then( null, function( err ) {
			var msg = ( err.toString().replace( 'Error:', '' ) );
			throw new Error ( 'failed to resolve dependencies because' + msg );
		} );

	return when.all( [
			configPromises,
			servicePromises
		] )
	.then( function() {
		_.each( modules, function( opts, name ) {
			var userModule = fount.inject( opts.dependencies, require( opts.module ) );
			fount.register( name, userModule, lifeCycles[ name ] || 'static' );
		} );
		return fount;
	} );
}

module.exports = function( name, fount ) {
	return initialize.bind( undefined, name, fount );
};