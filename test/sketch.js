module("sketch.js");

asyncTest('videosketch.Sketch.constructor', function () {
  var Sketch = videosketch.Sketch;
  var fixture = document.querySelector('#qunit-fixture');
  var video = makeVideo();
  var timeUpdates = 0;

  video.addEventListener('canplay', function () {
    video.currentTime = 2;
  }, false);

  video.addEventListener('timeupdate', function () {
    timeUpdates++;

    if (timeUpdates === 2) {
      var sketch = new Sketch(video);
      equals(sketch.timestamp, 2);
      try { // for IE9
        var data = sketch.frame.getContext('2d').getImageData(0, 0, video.videoWidth, video.videoHeight).data;
        equal(4 * video.videoWidth * video.videoHeight, data.length);
      } catch (e) {};
      start();

    }
  }, false);

  fixture.appendChild(video);

});

test('videosketch.Sketch.createPath', function () {
  var sketch = new videosketch.Sketch();
  var path = sketch.createPath({
    color: 'red',
    width: 2
  });

  equal(path.color, 'red');
  equal(path.width, 2);
});

test('videosketch.Sketch.addPointToLastPath', function () {
  var sketch = new videosketch.Sketch();
  var path = sketch.createPath({
    color: 'red',
    width: 2
  });
  var point = {
    x: 1,
    y: 1
  };
  sketch.addPointToLastPath(point);
  notEqual(-1, path.points.indexOf(point));
});

test('videosketch.Sketch.removePathsCloseToPoints', function () {
  var sketch = new videosketch.Sketch();
  var pathA = sketch.createPath({
    color: 'red',
    width: 2
  });
  var pathB = sketch.createPath({
    color: 'blue',
    width: 4
  });

  // Make diagonal line starting at origin
  pathA.addPoint({
    x: 0,
    y: 0
  });
  pathA.addPoint({
    x: 1,
    y: 1
  });

  pathB.addPoint({
    x: 0,
    y: 0
  });
  pathB.addPoint({
    x: 0.2,
    y: 0.2
  });

  // Use two points on line perpendicular to pathA
  sketch.removePathsCloseToPoints({
    x: 0,
    y: 1
  }, {
    x: 1,
    y: 0
  });

  equal(-1, sketch.paths.indexOf(pathA));
  notEqual(-1, sketch.paths.indexOf(pathB));
});

test('videosketch.Sketch.clear', function () {
  var sketch = new videosketch.Sketch();
  var pathA = sketch.createPath({
    color: 'red',
    width: 2
  });
  var pathB = sketch.createPath({
    color: 'blue',
    width: 4
  });

  sketch.clear();

  equal(-1, sketch.paths.indexOf(pathA));
  equal(-1, sketch.paths.indexOf(pathB));
});