'use strict';

// Type predicates -------------------------------------------------------------

var numberTag = '[object Number]',
    boolTag = '[object Boolean]';

var objectProto = Object.prototype,
    objToString = objectProto.toString;

function isObjectLike(value) {
  return (value && typeof value == 'object') || false;
}

function isNumber(value) {
  return typeof value == 'number' || (isObjectLike(value) && objToString.call(value) == numberTag) || false;
}

function isBoolean(value) {
  return (value === true || value === false || isObjectLike(value) && objToString.call(value) == boolTag) || false;
}

function isNull(value) {
  return value === null;
}

function isAtom(value) {
  return isNull(value) || isBoolean(value) || isNumber(value);
}

var isArray = Array.isArray;

function isClosure(value) {
  return isArray(value) && value.length > 0 && value[0] === 'closure' || false;
}

// Variable bindings -----------------------------------------------------------

var Env = function (name, value, enclose) {
  this.name = name;
  this.value = value;
  this.enclose = enclose;
}
Env.empty = new Env(null, null, null);

Env.prototype.put = function (name, value) {
  return new Env(name, value, this)
}

Env.prototype.get = function (name, value) {
  var env = this;
  while (env !== Env.empty) {
    if (env.name === name) {
      return env.value
    } else {
      env = env.enclose;
    }
  }
  throw new Error("KeyError: " + name);
}

// Evaluation ------------------------------------------------------------------

function makeClosure(params, body, env) {
  return ['closure', params, body, env];
}

var operators = {
  '+': function (x, y) { return x + y; },
  '-': function (x, y) { return x - y; },
  '*': function (x, y) { return x * y; },
  '/': function (x, y) { return x / y; },
  '%': function (x, y) { return x % y; },
  '<': function (x, y) { return x < y; },
  '>': function (x, y) { return x > y; },
  '=': function (x, y) { return x === y; },
  '!=': function (x, y) { return x !== y; },
}

function numericOp(ast, env) {
  var op = operators[ast[0]],
      x = evalML(env)(ast[1]),
      y = evalML(env)(ast[2]);
  if (isNumber(x) && isNumber(y)) {
    return op(x, y);
  } else {
    throw new Error("TypeError: unsupported operand type for " + op + ": " + typeof x + " and " + typeof y);
  }
}

function generalOp(ast, env) {
  var op = operators[ast[0]],
      x = evalML(env)(ast[1]),
      y = evalML(env)(ast[2]);
  return op(x, y);
}

function evalToBoolean(ast, env, op) {
  var value = evalML(env)(ast);
  if (!isBoolean(value)) {
    throw new Error("TypeError: unsupported operand type for " + op + ": " + typeof value);
  } else {
    return value;
  }
}

var evaluators = {
  // ['id', x]
  'id': function (ast, env) {
    var name = ast[1];
    return env.get(name);
  },
  // ['fun', [x1, x2, ...], e]
  'fun': function (ast, env) {
    var params = ast[1],
        body = ast[2];
    return makeClosure(params, body, env);
  },
  // ['call', ef, e1, e2, ...]
  'call': function (ast, env) {
    var callee = evalML(env)(ast[1]),
        args = ast.slice(2).map(evalML(env));
    if (!isClosure(callee)) {
      throw Error("TypeError: " + ast + " is not callable");
    }

    var params = callee[1],
        body = callee[2],
        env = callee[3];
    if (params.length !== args.length) {
      throw new Error("TypeError: function takes exactly "
                      + params.length + " "
                      + (params.length <= 1 ? "argument" : "arguments")
                      + " (" + args.length + " given)");
    }

    env = params.reduce(function (env, param, i) {
      return env.put(param, args[i]);
    }, env);
    return evalML(env)(body);
  },
  // ['let', x, e1, e2]
  'let': function (ast, env) {
    var name = ast[1],
        value = ast[2],
        body = ast[3];
    env = env.put(name, evalML(env)(value));
    return evalML(env)(body);
  },
  // ['if', e1, e2, e3]
  'if': function (ast, env) {
    var test = ast[1],
        thn = ast[2],
        els = ast[3];
    return evalML(env)(test) ? evalML(env)(thn) : evalML(env)(els);
  },
  // [op, e1, e2]
  '+': numericOp,
  '-': numericOp,
  '*': numericOp,
  '/': numericOp,
  '%': numericOp,
  '<': numericOp,
  '>': numericOp,
  '=': generalOp,
  '!=': generalOp,
  'and': function (ast, env) {
    var x = ast[1],
        y = ast[2];
    return evalToBoolean(x, env, "&&") && evalToBoolean(y, env, "&&");
  },
  'or': function (ast, env) {
    var x = ast[1],
        y = ast[2];
    return evalToBoolean(x, env, "||") || evalToBoolean(y, env, "||");
  },
}

function evalML(env) {
  return function (ast) {
    if (isAtom(ast)) {
      return ast;
    } else if (isArray(ast)) {
      return evaluators[ast[0]](ast, env);
    } else {
      throw new Error("TypeError: " + ast + " is not evaluable");
    }
  };
}

// Prelude ---------------------------------------------------------------------

F.evalAST = function (ast) {
  var env = Env.empty;
  return evalML(env)(ast);
};
