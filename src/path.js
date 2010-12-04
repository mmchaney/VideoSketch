
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