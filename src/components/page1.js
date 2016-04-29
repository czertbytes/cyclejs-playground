import Rx from 'rx';
import {div, h1, h2, button} from 'cycle-snabbdom';

const LABEL_REQUEST_USER_3 = 'users_3';

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
    origin: 'page1'
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
  const btnClicks$ = sources.DOM.select('.btn-page1').events('click');

  const events$ = btnClicks$
    .map(() => Events.ButtonPressed);

  // make call to that url
  const userHttpRequest$ = Rx.Observable.just({
    url: 'http://jsonplaceholder.typicode.com/users/3',
    method: 'GET',
    label: LABEL_REQUEST_USER_3
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
    .map(event => Actions.SetParentEvent(event));

  // filter our httpResponse
  const userHttpResponse$ = actions.httpResponses$$
    .filter(res$ => res$.request.label === LABEL_REQUEST_USER_3)
    .mergeAll();

  const userReceivedAction$ = userHttpResponse$
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
    .map(state =>
      div([
        h1('Page1'),
        h2(`Value Home: ${state.user.email}`),
        h2(`Event from Parent: ${state.parent.event}`),
        button('.btn-page1', 'Do Action Page1')
      ])
    );

  return vtree$;
}

function Page1(sources) {
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

export default Page1;
