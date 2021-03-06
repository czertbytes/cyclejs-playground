import Rx from 'rx';
import {h, div, a, h1, h2, span, header, nav, main, button} from 'cycle-snabbdom';

import Home from './components/home';
import Page1 from './components/page1';
import Signin from './components/signin';

const ROUTES = {
  '/': Home,
  '/page1': Page1
};

const LABEL_REQUEST_USER_1 = 'users_1';

var initialState = {
  page: {
    current: Home,
    signin: Signin
  },
  app: {
    foo: 'loading ...',
    event: ''
  },
  home: {
    foo: 'loading ...',
    event: ''
  },
  page1: {
    foo: 'loading ...',
    event: ''
  },
  user: {}
};

const Actions = {
  RenderCurrent: component => state => {
    state.page.current = component;
    return state;
  },
  RenderSignin: component => state => {
    state.page.signin = component;
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
  SetHomeEvent: event => state => {
    state.home.event = event.event;
    return state;
  },
  SetPage1State: page1 => state => {
    state.page1.foo = page1.email;
    return state;
  },
  SetPage1Event: event => state => {
    state.page1.event = event.event;
    return state;
  },
  SetUserValue: user => state => {
    state.user = user;
    return state;
  },
  DummyAction: state => {
    return state;
  }
};

const Events = {
  ButtonPressed: {
    origin: 'app',
    event: 'app-button-pressed'
  },
  ButtonReset: {
    origin: 'app',
    event: ''
  }
};

function mdlElementUpgrade() {
  return {
    hook: {
      insert: (vnode) => {
        window.componentHandler.upgradeElement(vnode.elm)
      }
    }
  };
}

function intent(sources) {
  const {router} = sources;
  const match$ = router.define(ROUTES);

  const btnSetClicks$ = sources.DOM.select('.btn-app-set').events('click');
  const btnResetClicks$ = sources.DOM.select('.btn-app-reset').events('click');

  // handle button events
  const buttonPressedEvents$ = btnSetClicks$
    .map(() => Events.ButtonPressed);

  const buttonResetEvents$ = btnResetClicks$
    .map(() => Events.ButtonReset);

  // create parent events
  const events$ = Rx.Observable
    .merge(
      buttonPressedEvents$,
      buttonResetEvents$)
    .shareReplay(1);  // new loaded child will get the last parent event

  // match the url and create child
  const children$ = match$
    .map(({path, value}) => value({
        ...sources,
        router: router.path(path),
        parentEvents$: events$ // pass events to child
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

function model(actions, signin$) {
  // filter our httpResponse
  const userHttpResponse$ = actions.httpResponses$$
    .filter(res$ => res$.request.label === LABEL_REQUEST_USER_1)
    .mergeAll();

  const userReceivedAction$ = userHttpResponse$
    .do(response => console.log(`app: User http response`))
    .map(response => Actions.SetAppState(response.body));

  // current child
  const currentChild$ = actions.children$
    .do(child => console.log(`app: Current child`))
    .map(child => child);

  // state value from current child
  const currentChildStateAction$ = currentChild$
    .flatMap(({state$}) => state$)
    .do(state => console.log(`app: Current child state ${state.origin}`))
    .map(state => {
      switch (state.origin) {
        case 'home':
          return Actions.SetHomeState(state.foo);
        case 'page1':
          return Actions.SetPage1State(state.foo);
        default:
          console.log(`app: Unknown child state origin ${state.origin}`);
      }
    });

  // events from current child
  const currentChildEventAction$ = currentChild$
    .switchMap(({events$}) => events$)
    .do(event => console.log(`app: Current child event ${event.origin}`))
    .map(event => {
      switch (event.origin) {
        case 'home':
          return Actions.SetHomeEvent(event);
        case 'page1':
          return Actions.SetPage1Event(event);
        default:
          console.log(`app: Unknown child event origin ${event.origin}`);
      }
    });

  // render current child
  const currentChildRenderAction$ = currentChild$
    .do(child => console.log(`app: Current child render`))
    .map(child => Actions.RenderCurrent(child));

  // signin user value
  const signinStateAction$ = signin$.state$
    .do(state => console.log(`app: Signin child state ${state.user.token}`))
    .map(state => Actions.SetUserValue(state.user));

  const signinRenderAction$ = Rx.Observable.just(Actions.RenderSignin(signin$))

  // merge all actions and prepare state
  const state$ = Rx.Observable
    .merge(
      userReceivedAction$,
      currentChildEventAction$,
      currentChildStateAction$,
      currentChildRenderAction$,
      signinStateAction$,
      signinRenderAction$)
    .scan((state, operation) => operation(state), initialState);

  return state$;
}

function view(state$) {
  const vtree$ = state$
    .startWith(initialState)
    .do(state => console.log(`app: View`))
    .map(state => {
      let {page} = state;

      return h('div.mdl-layout.mdl-js-layout', mdlElementUpgrade(), [
        header('.mdl-layout__header', [
          div('.mdl-layout__header-row', [
            span('.mdl-layout-title', 'Title'),
            div('.mdl-layout-spacer', []),
            nav('.mdl-navigation', [
              a('.mdl-navigation__link', {props: {href: '#/home'}}, 'To Home'),
              a('.mdl-navigation__link', {props: {href: '#/page1'}}, 'To Page1'),
            ])
          ])
        ]),
        div('.mdl-layout__drawer', [
          span('.mdl-layout-title', 'Title'),
          nav('.mdl-navigation', [
            a('.mdl-navigation__link', {props: {href: '#/home'}}, 'To Home'),
            a('.mdl-navigation__link', {props: {href: '#/page1'}}, 'To Page1'),
          ])
        ]),
        main('.mdl-layout__content', [
          page.signin.DOM,
          h1(`App value: ${state.app.foo}`),
          div([
            button('.mdl-button.mdl-js-button.mdl-button--raised.mdl-js-ripple-effect.mdl-button--accent.btn-app-set', 'App Action Set'),
            button('.mdl-button.mdl-js-button.mdl-button--raised.mdl-js-ripple-effect.mdl-button--accent.btn-app-reset', 'App Action Reset')
          ]),
          h2(`Home value: ${state.home.foo}, event: ${state.home.event}`),
          h2(`Page1 value: ${state.page1.foo} event: ${state.page1.event}`),
          page.current.DOM
        ])
      ]);
    });

  return vtree$;
}

function App(sources) {
  const signin$ = Signin(sources);

  const actions = intent(sources);
  const state$ = model(actions, signin$);
  const vtree$ = view(state$);

  const sink$ = {
    DOM: vtree$,
    HTTP: actions.httpRequest$
  };

  return sink$;
}

export default App;
