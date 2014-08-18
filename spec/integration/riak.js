var riak = require( 'riaktive' );
var _ = require( 'lodash' );

module.exports = function( services, config ) {
	var connection = _.map( services, function( service ) {
		return {
			host: service.Address,
			port: service.Port
		};
	} );
	return riak.connect( connection );
};