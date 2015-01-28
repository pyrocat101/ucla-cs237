F.prettyPrintAST =
F.prettyPrintValue = function(node) {
  var ctxt = new IndentingOutputStream();
  ctxt.visited = [];
  ctxt.prettyPrint = prettyPrint;
  ctxt.prettyPrintList = prettyPrintList;
  ctxt.prettyPrint(node);
  return ctxt.contents();
}

function prettyPrint(node) {
  if (typeof node !== 'object' ||
      node === null ||
      node instanceof Number ||
      node instanceof String ||
      node instanceof Boolean) {
    this.write(JSON.stringify(node));
  } else if (node === undefined) {
    this.write("undefined");
  } else if (this.visited.indexOf(node) >= 0) {
    this.write('...');
  } else {
    if (node instanceof Array) {
      this.visited.push(node);
      var tag = node[0];
      prettyPrints[tag].apply(this, node.slice(1));
    } else {
      this.write(node.constructor.name);
      this.write(' { ');
      Object.keys(node).forEach((function(key, idx) {
        if (idx > 0) {
          this.write(", ");
        }
        this.prettyPrint(key);
        this.write(": ");
        this.prettyPrint(node[key]);
      }).bind(this));
      this.write(' }');
    }
  }
}

var prettyPrints = {};

prettyPrints.id = function(name) {
  this.write('["id", ');
  this.prettyPrint(name);
  this.write("]");
};

prettyPrints.fun = function(argNames, body) {
  this.indentFromHere();
  this.write('["fun", ');
  this.write("["); this.prettyPrintList(argNames); this.write("]");
  this.nl();
  this.prettyPrint(body);
  this.write("]");
  this.dedent();
};

prettyPrints.closure = function(argNames, body, env) {
  this.indentFromHere();
  this.write('["closure", ');
  this.write("["); this.prettyPrintList(argNames); this.write("]");
  this.nl();
  this.prettyPrint(body);
  this.write(",");
  this.nl();
  this.prettyPrint(env);
  this.write("]");
  this.dedent();
};

prettyPrints.call = function(fn /*, arg1, arg2, ... */) {
  this.write('["call"');
  for (var idx = 0; idx < arguments.length; idx++) {
    this.write(", ");
    this.prettyPrint(arguments[idx]);
  }
  this.write("]");
};

prettyPrints.let = function(x, e1, e2) {
  this.indentFromHere();
  this.write('["let", ');
  this.prettyPrint(x);
  this.write(",");
  this.nl();
  this.prettyPrint(e1);
  this.write(",");
  this.nl();
  this.prettyPrint(e2);
  this.write("]");
  this.dedent();
};

prettyPrints.if = function(cond, tb, fb) {
  this.indentFromHere();
  this.write('["if", ');
  this.prettyPrint(cond);
  this.write(",");
  this.nl();
  this.prettyPrint(tb);
  this.write(",");
  this.nl();
  this.prettyPrint(fb);
  this.write("]");
  this.dedent();
};

prettyPrints.delay = function(e) {
  this.write('["delay", ');
  this.prettyPrint(e);
  this.write("]");
};

prettyPrints.force = function(e) {
  this.write('["force", ');
  this.prettyPrint(e);
  this.write("]");
};

function prettyPrintBinop(op) {
  return function(x, y) {
    this.write("[");
    this.prettyPrint(op);
    this.write(", ");
    this.prettyPrint(x);
    this.write(", ");
    this.prettyPrint(y);
    this.write("]");
  };
}

prettyPrints['+'] = prettyPrintBinop('+');
prettyPrints['-'] = prettyPrintBinop('-');
prettyPrints['*'] = prettyPrintBinop('*');
prettyPrints['/'] = prettyPrintBinop('/');
prettyPrints['%'] = prettyPrintBinop('%');
prettyPrints['='] = prettyPrintBinop('=');
prettyPrints['<'] = prettyPrintBinop('<');
prettyPrints['>'] = prettyPrintBinop('>');
prettyPrints.and  = prettyPrintBinop('and');
prettyPrints.or   = prettyPrintBinop('or');

prettyPrints.cons = prettyPrintBinop('cons');

prettyPrints.match = function(e /*, p1, e1, p2, e2, ... */) {
  this.write('["match", ');
  this.prettyPrint(e);
  this.indent();
  for (var idx = 1; idx < arguments.length; idx += 2) {
    this.write(",");
    this.nl();
    var pat = arguments[idx];
    var exp = arguments[idx + 1];
    this.prettyPrint(pat);
    this.write(", /* -> */ ");
    this.prettyPrint(exp);
  }
  this.dedent();
  this.write("]");
};

prettyPrints._ = function() {
  this.write('["_"]');
};

prettyPrints.set = prettyPrintBinop('set');
prettyPrints.seq = prettyPrintBinop('seq');

prettyPrints.listComp = function(e, x, el, ep) {
  this.write('["listComp",');
  this.indent();
  this.nl();
  this.prettyPrint(e);
  this.write(",");
  this.nl();
  this.prettyPrint(x);
  this.write(", /* <- */ ");
  this.prettyPrint(el);
  if (ep) {
    this.write(",");
    this.nl();
    this.prettyPrint(ep);
  }
  this.dedent();
  this.write("]");
};

function prettyPrintList(xs) {
  for (var idx = 0; idx < xs.length; idx++) {
    if (idx > 0) {
      this.write(", ");
    }
    this.prettyPrint(xs[idx]);
  }
}

