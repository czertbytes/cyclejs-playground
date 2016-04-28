import Rx from 'rx';
import {div, h1, h2, button} from 'cycle-snabbdom';

const LABEL_REQUEST_USER_2 = 'users_2';

var initialState = {
  user: {
    email: 'loading ...'
  }
};

const Actions = {
  SetUser: user => state => {
    state.user = user;
    return state;
  }
}

function intent(sources) {
  // make call to that url
  const userHttpRequest$ = Rx.Observable.just({
    url: 'http://jsonplaceholder.typicode.com/users/2',
    method: 'GET',
    label: LABEL_REQUEST_USER_2
  });

  // merge all http requests in one stream
  const httpRequest$ = Rx.Observable.merge(
    userHttpRequest$
  );

  return {
    httpRequest$,
    httpResponses$$: sources.HTTP
  }
}

function model(actions) {
  // filter our httpResponse
  const userHttpResponse$ = actions.httpResponses$$
    .filter(res$ => res$.request.label === LABEL_REQUEST_USER_2)
    .mergeAll();

  const userReceivedAction$ = userHttpResponse$
    .map(response => Actions.SetUser(response.body));

  // merge all actions and prepate state
  const state$ = Rx.Observable
    .merge(userReceivedAction$)
    .scan((state, operation) => operation(state), initialState);

  return state$;
}

function view(state$) {
  const vtree$ = state$
    .startWith(initialState)
    .map(state =>
      div([
        h1('Home Page'),
        div([
          h2(state.user.email),
          button('.btn-home', 'Do Action Home')
        ])
      ])
    );

  return vtree$;
}

function Home(sources) {
  const actions = intent(sources);
  const state$ = model(actions);
  const vtree$ = view(state$);

  const sink$ = {
    DOM: vtree$,
    HTTP: actions.httpRequest$,
    // share events with parent
    events$: Rx.Observable.empty(),
    // share state with parent
    state$: state$.map(state => {
      return {
        origin: 'home',
        foo: state.user
      };
    })
  }

  return sink$;
}

export default Home;
