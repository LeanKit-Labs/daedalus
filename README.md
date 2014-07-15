#node-consul
An opinionated approach to service control with consul. It uses an underlying state machine and event emitters so that you can control when your service is ready/available based on the availability of its dependencies in a consul DC.

If you want a 1-to-1 API lib, please see @silassewell's [consul lib](https://www.npmjs.org/package/consul).

## API

For starters
```javascript
var consul = require( 'consul' )( [dc] ); // dc defaults to 'dc1'
```

### Getting a Service Dependency

Fires when a service matching the name is registered anywhere in the catalog. Use this if you don't expect local service instances.
```javascript
consul.getAny( 'serviceName', function( serviceInfo ) {}, [ timeout ] );
```

Only fires if the desired service is registered with the local agent. Use this to prefer a local service if it becomes available without the timeout.
```javascript
consul.getLocal( 'serviceName', function( serviceInfo ) {}, [ timeout ] );
```

### Working With Service Configuration

```javascript
consul.getConfig( 'serviceName' );
```

```javascript
consul.setConfig( 'serviceName', { config } );
```

### Self-Registration

```javascript
consul.register( 'serviceName', port, [ tags ] );
```

### Registering Other Services

```javascript
consul.define( 'serviceName', port, [ tags ] );
```