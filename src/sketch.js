
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