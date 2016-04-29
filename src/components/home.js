import Rx from 'rx';
import {div, h1, h2, button} from 'cycle-snabbdom';

const LABEL_REQUEST_USER_2 = 'users_2';

var initialState = {
  user: {
    email: 'loading ...'
  },
  parent: {
    event: ''
  }
};

const Actions = {
  SetUser: user => state => {
    state.user = user;
    return state;
  },
  SetParentEvent: event => state => {
    state.parent = event;
    return state;
  }
};

const originDecorator = obj => {
  return {
    ...obj,
    origin: 'home'
  };
}

const Events = {
  State: state => {
    return originDecorator({
      foo: state.user
    })
  },
  ButtonPressed: originDecorator({
    event: 'button-pressed'
  })
}

function intent(sources) {
  // catch button event
  const btnClicks$ = sources.DOM.select('.btn-home').events('click');

  const events$ = btnClicks$
    .map(() => Events.ButtonPressed);

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
    httpResponses$$: sources.HTTP,
    events$,
    parentEvents$: sources.parentEvents$
  };
}

function model(actions) {
  const parentEventAction$ = actions.parentEvents$
    .do(response => console.log(`home: parent event`))
    .map(event => Actions.SetParentEvent(event));

  // filter our httpResponse
  const userHttpResponse$ = actions.httpResponses$$
    .filter(res$ => res$.request.label === LABEL_REQUEST_USER_2)
    .mergeAll();

  const userReceivedAction$ = userHttpResponse$
    .do(response => console.log(`home: User http response`))
    .map(response => Actions.SetUser(response.body));

  // merge all actions and prepate state
  const state$ = Rx.Observable
    .merge(
      parentEventAction$,
      userReceivedAction$)
    .scan((state, operation) => operation(state), initialState);


  return state$;
}

function view(state$) {
  const vtree$ = state$
    .startWith(initialState)
    .do(state => console.log(`home: View`))
    .map(state =>
      div([
        h1('Home Page'),
        h2(`Value Home: ${state.user.email}`),
        h2(`Event from Parent: ${state.parent.event}`),
        button('.btn-home', 'Do Action Home')
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
    events$: actions.events$,
    // share state with parent
    state$: state$.map(state => Events.State(state))
  };

  return sink$;
}

export default Home;
