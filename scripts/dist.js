// Copyright (c) 2015-present, salesforce.com, inc. All rights reserved
// Licensed under BSD 3-Clause - see LICENSE.txt or git.io/sfdc-license

const fs = require('fs');
const path = require('path');
const async = require('async');
const autoprefixer = require('autoprefixer');
const gulp = require('gulp');
const gulpfile = require('gulp-file');
const gulpinsert = require('gulp-insert');
const gulpzip = require('gulp-zip');
const gulprename = require('gulp-rename');
const minimist = require('minimist');
const postcss = require('gulp-postcss');
const rimraf = require('rimraf');
const sass = require('gulp-sass');
const minifycss = require('gulp-minify-css');
const Task = require('data.task');
const { ui } = require('./ui');

const packageJSON = require('../package.json');
const paths = require('./helpers/paths');

const SLDS_VERSION = packageJSON.version;
const DISPLAY_NAME = 'Lightning Design System';
const MODULE_NAME = 'salesforce-lightning-design-system';

const argv = minimist(process.argv.slice(2));
const isNpm = argv.npm === true;

const sanitizeVersion = version =>
  version.replace(/\s+|\(|\)/g, '_');

const zipName = (version) =>
  MODULE_NAME + '-' + sanitizeVersion(version) + '.zip';

// /////////////////////////////////////////////////////////////
// Helpers
// /////////////////////////////////////////////////////////////

const distPath = path.resolve.bind(path, isNpm ? paths.npm : paths.dist);

// /////////////////////////////////////////////////////////////
// Tasks
// /////////////////////////////////////////////////////////////

