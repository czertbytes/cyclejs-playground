import Cycle from '@cycle/core';
import {makeDOMDriver} from 'cycle-snabbdom';
import {makeHTTPDriver} from '@cycle/http';
import {makeRouterDriver} from 'cyclic-router';
import {createHashHistory} from 'history';
import Rx from 'rx';

import app from './app';

const history = createHashHistory({queryKey: false});

Cycle.run(app, {
  DOM: makeDOMDriver('#app'),
  HTTP: makeHTTPDriver({eager: true}),
  router: makeRouterDriver(history)
});
