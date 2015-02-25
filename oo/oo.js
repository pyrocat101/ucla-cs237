// TODO: use lodash predicates!
'use strict';

// Predicates ------------------------------------------------------------------

function isNull(o) {
  return o === null;
}

var isArray = Array.isArray;

function isReturn(o) {
  return isArray(o) && o.length > 0 && o[0] === 'return';
}


// Multiline -------------------------------------------------------------------

var reComments = /\/\*!?(?:\@preserve)?[ \t]*(?:\r\n|\n)([\s\S]*?)(?:\r\n|\n)[ \t]*\*\//
function multiline (fn) {
  var match = reComments.exec(fn.toString());
  return match[1];
}


// Collection ------------------------------------------------------------------

var StringSet = function (xs) {
  if (Array.isArray(xs)) {
    xs.forEach(this.add.bind(this));
  }
};

StringSet.prototype.length = function () {
  return Object.keys(this).length;
};

StringSet.prototype.add = function (x) {
  this[x] = undefined;
};

StringSet.prototype.remove = function (x) {
  delete this[x];
};

StringSet.prototype.contains = function (x) {
  return this.hasOwnProperty(x);
};

StringSet.union = function (xs, ys) {
  var s = new StringSet();
  Object.keys(xs).forEach(s.add.bind(s));
  Object.keys(ys).forEach(s.add.bind(s));
  return s;
};

StringSet.intersect = function (xs, ys) {
  var s = new StringSet();
  Object.keys(xs).forEach(function (x) {
    if (ys.contains(x)) s.add(x);
  });
  return s;
};


// Ruby/Smalltalk style object model -------------------------------------------

var OO = {};

var Class = function (superClass, attrs) {
  this.__super__ = superClass;
  this.__attrs__ = new StringSet(attrs);
  this.__meths__ = {};
  if (superClass instanceof Class) {
    if (StringSet.intersect(this.__attrs__, superClass.__attrs__).length > 0) {
      throw new Error("duplicate instance variable declaration");
    }
    this.__attrs__ = StringSet.union(this.__attrs__, superClass.__attrs__);
  }
};

Class.prototype.hasMethod = function (name) {
  return this.__meths__.hasOwnProperty(name);
};

Class.prototype.addMethod = function (selector, fn) {
  this.__meths__[selector] = fn;
};

Class.prototype.getMethod = function (selector) {
  return this.__meths__[selector];
};

Class.prototype.hasAttr = function (name) {
  return this.__attrs__.contains(name);
};

Class.prototype.getSuper = function () {
  return this.__super__;
};

OO.initializeCT = function () {
  this.initObject();
  this.initNumber();
  this.initNull();
  this.initBoolean();
  this.initSingleton();
  this.initBlock();
};

OO.initObject = function () {
  this.classes = {
    Object: new Class(null, []),
  };
  this.declareMethod('Object', 'initialize', function () {});
  this.declareMethod('Object', 'isNumber', function () { return false; });
  this.declareMethod('Object', '===', function (_this, other) {
    return _this === other;
  });
  this.declareMethod('Object', '!==', function (_this, other) {
    return _this !== other;
  });
};

OO.declareClass = function (name, superClassName, instVarNames) {
  if (this.hasClass(name)) {
    throw new Error("duplicate class declaration");
  }
  var superClass = this.getClass(superClassName);
  this.classes[name] = new Class(superClass, instVarNames);
};

OO.declareMethod = function (className, selector, implFn) {
  var cls = this.getClass(className);
  if (cls.hasMethod(selector)) {
    throw new Error("duplicate method declaration");
  }
  cls.addMethod(selector, implFn);
};

OO.instantiate = function (className) {
  var cls = this.getClass(className);
  var args = Array.prototype.slice.call(arguments, 1);
  var o = Object.create(null);
  o.__class__ = cls;
  this._send(cls, 'initialize', o, args);
  return o;
};

OO._send = function (cls, selector, recv, args) {
  while (cls !== null) {
    if (cls.hasMethod(selector)) {
      var fn = cls.getMethod(selector);
      return fn.bind(null, recv).apply(null, args);
    }
    cls = cls.getSuper();
  }
  throw new Error("message not understood: " + selector);
};

OO.send = function (recv, selector) {
  recv = this.box(recv);
  var args = Array.prototype.slice.call(arguments, 2);
  return this._send(this.classOf(recv), selector, recv, args);
};

OO.superSend = function (superClassName, recv, selector) {
  recv = this.box(recv);
  var cls = this.getClass(superClassName);
  var args = Array.prototype.slice.call(arguments, 3);
  return this._send(cls, selector, recv, args);
};

OO.hasInstVar = function (recv, instVarName) {
  return this.classOf(recv).hasAttr(instVarName);
};

OO.getInstVar = function (recv, instVarName) {
  if (!this.hasInstVar(recv, instVarName)) {
    throw new Error("undeclared instance variable");
  }
  return recv[instVarName];
};

