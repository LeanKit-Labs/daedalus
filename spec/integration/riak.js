var riak = require( 'riaktive' );
var _ = require( 'lodash' );

module.exports = function( service, config ) {
	var connection = { riak: {
		server: service.Address,
		pbc: service.Port }
	};
	config = config || connection;
	config = _.merge( config, connection );
	return riak( config );
};