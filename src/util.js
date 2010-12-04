
(function (window) {

  var videosketch = window.videosketch || (window.videosketch = {}),
      document = window.document,
      eventSource;

  videosketch.util = {};
  videosketch.util.slice = [].slice;  

  // Utility functions
  // -----------------

  function makeElement(tagName, attributes) {
    var element = document.createElement(tagName), 
        prop;

    for (prop in attributes) {
      if (prop === 'class') {
        element.className = attributes[prop];
      } else {
        element.setAttribute(prop, attributes[prop]);
      }
    }

    return element;
  }

  function delegate(element, selector, type, listener) {
    element.addEventListener(type, function (event) {
      var target = event.target,
      nodes = videosketch.util.slice.call(element.querySelectorAll(selector));
      while (target && nodes.indexOf(target) < 0) {
        target = target.parentNode;
      }

      if (target && target !== element && target !== document) {
        listener.call(target, event);
      }
    }, false);
  }

  // Normalized mouse position local to element
  function localCoordinates(event, target) {
    var box;

    target = target || event.target;
    box = target.getBoundingClientRect();

    return {
      x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)),
      y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)),
      box: box
    };
  }
  
  function mixin(source, target) {
    var prop;    
    for (prop in source) {
      if (source.hasOwnProperty(prop)) {
        target[prop] = source[prop];
      }
    }    
  }

  // Simple custom events
  eventSource = {
    bind: function (event, handler) {
      this.eventMap = this.eventMap || {};
      this.eventMap[event] = this.eventMap[event] || [];
      this.eventMap[event].push(handler);
    },
    unbind: function (event, handler) {
      this.eventMap[event].splice(this.eventMap[event].indexOf(handler), 1);
    },
    trigger: function (event) {
      var args = videosketch.util.slice.call(arguments, 1);
      if (this.eventMap && this.eventMap[event]) {
        this.eventMap[event].forEach(function (handler) {
          handler.apply(this, args);
        });
      }
    }
  };

  function makeEventSource(target) {
    target = target.prototype || target;
    mixin(eventSource, target);
  }

  videosketch.util.makeElement = makeElement;
  videosketch.util.delegate = delegate;
  videosketch.util.localCoordinates = localCoordinates;
  videosketch.util.makeEventSource = makeEventSource;

  // ES5 Polyfills
  // -------------

  Function.prototype.bind = Function.prototype.bind || function (thisArg) {
    var fn = this,
        args = videosketch.util.slice.call(arguments, 1);

    return function () {
      return fn.apply(thisArg, args.concat(videosketch.util.slice.call(arguments)));
    };
  };

  // Emulate ES5 getter/setter API using legacy APIs
  if (Object.prototype.__defineGetter__ && !Object.defineProperty) {
    Object.defineProperty = function (obj, prop, desc) {
      if ("get" in desc) {
        obj.__defineGetter__(prop, desc.get);
      }
      if ("set" in desc) {
        obj.__defineSetter__(prop, desc.set);
      }
    };
  }

  // Element::classList (does not fully implement ES5 spec)
  if (typeof Element !== 'undefined' && !Element.hasOwnProperty.call(Element.prototype, 'classList')) {
    (function () {
      var classRE = function (token) {
            return new RegExp('(^|\\s)' + token + '(\\s|$)');
          },
          ClassList = function (element) {
            this.element = element;
          },
          getClassList = function () {
            return new ClassList(this);
          };

      ClassList.prototype = {
        contains: function (token) {
          return classRE(token).test(this.element.className);
        },
        add: function (token) {
          if (!this.contains(token)) {
            this.element.className += (this.element.className ? ' ' : '') + token;
          }
        },
        remove: function (token) {
          this.element.className = this.element.className.replace(classRE(token), ' ').trim();
        },
        toggle: function (token) {
          var boundClassRE = classRE(token);
          if (boundClassRE.test(this.element.className)) {
            this.element.className = this.element.className.replace(boundClassRE, ' ').trim();
          } else {
            this.element.className += (this.element.className ? ' ' : '') + token;
          }
        }
      };

      Object.defineProperty(Element.prototype, 'classList', { get: getClassList });
    }());
  }

}(this));