var request = require( 'request' ),
	when = require( 'when' ),
	_ = require( 'lodash' );

module.exports = function( hostName, version, port ) {
	
	var Agent = function() {
		this.port = port || 8500;
		this.version = version || 'v1';
		this.base = 'http://localhost:' + this.port + '/' + this.version + '/agent/';
		this.services = {};
		this.ids = [];
	};

	Agent.prototype.deregister = function( name ) {
		var match = function( serviceId ) {
				return serviceId == name;
			},
			id;
		if( _.some( this.ids, match ) ) {
			id = name;
		} else {
			id = name + '@' + hostName;
		}
		var url = this.base + 'service/deregister/' + id;
		return when.promise( function( resolve, reject ) {
			request.put( { url: url }, function( err ) {
				if( err ) {
					reject( err );
				} else {
					resolve();
				}
			} );
		} );
	};

	Agent.prototype.listServices = function() {
		var url = this.base + 'services';
		return when.promise( function( resolve, reject, notify ) {
			request.get( {
				url: url
			}, 
			function( err, resp ) {
				if( err ) {
					reject( err );
				} else {
					var json = JSON.parse( resp.body ),
						services = {};
					_.each( json, function( service, id ) {
						var name = service.Service,
							port = service.Port,
							tags = service.Tags,
							machine = id.split( '@' )[ 1 ],
							obj = { id: id, name: name, host: machine, port: port, tags: tags };
						notify( name + '.' + machine, obj );
						if( services[ name ] ) {
							services[ name ].push( obj );
						} else {
							services[ name ] = [ obj ];
						}
					}.bind( this ) );
					this.services = services;
					resolve( services );
				}
			}.bind( this ) );
		}.bind( this ) );
	};

	Agent.prototype.register = function( name, port, tags ) {
		var url = this.base + 'service/register',
			body = {
				ID: name + '@' + hostName,
				Name: name,
				Tags: tags || [],
				Port: port
			};
		return when.promise( function( resolve, reject ) {
			request.put( {
				url: url,
				body: JSON.stringify( body )
			}, 
			function( err ) {
				if( err ) {
					reject( err );
				} else {
					resolve();
				}
			} );
		} );
	};

	return Agent;
};