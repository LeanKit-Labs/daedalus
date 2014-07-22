var redis = require( 'redis' );

module.exports = function( service, config ) {
	var client = redis.createClient( service.Port, service.Address, config );
	client.on( 'error', function( err ) {
		// if you have no local redis server, this will print a LOT of errors
		//console.log( 'Could not establish a connection to redis with', err.stack );	
	} );
};