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
  session: {
    signed: false,
    token: ''
  },
  user1: {
    name: 'loading ...'
  }
};

const Actions = {
  Render: child => state => {
    state.child = child;
    return state;
  },
  ChildFoo: token => state => {
    state.session.token = token;
    return state;
  },
  SetUser1: user => state => {
    state.user1 = user;
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
  const user1HttpRequest$ = Rx.Observable.just({
    url: 'http://jsonplaceholder.typicode.com/users/1',
    method: 'GET',
    label: LABEL_REQUEST_USER_1
  });

  // merge all http requests in one stream
  const httpRequest$ = Rx.Observable.merge(
    user1HttpRequest$,
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
  const user1HttpResponse$ = actions.httpResponses$$
    .filter(res$ => res$.request.label === LABEL_REQUEST_USER_1)
    .mergeAll();

  const user1ReceivedAction$ = user1HttpResponse$
    .map(response => Actions.SetUser1(response.body));

  // current child
  const currentChild$ = actions.children$
    .map(child => child);

  // state value from current child
  const currentChildFooAction$ = currentChild$
    .flatMap(({value$}) => value$)
    .map(value => Actions.ChildFoo(value.email));

  // render current child
  const currentChildAction$ = currentChild$
    .map(child => Actions.Render(child));

  // merge all actions and prepare state
  const state$ = Rx.Observable
    .merge(
      user1ReceivedAction$,
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
      let {session: {token: tokenValue}} = state;
      let {user1: {name: nameValue}} = state;

      return div([
        h1(`From Child: Token is: ${tokenValue}`),
        h2(`App value: ${nameValue}`),
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
