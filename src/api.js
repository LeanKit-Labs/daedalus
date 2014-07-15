var request = require( 'request' ),
	os = require( 'os' ),
	when = require( 'when' ),
	_ = require( 'lodash' ),
	hostName = os.hostname(),
	Monologue = require( 'monologue.js' )( _ ),
	interfaces = os.networkInterfaces(),
	addresses = _.find( interfaces, function( interface, id ) { return /^e(n|th)[0-9]$/.test( id ); } );
	address = _.where( addresses, { family: 'IPv4' } )[ 0 ].address;

var Api = function() {
	var KV = require( './kv.js' )( hostName ),
		Agent = require( './agent.js' )( hostName ),
		Catalog = require( './catalog.js' )( hostName, address );

	this.agent = new Agent( hostName );
	this.catalog = new Catalog( hostName, address );
	this.kv = new KV( hostName );
	this.servicePolls = {};
	this.services = {};
};

Api.prototype.define = function( serviceName, port, tags ) {
	return this.catalog.register( serviceName, port, tags );
};

Api.prototype.getAny = function( serviceName, handle ) {
	this.on( serviceName + '.#', handle );
	this.pollFor( serviceName );
};

Api.prototype.getConfig = function( serviceName ) {
	return this.kv.get( serviceName );
};

Api.prototype.getLocal = function( serviceName, handle, timeout ) {
	this.on( serviceName + '.' + hostName, handle );
	this.pollFor( serviceName );
	setTimeout( function() {
		var matches = this.services[ serviceName ];
		if( matches && matches.length > 0 ) {
			handle( matches[ 0 ] );
		} 
	}.bind( this ), timeout );
};

Api.prototype.pollFor = function( serviceName ) {
	if( this.servicePolls[ serviceName ] ) {
		return;
	}
	this.servicePolls[ serviceName ] = true;
	this.catalog.lookupService( serviceName, '10m' )
		.progress( function( service ) {
			if( this.services[ serviceName ] ) {
				this.services[ serviceName ].push( service );
			} else {
				this.services[ serviceName ] = [ service ];
			}
			this.emit( service.name + '.' + service.host, service );
		}.bind( this ) )
		.done( function() {
			this.servicePolls[ serviceName ] = false;
			this.pollFor( serviceName );
		}.bind( this ) );
};

Api.prototype.register = function( serviceName, port, tags ) {
	return this.api.register( serviceName, port, tags );
};

Api.prototype.setConfig = function( serviceName, config ) {
	return this.kv.put( serviceName, config );
};

Monologue.mixin( Api );
module.exports = new Api();