// This function is used by the test harness to pretty-print values.
// Right now it doesn't handle undefined, functions, NaN, Number.POSITIVE_INFINITY, etc.
// Feel free to modify / extend it as you see fit.
// (FYI, pretty-printing is not used by our grading scripts.)

function prettyPrintValue(value) {
  return JSON.stringify(value);
}

// Helper functions used in the tests

function greaterThan(n) {
  return function(x) { return x > n; };
}

function isNumber(x) {
  return typeof x === 'number';
}

function isOne(x) {
	return x === 1;
}

// Tests!

tests(
  {
    name: 'wildcard',
    code: 'match(123,\n' +
          '  _, function(x) { return x + 2; }\n' +
          ')',
    expected: 125
  },
  {
    name: 'literal pattern',
    code: 'match(123,\n' +
          '  42,  function() { return "aaa"; },\n' +
          '  123, function() { return "bbb"; },\n' +
          '  444, function() { return "ccc"; }\n' +
          ')',
    expected: "bbb"
  },
  {
    name: 'array pattern',
    code: 'match(["+", 5, 7],\n' +
          '  ["+", _, _], function(x, y) { return x + y; }\n' +
          ')',
    expected: 12
  },
  {
    name: 'many',
    code: 'match(["sum", 1, 2, 3, 4],\n' +
          '  ["sum", many(when(isNumber))], function(ns) {\n' +
          '                                   return ns.reduce(function(x, y) { return x + y; });\n' +
          '                                 }\n' +
          ')',
    expected: 10
  },
  {
    name: 'many pairs',
    code: 'match([[1, 2], [3, 4], [5, 6]],\n' +
          '  [many([_, _])], function(pts) { return JSON.stringify(pts); }\n' +
          ')',
    expected: "[1,2,3,4,5,6]"
  },
  {
    name: 'when',
    code: 'match(5,\n' +
          '  when(greaterThan(8)), function(x) { return x + " is greater than 8"; },\n' +
          '  when(greaterThan(2)), function(x) { return x + " is greater than 2"; }\n' +
          ')',
    expected: "5 is greater than 2"
  },
  {
    name: 'first match wins',
    code: 'match(123,\n' +
          '  _,   function(x) { return x; },\n' +
          '  123, function()  { return 4; }\n' +
          ')',
    expected: 123
  },
  {
    name: 'match failed',
    code: 'match(3,\n' +
          '  1,   function() { return 1; },\n' +
          '  2,   function() { return 2; },\n' +
          '  [3], function() { return 3; }\n' +
          ')',
    shouldThrow: true
  },
  {
	  name: 'many 97',
	  code: 'match([1, 2, 3, "and", 4], [many(when(isNumber)), many(when(isNumber)), "and", _], ' + 
	    	'  function() { return JSON.stringify(arguments); })',
	  expected: '{"0":[1,2,3],"1":[],"2":4}'
  },
  {
	  name: 'many 99',
	  code: 'match( [[3,[4,5]], [3,[7,8]]],' + 
          	'  [many([_,[many(4),many(7),_]])],' + 
          	'  function (xs) { return JSON.stringify(xs);})',
      expected: "[3,[],[],5,3,[],[],8]"
  },
  {
	  name: 'many 98_1',
	  code: 'match([1,2,3], [many(_)], function() { return JSON.stringify(arguments); })',
	  expected: '{"0":[1,2,3]}'
  },
  {
	  name: 'many 98_2',
	  code: 'match([1,2,3], [many(when(isOne)),many(_)], function() { return JSON.stringify(arguments); })',
	  expected: '{"0":[1],"1":[2,3]}'
  },
  {
	  name: 'many 98_3',
	  code: 'match([2,2,3], [many(when(isOne)),many(_)], function() { return JSON.stringify(arguments); })',
	  expected: '{"0":[],"1":[2,2,3]}'
  },
  {
	  name: 'many 98_4',
	  code: 'match([1,2,3], [many(when(isOne)),2,many(_)], function() { return JSON.stringify(arguments); })',
	  expected: '{"0":[1],"1":[3]}'
  },
  {
	  name: 'many 98_5',
	  code: 'match([[1,2],[3,4]], [many([many(_)])], function() { return JSON.stringify(arguments); })',
	  expected: '{"0":[[1,2],[3,4]]}'
  },
  {
	  name: 'match failed test 1',
	  code: 'match(["+", 5], ["+", _, _], function(x, y) { return x + y; })',
	  shouldThrow: true
  },
  {
	  name: 'match failed test 2',
	  code: 'match(["+", 5, 7], ["+", _], function(x) { return x + 2; })',
	  shouldThrow: true
  },
  {
	  name: 'match failed test 3',
	  code: 'match([1, 2, 3, "and", 4], [many(_), "and", _], function(xs, x) { return 1; })',
	  shouldThrow: true
  },
  {
	  name: 'no value for many 1',
	  code: 'match([1, 2, 3], [many(when(isNumber)), many(when(isOne))], function() { return JSON.stringify(arguments); })',
	  expected: '{"0":[1,2,3],"1":[]}'
  },
  {
	  name: 'no value for many 2',
	  code: 'match([], [many(when(isNumber))], function() { return JSON.stringify(arguments); })',
	  expected: '{"0":[]}'
  },
  {
	  name: 'match example',
	  code: 'match([1, 2, 3, "and", 4], [many(when(isNumber)), "and", _], function(xs, x) { return xs[1] * 10 + x; })',
	  expected: 24
  },
  {
	  name: 'match test 1',
	  code: 'match([1, 2, 3, "and", 4], [many(when(isNumber)), "and"], function(xs) {return 1;}, [many(when(isNumber)), "and", _], function(xs, x) {return 2;})',
	  expected: 2
  },
  {
	  name: 'match test 2',
	  code: 'match([1, 2, 3, 4], [many(when(isNumber)), "and"], function(xs) {return 1;}, [many(when(isNumber))], function(xs) {return 2;})',
	  expected: 2
  }
);

