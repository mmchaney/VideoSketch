module("editor.js");

test('videosketch.Editor.states', function () {
  var fixture = document.querySelector('#qunit-fixture');
  var video = makeVideo();

  fixture.appendChild(video);

  var editor = new videosketch.Editor(video);

  equal('inactive', editor.state);
  ok(editor.inactive);
  ok(!fixture.classList.contains('vs-drawing'));
  ok(fixture.classList.contains('vs-inactive'));
  ok(!fixture.classList.contains('vs-erasing'));

  editor.drawing = true;
  ok(editor.drawing);
  ok(!editor.inactive);
  ok(!editor.erasing);
  equal('drawing', editor.state);
  ok(fixture.classList.contains('vs-drawing'));
  ok(!fixture.classList.contains('vs-inactive'));
  ok(!fixture.classList.contains('vs-erasing'));

  editor.erasing = true;
  ok(!editor.drawing);
  ok(!editor.inactive);
  ok(editor.erasing);
  equal('erasing', editor.state);
  ok(!fixture.classList.contains('vs-drawing'));
  ok(!fixture.classList.contains('vs-inactive'));
  ok(fixture.classList.contains('vs-erasing'));

  editor.erasing = false;
  ok(!editor.drawing);
  ok(editor.inactive);
  ok(!editor.erasing);
  equal('inactive', editor.state);
  ok(!fixture.classList.contains('vs-drawing'));
  ok(fixture.classList.contains('vs-inactive'));
  ok(!fixture.classList.contains('vs-erasing'));
});