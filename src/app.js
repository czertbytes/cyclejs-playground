import Rx from 'rx';
import {h, div, h1, ul, li } from 'cycle-snabbdom';

import Home from './components/home';
import Page1 from './components/page1';
import Signin from './components/signin';

const ROUTES = {
  '/': Home,
  '/page1': Page1
};

function intent(sources) {
  const {router} = sources;
  const match$ = router.define(ROUTES);

  const children$ = match$.map(
    ({path, value}) => value( {
      router: router.path(path),
      ...sources
    })
  );

  const actions = {
    children$
  }

  return actions;
}

function model(actions) {
  const child$ = actions.children$.map(child => child);
  const foo$ = Rx.Observable.just('foo');

  const state$ = Rx.Observable.combineLatest(
    child$,
    foo$,
    (child, foo) => ({child, foo})
  );

  return state$;
}

function view(state$) {
  return state$.map(({child}) =>
    div([
      renderHeader(child.router),
      renderSignin(),
      renderPage(child)
    ])
  );
}

function renderHeader(router) {
  const createHref = router.createHref;

  return div([
    ul([
      li([
        h('a', {props: {href: createHref('/') }}, 'Home')
      ]),
      li([
        h('a', {props: {href: createHref('/page1') }}, 'Page1')
      ])
    ])
  ])
}

function renderPage(child) {
  return child.DOM;
}

function renderSignin() {
  return h1('signin');
}

function App(sources) {
  const actions = intent(sources);
  const state$ = model(actions);
  const vtree$ = view(state$);

  const sink$ = {
    DOM: vtree$,
  };

  return sink$;
}

export default App;
