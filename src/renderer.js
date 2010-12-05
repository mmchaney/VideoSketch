
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