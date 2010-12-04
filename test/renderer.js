module("renderer.js");

test('videosketch.Renderer.constructor', function () {
  var Renderer = videosketch.Renderer;
  var fixture = document.querySelector('#qunit-fixture');
  var width = 20,
      height = 40;

  var renderer = new Renderer({
    parent: fixture,
    'class': 'test',
    width: width,
    height: height
  });

  equal(1, fixture.querySelectorAll('.test').length);

  var firstCanvas = fixture.querySelectorAll('canvas')[0];
  var secondCanvas = fixture.querySelectorAll('canvas')[1];

  notEqual(undefined, firstCanvas);
  notEqual(undefined, secondCanvas);

  equal(width, firstCanvas.width);
  equal(width, secondCanvas.width);

  equal(height, firstCanvas.height);
  equal(height, secondCanvas.height);

});

test('videosketch.Renderer.attach/detachSketch', function () {
  var Renderer = videosketch.Renderer;
  var fixture = document.querySelector('#qunit-fixture');
  var width = 20,
      height = 40;
  var hasDetached;

  var renderer = new Renderer({
    parent: fixture,
    'class': 'test',
    width: width,
    height: height
  });
  var sketchA = new videosketch.Sketch();
  var sketchB = new videosketch.Sketch();
  renderer.attachSketch(sketchA);

  equal(sketchA, renderer.sketch);

  hasDetached = renderer.detachSketch(sketchB);
  ok(!hasDetached);
  equal(sketchA, renderer.sketch);

  hasDetached = renderer.detachSketch(sketchA);
  ok(hasDetached);
  equal(undefined, renderer.sketch);

});

test('videosketch.Renderer.setCanvasSize', function () {
  var Renderer = videosketch.Renderer;
  var fixture = document.querySelector('#qunit-fixture');
  var width = 20,
      height = 40;

  var renderer = new Renderer({
    parent: fixture,
    'class': 'test',
    width: width,
    height: height
  });

  var firstCanvas = fixture.querySelectorAll('canvas')[0];
  var secondCanvas = fixture.querySelectorAll('canvas')[1];

  renderer.setCanvasSize(70, 80);

  equal(70, firstCanvas.width);
  equal(70, secondCanvas.width);

  equal(80, firstCanvas.height);
  equal(80, secondCanvas.height);
});

asyncTest('videosketch.Renderer.renderFrame', 1, function () {
  var fixture = document.querySelector('#qunit-fixture');
  var video = makeVideo();

  video.addEventListener('canplay', function () {
    var sketch = new videosketch.Sketch(this);
    var renderer = new videosketch.Renderer({
      parent: fixture,
      sketch: sketch
    });
    renderer.renderFrame();
    try { // for IE9
      var canvas = fixture.querySelectorAll('canvas')[0];
      var data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      notEqual(0, data[3]);
    } catch (e) {
      ok(false, 'Might not pass in file:// and IE9 due to: ' + e);
    };
    start();
  }, false);

  fixture.appendChild(video);

});

test('videosketch.Renderer.renderPath', 3, function () {
  var fixture = document.querySelector('#qunit-fixture');

  var sketch = new videosketch.Sketch();
  var renderer = new videosketch.Renderer({
    parent: fixture,
    sketch: sketch
  });

  var path = new videosketch.Path({
    color: '#ffffff',
    width: 24
  });
  path.addPoint({
    x: 0,
    y: 0
  });
  path.addPoint({
    x: 0.8,
    y: 0.2
  });
  path.addPoint({
    x: 1,
    y: 0.7
  });

  renderer.renderPath(path);
  try { // for IE9
    var data = fixture.querySelectorAll('canvas')[1].getContext('2d').getImageData(0, 0, 1, 1).data;
    // Check for white pixel in 0, 0
    equal(255, data[0]);
    equal(255, data[1]);
    equal(255, data[2]);
  } catch (e) {};


});

