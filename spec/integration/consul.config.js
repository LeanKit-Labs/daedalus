var _ = require( 'lodash' ),
	fs = require( 'fs' ),
	rootCert = fs.readFileSync( __dirname + '/../../.consul/root.cer' ),
	cert = fs.readFileSync( __dirname + '/../../.consul/consul-agent1.leankit.com/consul-agent1.leankit.com.cer' ),
	key = fs.readFileSync( __dirname + '/../../.consul/consul-agent1.leankit.com/consul-agent1.leankit.com.key' ),
	nodeName = 'consul-agent1.leankit.com',
	consulCfg = {
		host: nodeName,
		port: 8500,
		secure: true,
		dc: 'daedalus-spec',
		token: 'DAEDALUS_TOKEN'
	};

module.exports = function() {
	var cfg = _.cloneDeep( consulCfg );

	_.extend( cfg, {
		ca: rootCert,
		cert: cert,
		key: key
	} );

	return cfg;
};