OO.setInstVar = function (recv, instVarName, value) {
  if (!this.hasInstVar(recv, instVarName)) {
    throw new Error("undeclared instance variable");
  }
  recv[instVarName] = value;
};

OO.hasClass = function (name) {
  return this.classes.hasOwnProperty(name);
};

OO.getClass = function (name) {
  return this.classes[name];
};

OO.classOf = function (o) {
  return o.__class__;
};


// Non-local Return ------------------------------------------------------------

function Return() {
}

Return.prototype = Error.prototype;


// Singletons ------------------------------------------------------------------

OO.singletons = {};

OO.initSingleton = function () {
  this.singletons.Null = this.instantiate('Null');
  this.singletons.True = this.instantiate('True');
  this.singletons.False = this.instantiate('False');
};


// Boxing ----------------------------------------------------------------------

OO.box = function (x) {
  if (typeof x === 'number') {
    return this.instantiate('Number', x);
  } else if (x === true) {
    return this.singletons.True;
  } else if (x === false) {
    return this.singletons.False;
  } else if (isNull(x)) {
    return this.singletons.Null;
  }
  return x;
};


// Number ----------------------------------------------------------------------

var numOps = {
  '+': function (x, y) { return x + y; },
  '-': function (x, y) { return x - y; },
  '*': function (x, y) { return x * y; },
  '/': function (x, y) { return x / y; },
  '%': function (x, y) { return x % y; },
  '<': function (x, y) { return x < y; },
  '>': function (x, y) { return x > y; },
  '<=': function (x, y) { return x <= y; },
  '>=': function (x, y) { return x >= y; },
  '===': function (x, y) { return x === y; },
  '!==': function (x, y) { return x !== y; },
};

var mkNumOpFn = function (fn) {
  return function (_this, other) {
    var x = OO.getInstVar(_this, 'value');
    var y = typeof other === 'number' ? other : OO.getInstVar(other, 'value');
    return fn(x, y);
  };
};

OO.initNumber = function () {
  this.declareClass('Number', 'Object', ['value']);
  this.declareMethod('Number', 'initialize', function (_this, x) {
    OO.setInstVar(_this, 'value', x);
  });
  this.declareMethod('Number', 'isNumber', function () { return true; });
  for (var op in numOps) {
    if (numOps.hasOwnProperty(op)) {
      this.declareMethod('Number', op, mkNumOpFn(numOps[op]));
    }
  }
};


// Null ------------------------------------------------------------------------

OO.initNull = function () {
  this.declareClass('Null', 'Object');
};


// Boolean ---------------------------------------------------------------------

OO.initBoolean = function () {
  this.declareClass('Boolean', 'Object');
  this.declareClass('True', 'Boolean');
  this.declareClass('False', 'Boolean');
};


// Block -----------------------------------------------------------------------

OO.initBlock = function () {
  this.declareClass('Block', 'Object', ['fn']);
  this.declareMethod('Block', 'initialize', function (_this, fn) {
    OO.setInstVar(_this, 'fn', fn);
  });
  this.declareMethod('Block', 'call', function (_this) {
    var fn = OO.getInstVar(_this, 'fn');
    var args = Array.prototype.slice.call(arguments, 1);
    return fn.call(null, args);
  });
};


// Pattern Match ---------------------------------------------------------------

var PM = (function () {
  var _ = {};

  function isWildcard(o) {
    return o === _;
  }

  function isPredicate(o) {
    return o instanceof Predicate;
  }

  function isMany(o) {
    return o instanceof Many;
  }

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

  function appendMatch(matched, x) {
    matched.push(x);
    return matched;
  }

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
      if (i === patterns.length) {
        return j === values.length ? matched : null;
      } else if (j === values.length) {
        // all many()
        while (i < patterns.length) {
          if (!isMany(patterns[i])) {
            return null;
          }
          appendMatch(matched, []);
          i++;
        }
        return matched;
      } else if (isMany(patterns[i])) {
        // many
        // greedy match without backtracking (and always succeed)
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
        i++;
        j++;
      }
    }
  }

  return {
    _: _,
    many: many,
    when: when,
    match: match,
  };

})();

var _ = PM._,
    many = PM.many,
    when = PM.when,
    match = PM.match;


// Quick & Dirty Template ------------------------------------------------------

var template = function (tpl, locals) {
    var match;
    var re = /#{([^}]+)?}/g;
    var replaces = {};
    while ((match = re.exec(tpl))) {
      replaces[match[0]] = locals[match[1]];
    }
    for (var v in replaces) {
      tpl = tpl.replace(v, replaces[v]);
    }
    return tpl;
};


// Tranlation ------------------------------------------------------------------

/* global O */
O.transAST = function(ast) {
  var js = "";
  js += "OO.initializeCT();\n\n";
  js += O.translate(ast);
  return js;
};

