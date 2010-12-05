
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