test('videosketch.Renderer.renderPaths', 6, function () {
  var fixture = document.querySelector('#qunit-fixture');

  var sketch = new videosketch.Sketch();
  var renderer = new videosketch.Renderer({
    parent: fixture,
    sketch: sketch
  });

  var pathA = sketch.createPath({
    color: '#ff0000',
    width: 24
  });
  pathA.addPoint({
    x: 0,
    y: 0
  });
  pathA.addPoint({
    x: 0.8,
    y: 0.2
  });
  pathA.addPoint({
    x: 0,
    y: 0
  });

  var pathB = sketch.createPath({
    color: '#ffffff',
    width: 24
  });
  pathB.addPoint({
    x: 0.5,
    y: 0.5
  });
  pathB.addPoint({
    x: 1,
    y: 0
  });
  pathB.addPoint({
    x: 1,
    y: 1
  });

  renderer.renderPaths();

  var canvas = fixture.querySelectorAll('canvas')[1];

  try { // for IE9
    var data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;

    equal(255, data[0], 'red: r');
    equal(0, data[1], 'red: g');
    equal(0, data[2], 'red: b');

    equal(255, data[data.length - 4], 'white: r');
    equal(255, data[data.length - 3], 'white: g');
    equal(255, data[data.length - 2], 'white: b');
  } catch (e) { };

});

test('videosketch.Renderer.normalizeContext', function () {
  var normalizeContext = videosketch.Renderer.normalizeContext;
  var canvasA = document.createElement('canvas');
  var canvasB = document.createElement('canvas');

  var width = 5;
  var height = 5;

  canvasA.width = canvasB.width = width;
  canvasA.height = canvasB.height = height;

  var contextA = canvasA.getContext('2d');
  var contextB = canvasB.getContext('2d');
  normalizeContext(contextB);

  contextA.beginPath();
  contextA.moveTo(width, 0);
  contextA.lineTo(0, height);
  contextA.quadraticCurveTo(width / 2, height / 2, width, height);
  contextA.stroke();

  contextB.beginPath();
  contextB.normalizedMoveTo(1, 0);
  contextB.normalizedLineTo(0, 1);
  contextB.normalizedQuadraticCurveTo(0.5, 0.5, 1, 1);
  contextB.stroke();

  var dataA = contextA.getImageData(0, 0, width, height).data;
  var dataB = contextB.getImageData(0, 0, width, height).data;

  for (var i = 0; i < dataA.length; i++) {
    equals(dataA[i], dataB[i]);
  }

});
/*
* FIXME: Leaving this test out for now as it's intermittently failing.
test('videosketch.Renderer.preserveAspectRatio', function () {
  var fixture = document.querySelector('#qunit-fixture');
  var fixtureWidth = 800;
  var fixtureHeight = 600;

  fixture.style.position = 'relative';
  fixture.style.width = fixtureWidth + 'px';
  fixture.style.height = fixtureHeight + 'px';

  var Renderer = videosketch.Renderer;

  var renderer = new Renderer({
    parent: fixture
  });

  renderer.setAspectRatio(16 / 9, true);
  var fixtureBox = fixture.getBoundingClientRect();
  var rendererBox = fixture.querySelector(':first-child').getBoundingClientRect();

  equal(fixtureBox.width, rendererBox.width);
  equal((fixtureBox.height - rendererBox.height) / 2, rendererBox.top - fixtureBox.top);
  equal((fixtureBox.height - rendererBox.height) / 2, fixtureBox.bottom - rendererBox.bottom);
  equal(fixtureBox.bottom - rendererBox.bottom + rendererBox.top - fixtureBox.top + rendererBox.height, fixtureBox.height);


  renderer.setAspectRatio(4 / 6, true);
  fixtureBox = renderer.container.parentNode.getBoundingClientRect();
  rendererBox = renderer.container.getBoundingClientRect();

  equal(fixtureBox.height, rendererBox.height);
  equal((fixtureBox.width - rendererBox.width) / 2, rendererBox.left - fixtureBox.left);
  equal((fixtureBox.width - rendererBox.width) / 2, fixtureBox.right - rendererBox.right);
});
*/