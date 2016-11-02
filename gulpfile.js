var gulp = require('gulp')
, css = require('gulp-minify-css')
, rename = require('gulp-rename');

gulp.task('minifyCss', function(){
    gulp.src('./public/css/main.css')
    .pipe(css())
    .pipe(rename('./public/css/main.min.css'))
    .pipe(gulp.dest(''));
});

gulp.task('watch-css', function() {
   gulp.watch(['./public/css/main.css'], ['minifyCss']); 
});