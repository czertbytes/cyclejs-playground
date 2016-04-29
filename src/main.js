import Cycle from '@cycle/core';
import {modules, makeDOMDriver} from 'cycle-snabbdom';
import {makeHTTPDriver} from '@cycle/http';
import {makeRouterDriver} from 'cyclic-router';
import {createHashHistory} from 'history';
import Rx from 'rx';

import app from './app';

const {
  StyleModule, PropsModule,
  AttrsModule, ClassModule,
  HeroModule, EventsModule,
} = modules;

const history = createHashHistory({queryKey: false});

const MdlEventsModule = {
  create: function(emptyVNode, vnode) {
    if (vnode.elm.className.startsWith('mdl')) {
      if (vnode.elm.className !== 'mdl-layout mdl-js-layout') {
        window.componentHandler.upgradeElement(vnode.elm);
      }
    }
  }
};

Cycle.run(app, {
  DOM: makeDOMDriver('#app', { modules: [
    StyleModule, PropsModule,
    AttrsModule, ClassModule,
    HeroModule, EventsModule,
    MdlEventsModule
  ]}),
  HTTP: makeHTTPDriver({eager: true}),
  router: makeRouterDriver(history)
});
