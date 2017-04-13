// Copyright (c) 2015-present, salesforce.com, inc. All rights reserved
// Licensed under BSD 3-Clause - see LICENSE.txt or git.io/sfdc-license

const path = require('path');
const gulp = require('gulp');
const createPreviewer = require('@salesforce-ux/design-system-previewer');

const { getComments, getMarkup } = require('./markup-style');
const { watchPaths, removeFromCache } = require('./watch');

require('./gulp/styles');

const getComments_ = done =>
  getComments().fork(done, x => done(null, x));

const getMarkup_ = (component, variant, done) =>
  getMarkup(component, variant).fold(done, markup => done(null, markup));

const previewer = createPreviewer({
  // where are your static assets
  publicPath: {
    '/': [
      path.resolve(__dirname, '../.www')
    ],
    '/assets': [
      path.resolve(__dirname, '../assets')
    ]
  },
  // where is your css?
  cssUrl: '/assets/styles/index.css',
  // get me some comments as a string
  getComments: getComments_,
  // get me some markup for a component/variant
  getMarkup: getMarkup_
});

previewer.listen(3003, ({ server, emit }) => {
  // Sass
  const sassWatcher = gulp.watch(
    watchPaths.sass.concat(watchPaths.tokens),
    ['styles:framework'] // This will trigger watchPaths.css
  );
  sassWatcher.on('change', () => {
    emit('comments');
  });
  // JS
  gulp.watch(watchPaths.js, event => {
    removeFromCache(require.resolve(event.path));
    emit('markup');
  });
  // CSS
  gulp.watch(watchPaths.css, event => {
    emit('styles');
  });

  console.log(`Previewer available at: http://localhost:${server.address().port}/preview`);
});
