var OO = {};

(function (OO) {
"use strict";

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


// Number ----------------------------------------------------------------------

var numOps = {
  '+': function (x, y) { return x + y; },
  '-': function (x, y) { return x - y; },
  '*': function (x, y) { return x * y; },
  '/': function (x, y) { return x / y; },
  '%': function (x, y) { return x % y; },
  '===': function (x, y) { return x === y; },
  '!==': function (x, y) { return x !== y; },
};

var mkNumOpFn = function (op) {
  return function (_this, other) {
    var x = OO.getInstVar(_this, 'value');
    var y = typeof other === 'number' ? other : OO.getInstVar(other, 'value');
    return numOps[op](x, y);
  };
};


// Ruby/Smalltalk style object model -------------------------------------------

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
  this.initBox();
};

OO.initBox = function () {
  // number
  this.declareClass('Number', 'Object', ['value']);
  this.declareMethod('Number', 'initialize', function (_this, x) {
    OO.setInstVar(_this, 'value', x);
  });
  this.declareMethod('Number', 'isNumber', function () { return true; });
  this.declareMethod('Number', '+', mkNumOpFn('+'));
  this.declareMethod('Number', '-', mkNumOpFn('-'));
  this.declareMethod('Number', '*', mkNumOpFn('*'));
  this.declareMethod('Number', '/', mkNumOpFn('/'));
  this.declareMethod('Number', '%', mkNumOpFn('%'));
  this.declareMethod('Number', '===', mkNumOpFn('==='));
  this.declareMethod('Number', '!==', mkNumOpFn('!=='));
};

OO.unboxedTypes = {
  'number': 'Number',
};

OO.box = function (x) {
  var type = typeof x;
  if (this.unboxedTypes.hasOwnProperty(type)) {
    return this.instantiate(this.unboxedTypes[type], x);
  }
  return x;
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

})(OO);
