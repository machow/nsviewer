gulp = require 'gulp'
sourcemaps = require 'gulp-sourcemaps'
coffee = require 'gulp-coffee'
concat = require 'gulp-concat'
sort = require 'gulp-sort'

gulp.task 'build', () ->
    gulp.src(['src/models.coffee', 'src/app.coffee', 'src/views.coffee'])
        .pipe(sort())
        .pipe(sourcemaps.init())
            .pipe(concat('viewer.coffee'))
            .pipe(coffee())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('lib'))
        .pipe(gulp.dest('example/js'))

