import Rx from 'rx';
import {h, div} from 'cycle-snabbdom';

var initialState = {
  user: {
    token: ''
  }
};

const Actions = {
  SetUser: user => state => {
    state.user = user;
    return state;
  }
};

const originDecorator = obj => {
  return {
    ...obj,
    origin: 'signin'
  };
}

const Events = {
  State: state => {
    return originDecorator({
      user: state.user
    })
  }
}

function intent(sources) {
  return {};
};

function model(actions, signinAction$) {
  const state$ = signinAction$
    .map(user => Actions.SetUser(user))
    .startWith(Actions.SetUser({token: ''}))
    .scan((state, operation) => operation(state), initialState);

  return state$;
}

function view(state$, signinAction$) {
  const vtree$ = state$
    .startWith(initialState)
    .do(state => console.log(`signin: View`))
    .map(state =>
      div('#g-signin2', {
        hook: {
          insert: (vnode) => {
            gapi.signin2.render('g-signin2', {
              'scope': 'profile email',
              'longtitle': false,
              'theme': 'dark',
              'onsuccess': user => {
                signinAction$.onNext(userToAuth(user));
              },
              'onfailure': err => {
                console.log(err);
                signinAction$.onNext(notSigned);
              }
            });
          }
        }
      })
    );

  return vtree$;
}

function userToAuth(user) {
  const profile = user.getBasicProfile();
  const authResponse = user.getAuthResponse();
  return {
    isSigned: true,
    origin: 'google',
    id: profile.getId(),
    name: profile.getName(),
    imageUrl: profile.getImageUrl(),
    email: profile.getEmail(),
    token: authResponse.id_token
  };
}

function Signin(sources) {
  const proxySigninAction$ = new Rx.Subject();

  const actions = intent(sources);
  const state$ = model(actions, proxySigninAction$);
  const vtree$ = view(state$, proxySigninAction$);

  const sink$ = {
    DOM: vtree$,
    state$: state$.map(state => Events.State(state))
  };

  return sink$;
}

export default Signin;
