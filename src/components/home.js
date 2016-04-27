import Rx from 'rx';
import {div, h1, h2} from 'cycle-snabbdom';

const LABEL_REQUEST_USER_2 = 'users_2';

var initialState = {
  foo: '',
  user2: {
    email: 'loading ...'
  }
};

const Actions = {
  SetUser2: user => state => {
    state.user2 = user;
    return state;
  }
}

function intent(sources) {
  // make call to that url
  const user2HttpRequest$ = Rx.Observable.just({
    url: 'http://jsonplaceholder.typicode.com/users/2',
    method: 'GET',
    label: LABEL_REQUEST_USER_2
  });

  // merge all http requests in one stream
  const httpRequest$ = Rx.Observable.merge(
    user2HttpRequest$
  );

  return {
    httpRequest$,
    httpResponses$$: sources.HTTP
  }
}

function model(actions) {
  // filter our httpResponse
  const user2HttpResponse$ = actions.httpResponses$$
    .filter(res$ => res$.request.label === LABEL_REQUEST_USER_2)
    .mergeAll();

  const user2ReceivedAction$ = user2HttpResponse$
    .map(response => Actions.SetUser2(response.body));

  // merge all actions and prepate state
  const state$ = Rx.Observable
    .merge(user2ReceivedAction$)
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
          state.user2 === {} ? h1('foo') : h2(state.user2.email)
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
    // share value with parent
    value$: state$.pluck('user2')
  }

  return sink$;
}

export default Home;
