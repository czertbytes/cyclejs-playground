import Rx from 'rx';
import {h, div, h1, h2, ul, li } from 'cycle-snabbdom';

import Home from './components/home';
import Page1 from './components/page1';

const ROUTES = {
  '/': Home,
  '/page1': Page1
};

const LABEL_REQUEST_USER_1 = 'users_1';

var initialState = {
  child: Home,
  app: {
    foo: 'loading ...'
  },
  home: {
    foo: 'loading ...'
  },
  page1: {
    foo: 'loading ...'
  }
};

const Actions = {
  Render: child => state => {
    state.child = child;
    return state;
  },
  SetAppState: app => state => {
    state.app.foo = app.email;
    return state;
  },
  SetHomeState: home => state => {
    state.home.foo = home.email;
    return state;
  },
  SetPage1State: page1 => state => {
    state.page1.foo = page1.email;
    return state;
  }
};

function intent(sources) {
  const {router} = sources;
  const match$ = router.define(ROUTES);

  // match the url and create child
  const children$ = match$
    .map(({path, value}) => value({
        ...sources,
        router: router.path(path)
      }));

  // make call to that url
  const userHttpRequest$ = Rx.Observable.just({
    url: 'http://jsonplaceholder.typicode.com/users/1',
    method: 'GET',
    label: LABEL_REQUEST_USER_1
  });

  // merge all http requests in one stream
  const httpRequest$ = Rx.Observable.merge(
    userHttpRequest$,
    children$.flatMapLatest(child => child.HTTP || Rx.Observable.empty())
  );

  const actions = {
    httpRequest$,
    httpResponses$$: sources.HTTP,
    children$
  }

  return actions;
}

function model(actions) {
  // filter our httpResponse
  const userHttpResponse$ = actions.httpResponses$$
    .filter(res$ => res$.request.label === LABEL_REQUEST_USER_1)
    .mergeAll();

  const userReceivedAction$ = userHttpResponse$
    .map(response => Actions.SetAppState(response.body));

  // current child
  const currentChild$ = actions.children$
    .map(child => child);

  // state value from current child
  const currentChildFooAction$ = currentChild$
    .flatMap(({state$}) => state$)
    .map(state => {
      switch (state.origin) {
        case 'home':
          return Actions.SetHomeState(state.foo);
        case 'page1':
          return Actions.SetPage1State(state.foo);
        default:
          console.log(`Unknown child state origin ${state.origin}`);
      }
    });

  // render current child
  const currentChildAction$ = currentChild$
    .map(child => Actions.Render(child));

  // merge all actions and prepare state
  const state$ = Rx.Observable
    .merge(
      userReceivedAction$,
      currentChildFooAction$,
      currentChildAction$)
    .scan((state, operation) => operation(state), initialState);

  return state$;
}

function view(state$) {
  const vtree$ = state$
    .startWith(initialState)
    .map(state => {
      let {child} = state;
      let {app: {foo: appFooValue}} = state;
      let {home: {foo: homeFooValue}} = state;
      let {page1: {foo: page1FooValue}} = state;

      return div([
        h1(`App value: ${appFooValue}`),
        h2(`Value from Home: ${homeFooValue}`),
        h2(`Value from Page1: ${page1FooValue}`),
        child.DOM
      ]);
    });

  return vtree$;
}

function App(sources) {
  const actions = intent(sources);
  const state$ = model(actions);
  const vtree$ = view(state$);

  const sink$ = {
    DOM: vtree$,
    HTTP: actions.httpRequest$
  };

  return sink$;
}

export default App;
