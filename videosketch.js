/*
 * VideoSketch. Telestrator like freehand sketching 
 * on HTML5 video. Functionality as seen during sports broadcasts.
 * 2010-11-21
 *
 * By Markus Messner-Chaney, http://mmessnerchaney.com
 * Public Domain.
 * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
 */

/*jslint white: true, browser: true, devel: true, windows: true, onevar: true, undef: true, eqeqeq: true, 
bitwise: true, regexp: true, newcap: true, immed: true, maxlen: 120, indent: 2 */
/*global videosketch, Element, Function, Math, Object */

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
(function (window) {

  var videosketch = window.videosketch || (window.videosketch = {});

  // Main editor class
  // -----------------

  videosketch.Editor = function (video, glint) {
    
    // Set optional reference to a glint player.
    // VideoSketch uses glint notification system if present.
    this.glint = glint;

    // Holds editor DOM
    var fragment = document.createDocumentFragment();

    this.video = (video.play) ? video : document.querySelector(video);
    this.container = this.video.parentNode;

    this.container.classList.add('vs-container');

    // Make editor container as large as video
    this.container.style.width = this.video.width + 'px';
    this.container.style.height = this.video.height + 'px';

    // Bind class methods to this object
    this.editSketch = this.editSketch.bind(this);
    this.removeSketch = this.removeSketch.bind(this);

    this.sketches = [];

    // Setup DOM
    // ---------

    this.sketchpad = new videosketch.Renderer({
      'class': 'vs-sketchpad',
      parent: fragment
    });

    this.thumbnails = videosketch.util.makeElement('ul', {
      'class': 'vs-thumbnails'
    });
    fragment.appendChild(this.thumbnails);

    this.controls = videosketch.util.makeElement('div', {
      'class': 'vs-controls'
    });

    this.pencilControl = videosketch.util.makeElement('button', {
      'class': 'vs-pencil-control', 
      title: 'Pencil tool'
    });
    this.controls.appendChild(this.pencilControl);

    this.pencilStyles = videosketch.util.makeElement('div', {
      'class': 'vs-pencil-styles'
    });
    this.controls.appendChild(this.pencilStyles);

    videosketch.Path.styles.forEach(function (option) {
      this.pencilStyles.appendChild(videosketch.util.makeElement('div', {
        'class': option.isDefault ? 'selected' : '',
        title: option.label,
        'data-group': option.group,
        'data-value': option.value
      }));
    }, this);

    this.eraserControl = videosketch.util.makeElement('button', {
      'class': 'vs-eraser-control', 
      title: 'Eraser tool'
    });
    this.controls.appendChild(this.eraserControl);

    this.clearControl = videosketch.util.makeElement('button', {
      'class': 'vs-clear-control', 
      title: 'Clear this sketch'
    });
    this.controls.appendChild(this.clearControl);

    this.showThumbsControl = videosketch.util.makeElement('button', {
      'class': 'vs-show-thumbnails-control', 
      title: 'Show all sketches'
    });
    this.controls.appendChild(this.showThumbsControl);

    fragment.appendChild(this.controls);

    if (this.video.nextSibling) {
      this.container.insertBefore(fragment, this.video.nextSibling);
    } else {
      this.container.appendChild(fragment);
    }

    // Set inital state
    this.inactive = true;

    // Setup size of sketchpad if meta data available
    if (this.video.readyState > 0) {
      this.sketchpad.setAspectRatio(this.video.videoWidth / this.video.videoHeight, true);
    }

    // Setup video events
    // ------------------

    this.video.addEventListener('loadedmetadata', this.onVideoMetaDataLoaded.bind(this), false);
    this.video.addEventListener('play', this.onVideoPlay.bind(this), false);
    this.video.addEventListener('seeking', this.onVideoSeeking.bind(this), false);

    // Setup UI events
    // ---------------

    window.addEventListener('resize', this.onWindowResize.bind(this), false);

    this.pencilControl.addEventListener('click', this.onPencilControlClick.bind(this), false);
    this.video.addEventListener('click', this.onPencilControlClick.bind(this), false);
    this.eraserControl.addEventListener('click', this.onEraserControlClick.bind(this), false);
    this.clearControl.addEventListener('click', this.onClearControlClick.bind(this), false);
    this.showThumbsControl.addEventListener('click', this.onShowThumbsControlClick.bind(this), false);
    videosketch.util.delegate(this.pencilStyles, 'div', 'click', this.onPencilStylesClickDelegate.bind(this));

    // Setup drawing events
    // --------------------

    // Bind drawing events to this object
    this.onSketchPadMouseMove = this.onSketchPadMouseMove.bind(this);
    this.onSketchPadMouseOver = this.onSketchPadMouseOver.bind(this);
    this.onDocumentMouseUp = this.onDocumentMouseUp.bind(this);

    this.sketchpad.container.addEventListener('mousedown', this.onSketchPadMouseDown.bind(this), false);
    this.sketchpad.container.addEventListener('contextmenu', this.onSketchPadContextMenu, false);

  };

  videosketch.Editor.prototype = {

    createSketch: function () {
      var sketch = new videosketch.Sketch(this.video);
      this.sketches.push(sketch);
      this.createThumbnailFromSketch(sketch);
      this.editSketch(sketch);
    },

    editSketch: function (sketch) {
      this.video.pause();
      this.seekingFrame = true;  
      
      try {    
        this.video.currentTime = sketch.timestamp;
      } catch (error) {        
        /* Video not ready */ 
      }

      this.sketchpad.attachSketch(sketch);
      this.sketch = sketch;

      if (this.inactive) {
        this.drawing = true;
        if (this.glint) {         
          this.glint.showNotice(); 
        }
      }
    },

    removeSketch: function (sketch) {
      // Remove sketch from sketch array
      this.sketches.splice(this.sketches.indexOf(sketch), 1);

      // Detach sketch and switch to inactive if sketch
      // was displayed
      if (this.sketchpad.detachSketch(sketch)) {
        this.inactive = true;
        delete this.sketch;
      }

      // Hide thumbnail popup of no sketches left
      if (!this.sketches.length) {
        this.container.classList.remove('vs-showing-thumbnails');
      }
    },

    createThumbnailFromSketch: function (sketch) {
      var thumbnail = new videosketch.Thumbnail({
        parent: this.thumbnails,
        sketch: sketch,
        aspectRatio: this.video.videoWidth / this.video.videoHeight
      });

      thumbnail.bind('select', this.editSketch);
      thumbnail.bind('remove', this.removeSketch);
    },

    getPencilStyles: function () {
      var selectedColor = this.pencilStyles.querySelector('.selected[data-group="color"]'),
          selectedWidth = this.pencilStyles.querySelector('.selected[data-group="width"]');

      return {
        color: selectedColor.getAttribute('data-value'),
        width: parseInt(selectedWidth.getAttribute('data-value'), 10)
      };
    },

    // Video event handlers
    // --------------------

    onVideoMetaDataLoaded: function () {
      // Setup size of sketchpad if meta data available
      this.sketchpad.setAspectRatio(this.video.videoWidth / this.video.videoHeight, true);
    },
    
    onVideoPlay: function () {
      this.inactive = true;
    },
    
    onVideoSeeking: function () {
      if (!this.seekingFrame) {
        this.inactive = true;
      }
      this.seekingFrame = false; 
    },

    // UI event handlers
    // -----------------

    onWindowResize: function () {
      if (this.video.readyState > 0) {
        setTimeout(this.sketchpad.resizeAndCenter, 0);
      }
    },

    onPencilControlClick: function (event) {
      if (this.inactive) {
        this.video.pause();
        this.createSketch();
      } else if (this.erasing) {
        this.drawing = true; 
        if (this.glint) {
          this.glint.showNotice(); 
        }              
      }
    },

    onEraserControlClick: function (event) {
      this.erasing = this.erasing || this.drawing;
      if (this.glint && this.erasing) {
        this.glint.showNotice(); 
      }
    },

    onClearControlClick: function () {
      this.sketch.clear();
    },

    onShowThumbsControlClick: function () {
      this.container.classList.toggle('vs-showing-thumbnails');
    },

    onPencilStylesClickDelegate: function (event) {
      var target = event.target,
          group = target.getAttribute('data-group');

      this.pencilStyles.querySelector('.selected[data-group="' + group + '"]').classList.remove('selected');
      target.classList.add('selected');
    },

    // Drawing event handlers
    // ----------------------

    onSketchPadMouseDown: function (event) {
      var localCoordinates = videosketch.util.localCoordinates(event),
          rightButtonDown = event.which === 3;

      this.mouseDown = true;

      // Prevent selection of text in browsers don't support the
      // user-selection CSS style
      event.preventDefault();

      // If right click happened and drawing was activated switch
      // to erasing
      this.erasing = this.erasing || this.drawing && rightButtonDown;

      if (this.drawing) {
        this.sketch.createPath(this.getPencilStyles());
        this.sketch.addPointToLastPath(localCoordinates);
      } else if (this.erasing) {
        this.sketch.removePathsCloseToPoints(localCoordinates);
      }

      this.lastLocalCoordinates = localCoordinates;

      // Add handlers for further manipulation of sketch.
      // These are removed as soon as mouse button is released.
      document.addEventListener('mouseup', this.onDocumentMouseUp, false);
      this.sketchpad.container.addEventListener('mousemove', this.onSketchPadMouseMove, false);
      this.sketchpad.container.addEventListener('mouseover', this.onSketchPadMouseOver, false);
    },

    // Adds cordinates
    onSketchPadMouseMove: function (event) {
      var localCoordinates = videosketch.util.localCoordinates(event);

      if (this.drawing) {
        this.sketch.addPointToLastPath(localCoordinates);
      } else if (this.erasing) {
        this.sketch.removePathsCloseToPoints(localCoordinates, this.lastLocalCoordinates);
      }

      this.lastLocalCoordinates = localCoordinates;
    },

    onSketchPadMouseOver: function (event) {
      var localCoordinates = videosketch.util.localCoordinates(event);
      if (this.drawing) {
        this.sketch.createPath(this.getPencilStyles());
        this.sketch.addPointToLastPath(localCoordinates);
      }
      this.localCoordinates = localCoordinates;
    },

    onDocumentMouseUp: function (event) {
      this.mouseDown = false;

      event.preventDefault();

      // Switch back to drawing if right mouse button was released
      this.drawing = this.drawing || this.erasing && event.which === 3;

      // Render paths again to smooth out lines
      this.sketchpad.renderPaths();
      document.removeEventListener('mouseup', this.onDocumentMouseUp, false);
      this.sketchpad.container.removeEventListener('mousemove', this.onSketchPadMouseMove, false);
      this.sketchpad.container.removeEventListener('mouseover', this.onSketchPadMouseOver, false);
    },

    onSketchPadContextMenu: function (event) {
      event.preventDefault();
    }

  };

  // Define editor states
  videosketch.Editor.states = ['drawing', 'erasing', 'inactive'];

  // Define getters/setters for each state.
  // Setters set state property of editor and
  // set corresponding className on editor container.
  videosketch.Editor.states.forEach(function (state) {
    Object.defineProperty(videosketch.Editor.prototype, state, {
      get: function () {
        return this.state === state;
      },
      set: function (value) {
        if (value) {
          this.container.classList.remove('vs-' + this.state);
          this.container.classList.add('vs-' + state);
          this.state = state;
        } else if (this.state === state) {
          this.inactive = true;
        }
      }
    });
  });

  videosketch.setup = function (video, glint) {
    return new videosketch.Editor(video, glint);
  };

}(this));
(function (window) {

  var videosketch = window.videosketch || (window.videosketch = {});

  // Paths within a sketch
  // ---------------------

  videosketch.Path = function (options) {
    this.points = [];
    this.color = options.color;
    this.width = options.width;
  };

  videosketch.Path.prototype = {

    addPoint: function (point) {
      this.points.push(point);
      return this;
    },

    // Returns true if this path in close to startingPoint or if any path segment intersects the 
    // segment [startingPoint, endPoint]. This allows removal of paths even if mouse movement events 
    // are far apart (low fps situation).
    isCloseToPoints: function (startingPoint, endPoint) {
      var i = this.points.length,
          point, previousPoint;
          
      if (this.points.length === 1) {
        return (videosketch.Path.pointDistance(this.points[0], startingPoint) < 0.02);
      }

      while ((point = this.points[--i]) && (previousPoint = this.points[i - 1])) {
        if (videosketch.Path.pointDistance(point, startingPoint) < 0.02) {
          return true;
        } else if (endPoint && videosketch.Path.segmentsIntersect(startingPoint, endPoint, point, previousPoint)) {
          return true;
        }
      }

      return false;
    }

  };

  videosketch.util.makeEventSource(videosketch.Path);

  videosketch.Path.pointDistance = function (firstPoint, secondPoint) {
    return Math.sqrt(Math.pow(firstPoint.x - secondPoint.x, 2) + Math.pow(firstPoint.y - secondPoint.y, 2));
  };

  videosketch.Path.segmentsIntersect = function (aStart, aEnd, bStart, bEnd) {
    var Ua, Ub;

    // Equations to determine whether lines intersect
    Ua = ((aStart.x - aEnd.x) * (bEnd.y - aEnd.y) - (aStart.y - aEnd.y) * (bEnd.x - aEnd.x));
    Ua /= ((aStart.y - aEnd.y) * (bStart.x - bEnd.x) - (aStart.x - aEnd.x) * (bStart.y - bEnd.y));

    Ub = ((bStart.x - bEnd.x) * (bEnd.y - aEnd.y) - (bStart.y - bEnd.y) * (bEnd.x - aEnd.x));
    Ub /= ((aStart.y - aEnd.y) * (bStart.x - bEnd.x) - (aStart.x - aEnd.x) * (bStart.y - bEnd.y));


    return (Ua >= 0 && Ua <= 1 && Ub >= 0 && Ub <= 1);
  };

  videosketch.Path.styles = [];
  videosketch.Path.styles.push({
    group: 'color',
    label: 'White',
    value: '#fff',
    isDefault: true
  });
  videosketch.Path.styles.push({
    group: 'color',
    label: 'Red',
    value: '#ff0000'
  });
  videosketch.Path.styles.push({
    group: 'width',
    label: 'Thick',
    value: 12,
    isDefault: true
  });
  videosketch.Path.styles.push({
    group: 'width',
    label: 'Thin',
    value: 4
  });

}(this));
(function (window) {

  var videosketch = window.videosketch || (window.videosketch = {});

  // Sketch model class
  // ------------------

  videosketch.Sketch = function (video) {
      this.paths = [];

      if (video) {
        this.timestamp = video.currentTime;
        this.capture(video);
      }
    };

  videosketch.Sketch.prototype = {

    capture: function (video) {
      this.timestamp = video.currentTime;
      this.frame = videosketch.util.makeElement('canvas');
      this.frame.width = video.videoWidth;
      this.frame.height = video.videoHeight;
      this.frame.getContext('2d').drawImage(video, 0, 0);
    },

    createPath: function (options) {
      this.lastPath = new videosketch.Path(options);
      this.paths.push(this.lastPath);

      return this.lastPath;
    },

    addPointToLastPath: function (point) {
      this.lastPath.addPoint(point);
      this.trigger('pathaddpoint', this.lastPath, point);
    },

    removePathsCloseToPoints: function (startingPoint, endPoint) {
      var updatedPaths = [],
          i = this.paths.length,
          path;

      while ((path = this.paths[--i])) {
        if (!path.isCloseToPoints(startingPoint, endPoint)) {
          updatedPaths.push(path);
        }
      }

      // Check if any paths were removed and trigger event accordingly
      if (updatedPaths.length !== this.paths.length) {
        this.paths = updatedPaths;
        this.trigger('pathremove');
      }
    },

    clear: function () {
      this.paths = [];
      this.trigger('pathremove');
    }

  };

  videosketch.util.makeEventSource(videosketch.Sketch);

}(this));
(function (window) {

  var videosketch = window.videosketch || (window.videosketch = {});

  // Render sketch data to canvases
  // ------------------------------

  videosketch.Renderer = function (options) {

    // Bind render methods to this object
    this.renderFrame = this.renderFrame.bind(this);
    this.renderPaths = this.renderPaths.bind(this);
    this.renderPathPoint = this.renderPathPoint.bind(this);

    // Setup DOM
    // ---------

    this.container = videosketch.util.makeElement('div', {
      'class': options['class'] || 'vs-renderer'
    });

    this.backCanvas = videosketch.util.makeElement('canvas', {
      'class': 'vs-back-canvas'
    });
    this.container.appendChild(this.backCanvas);

    this.frontCanvas = videosketch.util.makeElement('canvas', {
      'class': 'vs-front-canvas'
    });
    this.container.appendChild(this.frontCanvas);

    options.parent.appendChild(this.container);

    // Finish setup
    // ------------

    this.frontContext = this.frontCanvas.getContext('2d');
    videosketch.Renderer.normalizeContext(this.frontContext);
    this.backContext = this.backCanvas.getContext('2d');

    this.setCanvasSize(options.width || 300, options.height || 150);

    if (options.sketch) {
      this.attachSketch(options.sketch);
    }

  };

  videosketch.Renderer.prototype = {

    setCanvasSize: function (width, height) {
      this.frontCanvas.width = this.backCanvas.width = this.width = parseInt(width, 10);
      this.frontCanvas.height = this.backCanvas.height = this.height =  parseInt(height, 10);
      videosketch.Renderer.normalizeContext(this.frontContext);
      if (this.sketch) {
        this.renderAll();
      }
    },

    setContainerSize: function (width, height) {
      this.container.style.width = width + 'px';
      this.container.style.height = height + 'px';
    },

    setContainerOffset: function (left, top) {
      this.container.style.left = left + 'px';
      this.container.style.top = top + 'px';
    },

    attachSketch: function (sketch) {
      // Detach old sketch
      if (this.sketch) {
        this.detachSketch(this.sketch);
      }

      this.sketch = sketch;
      this.sketch.bind('pathremove', this.renderPaths);
      this.sketch.bind('pathaddpoint', this.renderPathPoint);

      this.renderAll();
    },

    detachSketch: function (sketch) {
      var detached = false;

      if (sketch === this.sketch) {
        this.sketch.unbind('pathremove', this.renderPaths);
        this.sketch.unbind('pathaddpoint', this.renderPathPoint);
        delete this.sketch;
        detached = true;
      }

      return detached;
    },

    renderAll: function () {
      this.renderPaths();
      this.renderFrame();
    },

    renderFrame: function () {
      var frame = this.sketch.frame;
      try {
        this.backContext.drawImage(frame, 0, 0, frame.width, frame.height, 0, 0, this.width, this.height);
      } catch (error) {
        // IE9PP7 won't drawImage unless surrounded by try catch...
      }
    },

    renderPaths: function () {
      this.clear();
      if (this.sketch && this.sketch.paths) {
        this.sketch.paths.forEach(this.renderPath, this);
      }
    },

    renderPath: function (path) {
      var points = path.points,
          length = points.length,
          getControlPoints = videosketch.Renderer.getControlPoints,
          i = 0, cps, point;

      this.setPathStyle(path);

      if (path.points.length < 3) {
        this.renderPathPoint(path, points[length - 1]);
      } else {
        
        this.frontContext.beginPath();
        
        point = points[0];
        this.frontContext.normalizedMoveTo(point.x, point.y);

        for (i = 1; i < length - 1; i++) {
          point = points[i];             
          cps = getControlPoints(points[i - 1], point, points[i + 1]);
          this.frontContext.normalizedQuadraticCurveTo(cps.p1.x, cps.p1.y, point.x, point.y);          
        }
        
        this.frontContext.normalizedQuadraticCurveTo(cps.p2.x, cps.p2.y, points[length - 1].x, points[length - 1].y);

        this.frontContext.stroke();
      }
    },

    renderPathPoint: function (path, point) {
      var previousPoint = path.points[path.points.indexOf(point) - 1] || {
        x: point.x * 1.001,
        y: point.y * 1.001
      };

      this.setPathStyle(path);
      this.frontContext.beginPath();
      this.frontContext.normalizedMoveTo(previousPoint.x, previousPoint.y);
      this.frontContext.normalizedLineTo(point.x, point.y);
      this.frontContext.stroke();
    },

    setPathStyle: function (path) {
      this.frontContext.strokeStyle = path.color || '#fff';
      this.frontContext.lineWidth = path.width / 1000 * this.frontCanvas.width;
      this.frontContext.lineCap = 'round';
      this.frontContext.lineJoin = 'round';
    },

    clear: function () {
      this.frontContext.clearRect(0, 0, this.frontCanvas.width, this.frontCanvas.height);
    },

    // Used to preserve the video aspect ratio when resizing the sketchpad and
    // also ensure the correct AR of thumbnails.
    // For 'meet' see http://www.w3.org/TR/SVG/coords.html#PreserveAspectRatioAttribute.
    // A false value for 'meet' assumes 'slice'.
    setAspectRatio: function (aspectRatio, meet) {
      if (!this.container || !this.container.nodeType) {
        return;
      }

      var image;

      this.aspectRatio = aspectRatio;

      if (meet) {
        this.resizeAndCenter = this.resizeAndCenter.bind(this);
        this.resizeAndCenter();
      } else {

        // Insert an image into the DOM that forces the container to a specific aspect ratio.
        // Needed because canvas elements don't resize according to their width/height ratio (unlike images).
        image = videosketch.util.makeElement('img');
        image.src = videosketch.util.makeElement('canvas', {
          width: 800,
          height: parseInt(800 / aspectRatio, 10)
        }).toDataURL();
        this.container.appendChild(image);

      }
    },

    resizeAndCenter: function () {
      if (!this.container || !this.container.nodeType || !this.container.parentNode) {
        return;
      }

      var parentBounds = this.container.parentNode.getBoundingClientRect(),
          containerBounds = {
          top: 0,
          left: 0,
          width: 0,
          height: 0
        };

      if (this.aspectRatio > parentBounds.width / parentBounds.height) {
        containerBounds.top = (parentBounds.height - (parentBounds.width / this.aspectRatio)) / 2;
        containerBounds.width = parentBounds.width;
        containerBounds.height = parentBounds.width / this.aspectRatio;
      } else {
        containerBounds.left = (parentBounds.width - (parentBounds.height * this.aspectRatio)) / 2;
        containerBounds.width = parentBounds.height * this.aspectRatio;
        containerBounds.height = parentBounds.height;
      }

      this.setCanvasSize(containerBounds.width, containerBounds.height);
      this.setContainerSize(containerBounds.width, containerBounds.height);
      this.setContainerOffset(containerBounds.left, containerBounds.top);
    }

  };

  videosketch.Renderer.normalizeContext = function (context) {
    var width = context.canvas.width,
        height = context.canvas.height;

    context.normalizedMoveTo = function (x, y) {
      context.moveTo(x * width, y * height);
    };

    context.normalizedLineTo = function (x, y) {
      context.lineTo(x * width, y * height);
    };

    context.normalizedQuadraticCurveTo = function (cx, cy, x, y) {
      context.quadraticCurveTo(cx * width, cy * height, x * width, y * height);
    };
  };

  // Source: http://scaledinnovation.com/analytics/splines/aboutSplines.html
  // TODO: renderPath uses only the first control points... maybe use bezier curves?
  videosketch.Renderer.getControlPoints = function (p0, p1, p2) {
    var t = 0.5,
        d01 = Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2)),
        d12 = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)),
        fa = t * d01 / (d01 + d12),
        fb = t * d12 / (d01 + d12);     

    return { 
        p1: {
          x: p1.x - fa * (p2.x - p0.x),
          y: p1.y - fa * (p2.y - p0.y)
        },
        p2: {
          x: p1.x + fb * (p2.x - p0.x),
          y: p1.y + fb * (p2.y - p0.y)
        }
      };
  };

}(this));
(function (window) {

  var videosketch = window.videosketch || (window.videosketch = {});

  // Thumbnail for sketches
  // ----------------------

  videosketch.Thumbnail = function (options) {

    this.parent = options.parent;

    // Setup DOM
    // ---------

    this.container = videosketch.util.makeElement('li', {
      'class': 'vs-thumbnail selected'
    });
    this.select();

    this.sketchpad = new videosketch.Renderer({
      parent: this.container,
      width: 300,
      height: parseInt(300 / options.aspectRatio, 10),
      sketch: options.sketch
    });
    
    this.sketchpad.setAspectRatio(options.aspectRatio);

    this.removeControl = videosketch.util.makeElement('button', {
      'class': 'vs-remove-control', 
      title: 'Remove this sketch'
    });
    this.container.appendChild(this.removeControl);

    this.parent.appendChild(this.container);

    // Setup events
    // ------------

    this.container.addEventListener('click', this.onContainerClick.bind(this), false);
    this.removeControl.addEventListener('click', this.onRemoveControlClick.bind(this), false);
    
  };

  videosketch.Thumbnail.prototype = {

    onContainerClick: function (event) {
      this.select();
      this.trigger('select', this.sketchpad.sketch);
    },

    onRemoveControlClick: function (event) {
      event.stopPropagation();
      this.remove();
      this.trigger('remove', this.sketchpad.sketch);
    },

    select: function () {
      var selectedThumbnail = this.parent.querySelector('.vs-thumbnail.selected');

      if (selectedThumbnail) {
        selectedThumbnail.classList.remove('selected');
      }

      this.container.classList.add('selected');
    },

    remove: function () {
      this.sketchpad.detachSketch();
      this.parent.removeChild(this.container);
    }

  };

  videosketch.util.makeEventSource(videosketch.Thumbnail);

}(this));