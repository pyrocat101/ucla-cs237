"use strict";

// Special pattern -------------------------------------------------------------

var _ = {};

function Predicate(f) {
  this.pred = f;
}

function Many(pat) {
  this.pat = pat;
}

function when(f) {
  return new Predicate(f);
}

function many(p) {
  return new Many(p);
}

// Predicates ------------------------------------------------------------------

function isNull(o) {
  return o === null;
}

var isArray = Array.isArray;


function isWildcard(o) {
  return o === _;
}

function isPredicate(o) {
  return o instanceof Predicate;
}

function isMany(o) {
  return o instanceof Many;
}

// Utilities -------------------------------------------------------------------

function appendMatch(matched, x) {
  matched.push(x);
  return matched;
}

// Pattern match ---------------------------------------------------------------

function match(value /* , pat1, fun1, pat2, fun2, ... */) {
  var clauses = Array.prototype.slice.call(arguments, 1);

  if (clauses.length % 2 !== 0) {
    throw new Error("invalid syntax");
  }

  for (var i = 0; i < clauses.length; i += 2) {
    var pat = clauses[i],
        act = clauses[i + 1],
        matched = matchPattern(value, pat, []);
    if (!isNull(matched)) {
      return act.apply(null, matched);
    }
  }
  throw new Error("match failed");
}

function matchPattern(value, pattern, matched) {
  if (isWildcard(pattern)) {
    // wildcard
    return appendMatch(matched, value);
  } else if (isPredicate(pattern)) {
    // when
    return pattern.pred(value) ? appendMatch(matched, value) : null;
  } else if (isArray(pattern) && isArray(value)) {
    // array
    return matchArray(pattern, value, matched);
  } else {
    // literal
    return pattern === value ? matched : null;
  }
}

function matchArray(patterns, values, matched) {
  var i = 0, j = 0;
  while (true) {
    if (i === patterns.length || j === values.length) {
      return i === patterns.length && j === values.length ? matched : null;
    } else if (isMany(patterns[i])) {
      // many
      // greedy match without backtracking (and alweays succeed)
      var pat = patterns[i].pat;
      var manyMatched = [];
      while (true) {
        if (j === values.length) {
          // match to the end of value array
          i++;
          break;
        } else {
          var m = matchPattern(values[j], pat, manyMatched);
          if (isNull(m)) {
            // match failed
            i++;
            break;
          }
          j++;
        }
      }
      return appendMatch(matched, manyMatched);
    } else {
      matched = matchPattern(values[j], patterns[i], matched);
      if (isNull(matched)) {
        return null;
      }
      i++, j++;
    }
  }
}
