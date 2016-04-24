import {Observable} from 'rx';
import {div, h1, h2} from 'cycle-snabbdom';

function intent(sources) {
  return {
    responses$$: sources.HTTP,
    request$:  Observable.just({
      url: 'http://jsonplaceholder.typicode.com/users/3',
      category: 'users2',
      method: 'GET'
    })
  }
}

function model(actions) {
  const response$$ = actions.responses$$
    .filter(res$ => res$.request.category === 'users3');
  const response$ = response$$.mergeAll();

  const state$ = response$
    .map(res => res.body)
    .startWith(null);

  return state$;
}

function view(state$) {
  return state$
    .map(user =>
      div([
        h1('Page1'),
        div([
          user === null ? null : h2(user.name)
        ])
      ])
    );
}

function Home(sources) {
  const actions = intent(sources);
  const state$ = model(actions);
  const vtree$ = view(state$);

  const sink$ = {
    DOM: vtree$,
    HTTP: actions.request$,
    router: sources.router
  }

  return sink$;
}

export default Home;
