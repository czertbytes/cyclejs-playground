import Rx from 'rx';
import {div, h1} from 'cycle-snabbdom';

const notSigned = {
  isSigned: false
};

function intent(sources, signinAction$) {
  return {
    ...sources,
    signinAction$
  };
}

function model(actions) {
  const state$ = actions.signinAction$
    .map(x => x)
    .startWith(notSigned);

  return state$;
}

function view(state$, signinAction$) {
  return state$
    .map(({isSigned}) => {
      return isSigned ? renderSigned() : renderNotSigned(signinAction$)
    }
  );
}

/*
 * Signin
 */
function Signin(sources, signinAction$) {
  const actions = intent(sources, signinAction$);
  const state$ = model(actions);
  const vtree$ = view(state$, signinAction$);

  const sinks = {
    DOM: vtree$
  }

  return sinks;
}

function renderSigned() {
  return div([
    h1('', 'Signed')
  ])
}

function userToAuth(user) {
  const profile = user.getBasicProfile();
  return {
    isSigned: true,
    origin: 'google',
    id: profile.getId(),
    name: profile.getName(),
    imageUrl: profile.getImageUrl(),
    email: profile.getEmail()
  };
}

function renderNotSigned(signinAction$) {
  return div('signin-panel',[
    h1('signin'),
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
  ])
}

export default Signin;
