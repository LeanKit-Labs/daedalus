# daedalus
An opinionated approach to service automation via [Consul](https://github.com/hashicorp/consul) and [fount](https://github.com/leankit-labs/fount).

If you're looking for a 1-to-1 Consul API lib, please see @silassewell's [Consul lib](https://www.npmjs.org/package/consul).

	Note: if you are not familiar with Consul and how it works, this will all sound like hot non-sense.

## Concepts
`daedalus` exists to simplify deployment and environment automation by eliminating the need for managing environment variables and configuration files (mostly).

### Intended use
`daedalus` should work in any environment but uses some conventions designed to support use in larger scale container deployments using [docker](https://github.com/docker/docker) and [docksul](https://github.com/progrium/docksul) (automated container registration with Consul).

### How
`daedalus` takes a dependency definition that specifies services and configuration that you depend on. Once necessary information is retrieved from consul, `daedalus` uses it to wire modules you provide into `fount` for use in your service.

**Daedalus as the entry-point (recommended)
```javascript
var daedalus = require( 'daedalus' )( 'myService', [config] );
daedalus.initialize( ... ) // depdency definition goes here
	.then( function( fount ) {
		// now you can pass fount off to your service's entry point
		// or call fount.inject to inject dependencies directly
	} )
	.then( null, function( errorMessage ) {
		// daedalus will reject the promise with a message
		// explaining which dependency it couldn't resolve
	} );
```

The optional config hash allows you to provide custom values for the following properties:

```javascript
{
	dc: 'dc1', // Consul datacenter
	host: 'localhost', // Consul host
	port: 8500, // Consul port
	ca: null, // Consul certificate authority (if using HTTPS)
	cert: null, // Consul SSL certificate (if using HTTPS)
	key: null, // Consul SSL key (if using HTTPS)
	secure: false, // Use HTTPS
	token: null // Consul ACL Token
}
```
You can also control these values via the following environment variables:

 * CONSUL_DC
 * CONSUL_HOST
 * CONSUL_PORT
 * CONSUL_CA
 * CONSUL_CERT
 * CONSUL_KEY
 * CONSUL_SECURE
 * CONSUL_TOKEN

**Daedalus after-the-fact (use when you already have your own fount instance)
```javascript
var fount = require( 'fount' );
var daedalus = require( 'daedalus' )( 'myService', {}, fount ); // pass your fount instance at the end
daedalus.initialize( ... ) // depdency definition goes here
	.then( function( fount ) {
		// now you can pass fount off to your service's entry point
		// or call fount.inject to inject dependencies directly
	} )
	.then( null, function( errorMessage ) {
		// daedalus will reject the promise with a message
		// explaining which dependency it couldn't resolve
	} );
```

### Assumptions / Conventions
 1. Assumes correct setup and usage of Consul (including an agent per host machine)
 1. Defaults the consul to 'dc1'. Override with an ENV variable named 'CONSUL_DC'.
 1. Prefixes options and config keys with the service name when looking them up in Consul
 1. Configuration and service keys must be `-` delimited and never `.` delimited

As an example for the 3rd item:

 * Your service name is 'cache-service'
 * You've specified a config key in your dependency list named 'redis'
 * The key that will be searched for in Consul is not 'redis' but 'cache-service-redis'

## Registration
In many cases, you may want to have another mechanism providing registration of your service. If this is not the case, daedalus provides a register call that will register your service with the agent.

```javascript
// port, tags
daedalus.register( 81208, [ 'tag1', 'tag2' ] );
```

## Dependency Definitions
`daedalus` expects a dependency definition object to tell it how to configure custom modules using service information and required or optional configuration stored in Consul. Each dependency should provide a module that takes the retrieved information and returns a configured object, promise or function that gets wired into fount.

### Anatomy of a dependency definition entry
```javascript
dependencyAlias: { // the alias provides the dependency key in fount
	service: 'the service name in consul',
	config: 'provide a key for a required configuration value',
	options: 'provide a key for an optional configuration value',
	module: 'path to the module to wire in as the dependency',
	lifecycle: 'optional //"static" is default, "scoped" and "factory" are the other choices'
}
```
That's a pretty simple explanation, let's look at each property in a bit more depth.

### Services
A service is a dependency on a discoverable service in Consul. `daedalus` will attempt to retrieve this service by __name__ (vs id) and will always prefer a local service to a remote one. In the event a local service is not available, `daedalus` will attempt to find one in the catalog.

If no matching service can satisfy the dependency, `daedalus` will reject the promise with the following error:

 >Error: failed to resolve dependencies because service "{service name}" could not be found.

### Configuration
A config key tells `daedalus` to search Consul's KV store for configuration to be provided to your module. Using the config key indicates that this is required and, like a service, will throw an error if the configuration key is missing from Consul:

 >Error: failed to retrieve configuration because config key "{key prefix - key name}" could not be found.

### Options
An options key works the same as a config key except that no error will be thrown if the key is not found. It will simply pass undefined to the module in place of a configuration object.

### Module
The module is how you control what gets wired into fount. The module you provide should return a function with the signature `( fount, service, config)`. If you didn't specify a service or a config key for the module, undefined will be passed in their place.

```javascript
module.exports = function( fount, service, config ) {
	// must return a value, function or a promise to fount
	// an instance of the DI container is available in the event you
	// need access to previously registered dependencies
};
```

### Lifecycle
The lifecycle property allows you to control how `fount` will resolve this module. See [fount's README](https://github.com/LeanKit-Labs/fount/blob/master/README.md) for more detail on how this works.

## Definition Examples
As you will see in the example, the intended use of `daedalus` is a single call that takes your dependency definition object and returns a promise.

	Note: by default, daedalus will only pass you the first service matching the name provided. To get all service instances, add the option 'all: true' to the service. (see how Riak is defined in the complete example)

### Service only
```javascript
daedalus.initialize( {
	myService: {
		service: 'serviceName',
		module: './yourModule.js'
	}
} );
```

### Config only
```javascript
daedalus.initialize( {
	myService: {
		config: 'configKey',
		module: './yourModule.js'
	}
} );
```

### Service with config
```javascript
daedalus.initialize( {
	myService: {
		service: 'serviceName',
		config: 'configKey',
		module: './yourModule.js'
	}
} );
```

### Service with optional config
```javascript
daedalus.initialize( {
	myService: {
		service: 'serviceName',
		options: 'configKey',
		module: './yourModule.js'
	}
} );
```

## Complete Example
This is an example showing an empty main app that takes dependencies on 3 different services: rabbit, redis and riak.
The modules for each are returning promises or objects as `fount` will accept either of those. For some libraries, you may actually wish to return a function that is evaluated for every call. In that case, you'll need to set the definition to specify a 'factory' lifecycle.

### main.js
```javascript
// functions to setup your service once dependencies are available


// this is your service's entry point
module.exports = function( rabbit, redis, riak ) {

};
```

### index.js
```javascript
// main is a function with the signature function( rabbit, redis riak )
var main = require( './main.js' );
var daedalus = require( 'daedalus' )( 'myGreatService' ); // your service/app name is required'
daedalus.initialize( {
	riak: {
		service: 'riak',
		config: 'riak',
		module: './riak.js',
		all: true
	},
	rabbit: {
		service: 'rabbitmq',
		config: 'rabbitmq',
		module: './rabbit.js'
	},
	redis: {
		service: 'redis',
		options: 'redis',
		module: './redis.js'
	},
	seriate: {
		service: 'mssql',
		config: 'mssql',
		module: './mssql',
		lifecycle: 'factory'
	}
} )
.then( function( fount ) {
	// calls main with configured modules
	fount.inject( [ 'rabbit', 'redis', 'riak' ], main );
	done();
} )
.then( null, function( error ) {
	console.error( 'Daedalus failed with', error );
} );
```
### rabbit.js
```javascript
var rabbit = require( 'wascally' );
var _ = require( 'lodash' );

module.exports = function( service, config ) {
	// service is the information obtained from Consul: address and port
	// config is the value (if any) obtained by the config|options key
	var connection = {
		connection: {
			server: service.Address,
			port: service.Port
		}
	};
	config = _.merge( config, connection );
	return rabbit.configure( config ).then( function( r ) {
		return rabbit;
	} );
};
```

### redis.js
```javascript
var redis = require( 'redis' );

module.exports = function( service, config ) {
	// service is the information obtained from Consul: address and port
	// config is the value (if any) obtained by the config|options key
	return redis.createClient( service.Port, service.Address, config );
};
```

### riak.js
```javascript
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
```

### seriate.js
This example was included to show how daedalus might work with different use cases. Seriate requires connection information per command so the object returned from this module uses partial application to hide this from the consumer.

In this case, configya is being used to read the password for the sql user from the environment. It could just as easily read it from a file at a secured location. Choose whichever option makes the most sense.

```javascript
var seriate = require( 'seriate' );
var auth = require( 'configya' )();

module.exports = function( service, config ) {
	// service is the information obtained from Consul: address and port
	// config is the value (if any) obtained by the config|options key
	var connection = {
		user: config.user,
		password: auth.password,
		server: service.Address,
		database: config.database
		domain: config.domain
	};

	return {
		getPlainContext: seriate.getPlainContext.bind( seriate, connection ),
		getTransactionContext: seriate.getTransactionContext.bind( seriate, connection ),
	};
};
```

## Contributing
If you see an area for improvement or want to add a feature, this section is for you.

### Git Clone & NPM Install
Once you've cloned from your fork, you should be able to run `npm install` and get all dependencies. This library uses gulp, gulp mocha, should, redis, riaktive and wascally.

### Vagrant

Daedalus now provides a sample `Vagrantfile` that will set up a virtual machine that runs both a Consul server node and a Consul agent node. It will forward Consul's default ports to `localhost`.

**First, you will need to copy the sample file to a usable file:**

```bash
$ cp Vagrantfile.sample Vagrantfile
```

Adjust any necessary settings. Then, from the root of the project, run:

```bash
$ vagrant up
```

This will create your box. Right now, it only supports the `vmware_fusion` plugin. To access the box, run:

```bash
$ vagrant ssh
```

Once inside, you can view the Consul agent logs by executing:

```bash
$ docker logs -f consul-agent1
```
---

**Important:**

Daedalus' tests currently run with security enabled. Vagrant will set up the Consul cluster securely using both [gossip encryption and TLS](https://consul.io/docs/agent/encryption.html). The necessary certificates are located in `/.consul`. All this is handled automatically for you, but the one caveat is that you will need to add an entry to your `hosts` file in order for the certificates to work correctly. In your `hosts` file add:

```
127.0.0.1	consul-agent1.leankit.com
```

This will map the domain to your local machine so that the tests can run correctly.

---

Click here for more information on [Vagrant](http://vagrantup.com), [Docker](http://docker.com), and [the Consul Docker image](https://github.com/progrium/docker-consul).

*To run tests using Vagrant:*

Execute from the **host machine:**

```bash
$ vagrant up
$ gulp
```

### Tests
Right now I only have integration tests. You can run these with `gulp integration`. Eventually I hope to provide some unit test coverage to specific modules so that over time it's easier to work on w/o having to have the specific Consul setup.

Even with unit tests, PRs that fail the integration tests will not be merged.

### Other servers
You don't actually have to have riak, rabbit or redis running locally for the tests to pass. This is partly due to how the libraries I've written operate and that I'm silently handling redis connection failures.

