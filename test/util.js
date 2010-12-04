module("util.js");

test('Element.prototype.classList', function () {
  var element = document.createElement('div');

  element.classList.add('test');
  equal('test', element.className);

  element.classList.add('test2');
  element.classList.remove('test');
  equal('test2', element.className);

  ok(!element.classList.contains('test'));
  ok(element.classList.contains('test2'));

  element.classList.toggle('test2');
  ok(!element.classList.contains('test2'));
});

test('videosketch.util.makeElement', function () {
  var el = videosketch.util.makeElement('div');

  equals(el.nodeType, 1);
  equals(el.tagName.toLowerCase(), 'div');

  el = videosketch.util.makeElement('p', {
    'class': 'paragraph',
    'title': 'woot'
  });

  equals(el.className, 'paragraph');
  equals(el.getAttribute('title'), 'woot');
});

test('Function.prototype.bind', function () {
  var fixture = document.querySelector('#qunit-fixture');  
  fixture.classList.remove('red');
  fixture.classList.remove('blue');
  fixture.classList.remove('orange');

  var obj = {
    color: 'blue',
    test: function () {
      fixture.classList.add(this.color);
    },
    test2: function (value) {
      fixture.classList.add(value);
    }
  };
  
  var boundTest = obj.test.bind(obj);
  var boundTest2 = obj.test2.bind(obj, 'orange');
  
  fixture.addEventListener('click', boundTest, false);
  click(fixture);
  
  ok(fixture.classList.contains('blue'));
  
  obj.color = 'red';
  
  click(fixture);
  
  ok(fixture.classList.contains('red'));
  
  fixture.classList.remove('red');
  fixture.classList.remove('blue');        
  
  fixture.removeEventListener('click', boundTest, false);
  
  fixture.addEventListener('click', boundTest2, false);
  click(fixture);
  
  ok(fixture.classList.contains('orange'));
  ok(!fixture.classList.contains('red'));
  ok(!fixture.classList.contains('blue'));
});

test('videosketch.util.delegate', function () {
  var delegate = videosketch.util.delegate;
  var fixture = document.querySelector('#qunit-fixture');
  var counter = 0,
      textContent = '';

  fixture.innerHTML = '<span class="yep">yep</span><span></span><span class="nope" id="nope">nope</span>';

  var yep = fixture.querySelector('.yep');
  var nope = fixture.querySelector('.nope');

  delegate(document.body, '#qunit-fixture', 'click', function () {
    counter++
  });
  delegate(fixture, 'span.yep', 'click', function () {
    equal(this, yep);
    textContent = this.textContent;
    counter++
  });

  click(fixture);
  equal(1, counter);

  click(yep);
  equal(3, counter);
  equal('yep', textContent);

  click(nope);
  equal(4, counter);
});

asyncTest('videosketch.util.localCoordinates without scroll', function () {
  var localCoordinates = videosketch.util.localCoordinates;

  var forceScroll = videosketch.util.makeElement('div');
  forceScroll.style.cssText = 'width: 5000px; height: 5000px; position: absolute; top: 20px; left: 10px;';
  document.body.appendChild(forceScroll);

  forceScroll.addEventListener('click', function (event) {
    var pos = localCoordinates(event);
    equal(0, pos.x);
    equal(0, pos.y);
    start();
    document.body.removeChild(forceScroll);
  }, false);

  click(forceScroll, 10, 20);

});

asyncTest('videosketch.util.localCoordinates with scroll', function () {
  var localCoordinates = videosketch.util.localCoordinates;

  var forceScroll = videosketch.util.makeElement('div');
  forceScroll.style.cssText = 'width: 5000px; height: 5000px; position: absolute; top: 20px; left: 10px;';
  document.body.appendChild(forceScroll);
  window.scrollTo(10, 10);

  // Sanity check
  equal(10, window.pageXOffset, 'pageXOffset correctness');
  equal(10, window.pageYOffset, 'pageYOffset correctness');

  forceScroll.addEventListener('click', function (event) {
    var pos = localCoordinates(event);
    equal(10 / 5000, pos.x);
    equal(10 / 5000, pos.y);
    start();
    document.body.removeChild(forceScroll);
  }, false);

  click(forceScroll, 10, 20);

});

test('videosketch.util.makeEventSource', function () {
  var makeEventSource = videosketch.util.makeEventSource;
  var result = 0;

  var objA = {
    a: 2,
    test: function (value) {
      result += value + this.a;
    }
  };

  var objB = {};

  var objC = {
    a: 4,
    test: function (value) {
      result += value + this.a;
    }
  };

  makeEventSource(objB);

  ok(typeof objB.bind == 'function');
  ok(typeof objB.unbind == 'function');
  ok(typeof objB.trigger == 'function');

  var boundA = objA.test.bind(objA);
  var boundC = objC.test.bind(objC);

  objB.bind('event', boundA);
  objB.bind('event', boundC);
  objB.trigger('event', 2);

  equal(10, result);

  objB.unbind('event', boundA);
  objB.trigger('event', 42);

  equal(56, result);
});