async.series([

  /**
   * Clean the dist folder
   */
  (done) => rimraf(distPath(), done),

  /**
   * Copy necessary root files to be included in the final module
   */
  (done) => {
    gulp.src([
      './package.json',
      './README-dist.md',
      './RELEASENOTES*'
    ], {
      base: paths.root
    })
    .pipe(gulp.dest(distPath()))
    .on('error', done)
    .on('finish', done);
  },

  /**
   * Cleanup the package.json
   */
  (done) => {
    let packageJSON = JSON.parse(fs.readFileSync(distPath('package.json')).toString());
    packageJSON.name = '@salesforce-ux/design-system';
    delete packageJSON.scripts;
    delete packageJSON.dependencies;
    delete packageJSON.devDependencies;
    delete packageJSON.optionalDependencies;
    delete packageJSON.engines;
    delete packageJSON.important;
    fs.writeFile(
      distPath('package.json'),
      JSON.stringify(packageJSON, null, 2),
      done
    );
  },

  // //////////////////////////////////
  // Sass
  // //////////////////////////////////

  /**
   * Move all the scss files to dist/scss
   */
  (done) => {
    gulp.src('**/*.scss', {
      base: paths.ui,
      cwd: paths.ui
    })
    .pipe(gulp.dest(distPath('scss')))
    .on('error', done)
    .on('finish', done);
  },

  /**
   * Copy the Sass license
   */
  (done) => {
    gulp.src('assets/licenses/License-for-Sass.txt', {
      cwd: paths.site
    })
    .pipe(gulp.dest(distPath('scss')))
    .on('error', done)
    .on('finish', done);
  },

  // //////////////////////////////////
  // Icons
  // //////////////////////////////////

  /**
   * Copy all the icons to assets/icons
   */
  (done) => {
    gulp.src('@salesforce-ux/icons/dist/salesforce-lightning-design-system-icons/**', {
      cwd: paths.node_modules
    })
    .pipe(gulp.dest(distPath('assets/icons')))
    .on('error', done)
    .on('finish', done);
  },

  // //////////////////////////////////
  // Fonts
  // //////////////////////////////////

  /**
   * Copy all the fonts to assets/fonts
   */
  (done) => {
    gulp.src('assets/fonts/**/*', {
      cwd: paths.site
    })
    .pipe(gulp.dest(distPath('assets/fonts')))
    .on('error', done)
    .on('finish', done);
  },

  /**
   * Copy font license
   */
  (done) => {
    gulp.src('assets/licenses/License-for-font.txt', {
      cwd: paths.site
    })
    .pipe(gulp.dest(distPath('assets/fonts')))
    .on('error', done)
    .on('finish', done);
  },

  // //////////////////////////////////
  // Images
  // //////////////////////////////////

  /**
   * Copy select images directories
   */
  (done) => {
    gulp.src([
      'assets/images/spinners/*',
      'assets/images/avatar*',
      // Used in the Global Header
      'assets/images/logo-noname.svg'
    ], {
      base: 'site/assets/images',
      cwd: paths.site
    })
    .pipe(gulp.dest(distPath('assets/images')))
    .on('error', done)
    .on('finish', done);
  },

  /**
   * Copy images license
   */
  (done) => {
    gulp.src('assets/licenses/License-for-images.txt', {
      cwd: paths.site
    })
    .pipe(gulp.dest(distPath('assets/images')))
    .on('error', done)
    .on('finish', done);
  },

  // //////////////////////////////////
  // Swatches
  // //////////////////////////////////

  /**
   * Copy the swatches
   */
  (done) => {
    gulp.src('assets/downloads/swatches/**', {
      cwd: paths.site
    })
    .pipe(gulp.dest(distPath('swatches')))
    .on('error', done)
    .on('finish', done);
  },

  // //////////////////////////////////
  // Design Tokens
  // //////////////////////////////////

  /**
   * Move design tokens
   */
  (done) => {
    // Bundle everything in the npm package
    // but only sources and Sass files in the zip
    // because it would make the zip too large to be imported
    // as a Static Resource in a Salesforce Org (limited to 5MB)
    const src = isNpm ? '**/*.*' : ['**/*.yml', '**/*.scss'];
    gulp.src(src, {
      base: `${paths.designTokens}`,
      cwd: `${paths.designTokens}`
    })
    .pipe(gulp.dest(distPath('design-tokens')))
    .on('error', done)
    .on('finish', done);
  },

  /**
   * Move component design tokens
   */
  (done) => {
    gulp.src('components/**/tokens/**/*.yml', {
      base: path.resolve(paths.ui),
      cwd: path.resolve(paths.ui)
    })
    .pipe(gulp.dest(distPath('ui')))
    .on('error', done)
    .on('finish', done);
  },

  /**
   * Build design system and vf css from the scss files. The big one!
   */
  (done) => {
    gulp.src(distPath('scss/index.scss'))
      .pipe(sass({
        precision: 10,
        includePaths: [
          paths.node_modules
        ]
      }))
      .pipe(sass().on('error', sass.logError))
      .pipe(postcss([ autoprefixer({ remove: false }) ]))
      .pipe(gulprename(function (path) {
        path.basename = MODULE_NAME + path.basename.substring('index'.length);
        path.extname = '.css';
        return path;
      }))
      .pipe(gulp.dest(distPath('assets/styles/')))
      .on('error', done)
      .on('finish', done);
  },
  /**
   * Minify CSS
   */
  (done) => {
    gulp.src(distPath('assets/styles/*.css'), { base: distPath() })
      .pipe(gulp.dest(distPath()))
      .on('error', done)
      .pipe(minifycss({
        advanced: false,
        roundingPrecision: '-1'
      }))
      .pipe(gulprename(function (path) {
        path.basename += '.min';
        return path;
      }))
      .on('error', done)
      .pipe(gulp.dest(distPath()))
      .on('error', done)
      .on('finish', done);
  },

  /**
   * Add version to relevant CSS and Sass files
   */
  (done) => {
    gulp.src([
      '**/*.css',
      'scss/index*'
    ], {
      base: distPath(),
      cwd: distPath()
    })
    .pipe(gulpinsert.prepend(`/*! ${DISPLAY_NAME} ${SLDS_VERSION} */\n`))
    .pipe(gulp.dest(distPath()))
    .on('error', done)
    .on('finish', done);
  },
  (done) => {
    gulp.src([
      'scss/**/*.scss',
      '!scss/index*.scss',
      '!scss/vendor/**/*.*'
    ], {
      base: distPath(),
      cwd: distPath()
    })
    .pipe(gulpinsert.prepend(`// ${DISPLAY_NAME} ${SLDS_VERSION}\n`))
    .pipe(gulp.dest(distPath()))
    .on('error', done)
    .on('finish', done);
  },

  /**
   * Add build date to README.txt
   */
  (done) => {
    gulp.src(distPath('README-dist.md'))
    .pipe(gulprename('README.md'))
    .on('error', done)
    .pipe(gulpinsert.prepend(`# ${DISPLAY_NAME} \n# Version: ${SLDS_VERSION} \n`))
    .on('error', done)
    .pipe(gulp.dest(distPath()))
    .on('error', done)
    .on('finish', done);
  },

  /**
   * Remove old README-dist
   */
  (done) => {
    rimraf(distPath('README-dist.md'), done);
  },

  /**
   * Add ui.json
   */
  (done) =>
    ui()
    .map(ui => JSON.stringify(ui, null, 2))
    .chain(json =>
      new Task((rej, res) =>
        gulpfile('ui.json', json, { src: true })
        .pipe(gulp.dest(distPath()))
        .on('finish', res)
        .on('error', rej)))
    .fork(done, () => done(null, null)),

  /**
   * Zip everything up
   */
  (done) => {
    gulp.src(distPath('**/*'))
    .pipe(gulpzip(zipName(SLDS_VERSION)))
    .on('error', done)
    .pipe(gulp.dest(distPath()))
    .on('error', done)
    .pipe(gulp.dest(path.resolve(paths.www, 'assets/downloads')))
    .on('error', done)
    .on('finish', done);
  }

], err => {
  if (err) throw err;
});
