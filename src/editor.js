
(function (window) {

  var videosketch = window.videosketch || (window.videosketch = {});

  // Main editor class
  // -----------------

  videosketch.Editor = function (video) {

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
      }

      this.drawing = true;
    },

    onEraserControlClick: function (event) {
      this.erasing = this.erasing || this.drawing;
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

  videosketch.setup = function (video) {
    return new videosketch.Editor(video);
  };

}(this));