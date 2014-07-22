var rabbit = require( 'wascally' );
var _ = require( 'lodash' );

module.exports = function( service, config ) {
	var connection = { connection: {
		server: service.Address,
		port: service.Port
	} };
	config = config || connection;
	config = _.merge( config, connection );
	return rabbit.configure( config ).then( function( r ) {
		return rabbit;
	} );
};