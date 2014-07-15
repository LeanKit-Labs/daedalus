var request = require( 'request' ),
	forever = require( 'request' ).forever(),
	when = require( 'when' ),
	_ = require( 'lodash' ),
	Monologue = require( 'monologue.js' )( _ );

module.exports = function( hostName, address, version, port ) {

	var Catalog = function() {
			this.port = port || 8500;
		this.version = version || 'v1';
		this.base = 'http://localhost:' + this.port + '/' + this.version + '/catalog/';
		this.services = {};
		this.ids = [];
		this.listIndex = 0;
		this.serviceIndex = {};
	};

	Catalog.prototype.deregister = function( name ) {
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

	Catalog.prototype.listServices = function( wait ) {
		var url = this.base + 'services';
		if( wait ) {
			url = url + '?wait=' + wait + '&index=' + this.listIndex;
		}
		return when.promise( function( resolve, reject, notify ) {
			forever.get( {
				url: url
			}, 
			function( err, resp ) {
				if( err ) {
					console.log( err );
					reject( err );
				} else {
					var json = JSON.parse( resp.body ),
						services = {};
					this.listIndex = resp.headers[ 'x-consul-index' ];
					if( _.keys( json ).length <= 1 ) {
						resolve( false );
					} else {
						console.log( json );

						_.each( _.omit( json, 'consul' ), function( tags, service ) {
							var name = service,
								tags = service.Tags,
								obj = { name: name, tags: tags };
							notify( 'catalog.service', obj );
						}.bind( this ) );
						resolve( true );
					}
				}
			}.bind( this ) );
		}.bind( this ) );
	};

	Catalog.prototype.lookupService = function( serviceName, wait ) {
		var url = this.base + 'service/' + serviceName;
		if( wait ) {
			url = url + '?wait=' + wait + '&index=' + ( this.serviceIndex[ serviceName ] || 0 );
		}
		return when.promise( function( resolve, reject, notify ) {
			forever.get( {
				url: url
			}, 
			function( err, resp ) {
				if( err ) {
					console.log( err );
					reject( err );
				} else {
					var json = JSON.parse( resp.body );
					this.serviceIndex[ serviceName ] = resp.headers[ 'x-consul-index' ];
					if( json.length == 0 ) {
						resolve( false );
					} else {
						_.each( json, function( service ) {
							var id = service.ServiceID,
								name = service.ServiceName,
								port = service.ServicePort,
								tags = service.ServiceTags,
								address = service.ServiceAddress,
								machine = id.split( '@' )[ 1 ],
								obj = { id: id, name: name, host: machine, address: address, port: port, tags: tags };
							notify( obj );
							if( this.services[ name ] ) {
								this.services[ name ].push( obj );
							} else {
								this.services[ name ] = [ obj ];
							}
						}.bind( this ) );
						resolve( true );
					}
				}
			}.bind( this ) );
		}.bind( this ) );
	};

	Catalog.prototype.register = function( name, port, tags ) {
		var url = this.base + 'register',
			body = {
				Node: hostName,
				Address: address,
				Service: {
					ID: name + '@' + hostName,
					Service: name,
					Tags: tags || [],
					Port: port
				}
			};
		return when.promise( function( resolve, reject ) {
			request.put( {
				url: url,
				body: JSON.stringify( body )
			}, 
			function( err, resp ) {
				if( err || resp.body != 'true\n' ) {
					reject( err || resp.body );
				} else {
					resolve();
				}
			} );
		} );
	};

	return Catalog;
};