var gulp = require( 'gulp' ),
	mocha = require( 'gulp-mocha' ),
	process = require( 'processhost' )();

gulp.task( 'integration-test', function() {
	gulp.src( './spec/integration/*.spec.js' )
		.pipe( mocha( { reporter: 'spec' } ) )
		.on( 'error', function( err ) { console.log( err.message, err.stack ); } );
} );

gulp.task( 'watch', function() {
	gulp.watch( [ './src/**', './spec/**' ], [ 'integration-test' ] );
} );

gulp.task( 'integration', [ 'integration-test', 'watch' ], function() {

} );