O.translate = function (ast) {

  return match(ast,
    ['program', many(_)], O.translateStmts,
    ['classDecl', _, _, [many(_)]], O.translateClassDecl,
    ['methodDecl', _, _, [many(_)], [many(_)]], O.translateMethodDecl,
    ['varDecls', many([_, _])], O.translateVarDecls,
    ['return', _], O.translateReturn,
    ['setVar', _, _], O.translateSetVar,
    ['setInstVar', _, _], O.translateSetInstVar,
    ['exprStmt', _], O.translateExprStmt,
    ['null'], O.translateNull,
    ['true'], O.translateTrue,
    ['false'], O.translateFalse,
    ['number', _], O.translateNumber,
    ['getVar', _], O.translateGetVar,
    ['getInstVar', _], O.translateGetInstVar,
    ["new", _, many(_)], O.translateNew,
    ['send', _, _, many(_)], O.translateSend,
    ['super', _, many(_)], O.translateSuperSend,
    ['block', [many(_)], [many(_)]], O.translateBlock,
    ['this'], O.translateThis
  );
};

O.translateStmts = function (stmts) {
  return stmts.map(function (s) {
    return O.translate(s) + ';';
  }).join('\n');
};

O.translateClassDecl = function (name, superName, instVars) {
  instVars = instVars.map(function (v) { return '"' + v + '"'; });
  return template('OO.declareClass("#{name}", "#{superName}", [#{instVars}])', {
    name: name,
    superName: superName,
    instVars: instVars.join(', '),
  });
};

O.translateMethodDecl = function (cls, sel, params, body) {
  body = O.translateStmts(body);
  var tpl = multiline(function () {/*
    OO.declareMethod("#{cls}", "#{sel}", function (_this#{rest}) {
      var __return__ = new Return();
      var __rr__;
      try {
        #{body}
      } catch (e) {
        if (e === __return__) {
          return __rr__;
        } else {
          throw e;
        }
      }
    });
  */});
  return template(tpl, {
    cls: cls,
    sel: sel,
    rest: params.map(function (p) { return ', ' + p; }).join(''),
    body: body,
  });
};

O.translateVarDecls = function (bindings) {
  var lhs, rhs;
  var decls = [];
  for (var i = 0; i < bindings.length; i += 2) {
    lhs = bindings[i];
    rhs = bindings[i + 1];
    rhs = O.translate(rhs);
    decls.push(template('#{lhs} = #{rhs}', {lhs: lhs, rhs: rhs}));
  }
  return 'var ' + decls.join(',\n');
};

O.translateReturn = function (ret) {
  var tpl = multiline(function () {/*
    __rr__ = #{ret};
    throw __return__;
  */});
  return template(tpl, {ret: O.translate(ret)});
};

O.translateSetVar = function (lhs, rhs) {
  return template('#{lhs} = #{rhs}', {
    lhs: lhs,
    rhs: O.translate(rhs),
  });
};

O.translateSetInstVar = function (sel, rhs) {
  return template('_this.#{sel} = #{rhs}', {
    sel: sel,
    rhs: O.translate(rhs),
  });
};

O.translateExprStmt = function (expr) {
  return O.translate(expr);
};

O.translateNull = function () {
  return 'OO.singletons.Null';
};

O.translateTrue = function () {
  return 'OO.singletons.True';
};

O.translateFalse = function () {
  return 'OO.singletons.False';
};

O.translateNumber = function (num) {
  return num;
};

O.translateGetVar = function (sel) {
  return sel;
};

O.translateGetInstVar = function (sel) {
  return '_this.' + sel;
};

O.translateNew = function (name, args) {
  return template('OO.instantiate("#{name}"#{rest})', {
    name: name,
    rest: args.map(function (a) { return ', ' + O.translate(a); }).join(''),
  });
};

O.translateSend = function (recv, sel, args) {
  return template('OO.send(#{recv}, "#{sel}"#{rest})', {
    recv: O.translate(recv),
    sel: sel,
    rest: args.map(function (a) { return ', ' + O.translate(a); }).join(''),
  });
};

O.translateSuperSend = function (sel, args) {
  return template('OO._send(OO.classOf(_this).getSuper(), "#{sel}", _this, [#{args}])', {
    sel: sel,
    args: args.map(O.translate).join(', '),
  });
};

O.translateBlock = function (params, body) {
  var block = [];
  if (body.length > 0) {
    for (var i = 0; i < block.length - 1; i++) {
      block.push(O.translate(body[i]) + ';');
    }
    var last = body[body.length - 1];
    if (!isReturn(last)) {
      block.push('return ' + O.translate(last) + ';');
    } else {
      block.push(O.translate(last) + ';');
    }
  }
  return template('OO.instantiate("Block", function (#{params}) {\n#{body}\n})', {
    params: params.join(', '),
    body: block.join('\n'),
  });
};

O.translateThis = function () {
  return '_this';
};
