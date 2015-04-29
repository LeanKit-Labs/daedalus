var gulp = require( 'gulp' ),
	bg = require( 'biggulp' )( gulp );

gulp.task( 'default', [ 'continuous-test', 'watch' ] );

gulp.task( 'test', function() {
	return bg.testOnce();
} );

gulp.task( 'coverage', bg.showCoverage() );

gulp.task( 'continuous-test', bg.withCoverage() );

gulp.task( 'watch', function() {
	return bg.watch( [ 'continuous-test' ] );
} );