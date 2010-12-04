module("path.js");

test('videosketch.Path.constructor', function () {
  var Path = videosketch.Path;

  var options = {
    color: '#ff12bb',
    width: 24
  };

  var path = new Path(options);

  equals(path.color, options.color);
  equals(path.width, options.width);

  path.addPoint({
    x: 0,
    y: 0
  });
  equals(1, path.points.length);

  path.addPoint({
    x: 1,
    y: 1
  });

  ok(path.isCloseToPoints({
    x: 0,
    y: 1
  }, {
    x: 1,
    y: 0
  }));
  ok(!path.isCloseToPoints({
    x: 0,
    y: 1
  }, {
    x: 0.5,
    y: 1
  }));
});

test('videosketch.Path.addPoint', function () {
  var Path = videosketch.Path;
  var path = new Path({
    color: '#ff12bb',
    width: 24
  });

  path.addPoint({
    x: 0,
    y: 0
  });
  equals(1, path.points.length);
});

test('videosketch.Path.isCloseToPoints', function () {
  var Path = videosketch.Path;
  var path = new Path({
    color: '#ff12bb',
    width: 24
  });

  path.addPoint({
    x: 0,
    y: 0
  });
  equals(1, path.points.length);

  path.addPoint({
    x: 1,
    y: 1
  });

  ok(path.isCloseToPoints({
    x: 0,
    y: 1
  }, {
    x: 1,
    y: 0
  }));
  ok(!path.isCloseToPoints({
    x: 0,
    y: 1
  }, {
    x: 0.5,
    y: 1
  }));
});

test('videosketch.Path.pointDistance', function () {
  var pointDistance = videosketch.Path.pointDistance;
  var distance = pointDistance({
    x: 30,
    y: 20
  }, {
    x: 100,
    y: 40
  });
  equal(10 * Math.sqrt(53), distance);
});

test('videosketch.Path.segmentsIntersect', function () {
  var segmentsIntersect = videosketch.Path.segmentsIntersect;
  ok(!videosketch.Path.segmentsIntersect({
    x: 12,
    y: 12
  }, {
    x: 25,
    y: 28
  }, {
    x: 30,
    y: 30
  }, {
    x: 70,
    y: 0
  }));
  ok(videosketch.Path.segmentsIntersect({
    x: 12,
    y: 12
  }, {
    x: 25,
    y: 28
  }, {
    x: 12,
    y: 25
  }, {
    x: 25,
    y: 12
  }));
});