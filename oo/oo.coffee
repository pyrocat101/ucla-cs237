'use strict'

# Predicates -------------------------------------------------------------------

isTrue   = (o) -> o is true
isFalse  = (o) -> o is false
isNull   = (o) -> o is null
isArray  = (o) -> Array.isArray o
isNumber = (o) -> typeof o == 'number'


# Collection -------------------------------------------------------------------

class StringSet
  constructor: (xs) ->
    if isArray(xs)
      xs.forEach @add.bind(this)

  add: (x) ->
    @[x] = undefined

  remove: (x) ->
    delete @[x]

  contains: (x) ->
    @hasOwnProperty x

  length: ->
    Object.keys(this).length

  @union: (xs, ys) ->
    s = new StringSet
    Object.keys(xs).forEach s.add.bind(s)
    Object.keys(ys).forEach s.add.bind(s)
    s

  @intersect = (xs, ys) ->
    s = new StringSet
    Object.keys(xs).forEach (x) ->
      if ys.contains(x)
        s.add x
      return
    return s


# Object model -----------------------------------------------------------------

class MClass
  constructor: (superClass, attrs) ->
    @superClass = superClass
    @attrs = new StringSet(attrs)
    @methods = {}
    if superClass instanceof MClass
      if StringSet.intersect(@attrs, superClass.attrs).length > 0
        throw new Error('duplicate instance variable declaration')
      @attrs = StringSet.union(@attrs, superClass.attrs)

  hasMethod: (name) ->
    @methods.hasOwnProperty name

  addMethod: (selector, fn) ->
    @methods[selector] = fn

  getMethod: (selector) ->
    return @methods[selector]

  hasAttr: (name) ->
    return @attrs.contains name

  getSuperclass: ->
    return @superClass

class MObject
  constructor: (@klass) ->
    @vars = Object.create(null)

  setVar: (name, value) ->
    @vars[name] = value

  getVar: (name) ->
    return @vars[name]

  getClass: ->
    return @klass

  getEigen: ->
    return this

  getSuper: ->
    if @klass.getSuperclass() is null
      return null
    else
      return new MProxy(@klass.getSuperclass(), @getEigen())

class MProxy extends MObject
  constructor: (@klass, obj) ->
    @obj = obj
    @vars = obj.vars

  getEigen: ->
    return @obj


# Ruby/Smalltalk style object model --------------------------------------------

OO = {}

OO.initializeCT = ->
  @initObject()
  @initNumber()
  @initNull()
  @initBoolean()
  @initSingleton()
  @initBlock()

OO.initObject = ->
  @classes = Object: new MClass(null, [])
  @declareMethod 'Object', 'initialize', (->)
  @declareMethod 'Object', 'isNumber', (-> false)
  @declareMethod 'Object', '===', (_this, other) -> _this is other
  @declareMethod 'Object', '!==', (_this, other) -> _this isnt other

OO.declareClass = (name, superClassName, instVarNames) ->
  if @hasClass(name)
    throw new Error('duplicate class declaration')
  superClass = @getClass(superClassName)
  @classes[name] = new MClass(superClass, instVarNames)

OO.declareMethod = (className, selector, implFn) ->
  cls = @getClass(className)
  if cls.hasMethod(selector)
    throw new Error('duplicate method declaration')
  cls.addMethod selector, implFn

OO.instantiate = (className, args...) ->
  cls = @getClass(className)
  o = new MObject(cls)
  @_send o, 'initialize', args
  return o

OO._send = (recv, selector, args) ->
  while recv != null
    klass = recv.getClass()
    if klass.hasMethod(selector)
      fn = klass.getMethod(selector)
      return fn.bind(null, recv).apply(null, args)
    recv = recv.getSuper()
  throw new Error("message not understood: #{selector}")

OO.send = (recv, selector, args...) ->
  recv = @box(recv)
  @_send recv, selector, args

OO.superSend = (superClassName, recv, selector, args...) ->
  recv = @box(recv)
  recv = new MProxy(@getClass(superClassName), recv)
  @_send recv, selector, args

OO.hasInstVar = (recv, instVarName) ->
  @classOf(recv).hasAttr instVarName

OO.getInstVar = (recv, instVarName) ->
  if !@hasInstVar(recv, instVarName)
    throw new Error('undeclared instance variable')
  recv.getVar(instVarName)

OO.setInstVar = (recv, instVarName, value) ->
  unless @hasInstVar(recv, instVarName)
    throw new Error('undeclared instance variable')
  recv.setVar(instVarName, value)

OO.hasClass = (name) ->
  @classes.hasOwnProperty name

OO.getClass = (name) ->
  @classes[name]

OO.classOf = (o) ->
  o.getClass()

OO.getSuper = (o) ->
  o.getSuper()


# Singletons -------------------------------------------------------------------

OO.singletons = {}

OO.initSingleton = ->
  @singletons.Null  = @instantiate('Null')
  @singletons.True  = @instantiate('True')
  @singletons.False = @instantiate('False')


# Boxing -----------------------------------------------------------------------

OO.box = (x) ->
  switch
    when isNumber(x) then @instantiate('Number', x)
    when isTrue(x)   then @singletons.True
    when isFalse(x)  then @singletons.False
    when isNull(x)   then @singletons.Null
    else x


# Number -----------------------------------------------------------------------

numOps =
  '+'   : (x, y) -> x + y
  '-'   : (x, y) -> x - y
  '*'   : (x, y) -> x * y
  '/'   : (x, y) -> x / y
  '%'   : (x, y) -> x % y
  '<'   : (x, y) -> x < y
  '>'   : (x, y) -> x > y
  '<='  : (x, y) -> x <= y
  '>='  : (x, y) -> x >= y
  '===' : (x, y) -> x == y
  '!==' : (x, y) -> x != y

mkNumOpFn = (fn) ->
  (_this, other) ->
    x = OO.getInstVar(_this, 'value')
    y = if isNumber(other) then other else OO.getInstVar(other, 'value')
    fn x, y

OO.initNumber = ->
  @declareClass 'Number', 'Object', ['value']
  @declareMethod 'Number', 'initialize', (_this, x) ->
    OO.setInstVar _this, 'value', x
  @declareMethod 'Number', 'isNumber', -> true
  for own op, fn of numOps
    @declareMethod 'Number', op, mkNumOpFn(fn)


# Null ------------------------------------------------------------------------

OO.initNull = ->
  @declareClass 'Null', 'Object'


# Boolean ---------------------------------------------------------------------

OO.initBoolean = ->
  @declareClass 'Boolean', 'Object'
  @declareClass 'True', 'Boolean'
  @declareClass 'False', 'Boolean'


# Block ------------------------------------------------------------------------

OO.initBlock = ->
  @declareClass 'Block', 'Object', ['fn']
  @declareMethod 'Block', 'initialize', (_this, fn) ->
    OO.setInstVar _this, 'fn', fn
  @declareMethod 'Block', 'call', (_this, args...) ->
    fn = OO.getInstVar(_this, 'fn')
    fn.apply null, args


# Pattern Match ----------------------------------------------------------------

PM = do ->
  _ = {}

  isWildcard = (o) -> o == _
  isPredicate = (o) -> o instanceof Predicate
  isMany = (o) -> o instanceof Many

  class Predicate
    constructor: (@pred) ->

  class Many
    constructor: (@pat) ->

  guard = (f) -> new Predicate(f)
  many = (p) -> new Many(p)

  appendMatch = (matched, x) ->
    matched.push x
    matched

  match = (value) ->
    clauses = Array::slice.call(arguments, 1)
    if clauses.length % 2 != 0
      throw new Error('invalid syntax')
    i = 0
    while i < clauses.length
      pat = clauses[i]
      act = clauses[i + 1]
      matched = matchPattern(value, pat, [])
      if !isNull(matched)
        return act.apply(null, matched)
      i += 2
    throw new Error('match failed')
    return

  matchPattern = (value, pattern, matched) ->
    if isWildcard(pattern)
      # wildcard
      appendMatch matched, value
    else if isPredicate(pattern)
      # guard
      if pattern.pred(value) then appendMatch(matched, value) else null
    else if isArray(pattern) and isArray(value)
      # array
      matchArray pattern, value, matched
    else
      # literal
      if pattern == value then matched else null

  matchArray = (patterns, values, matched) ->
    i = 0
    j = 0
    loop
      if i == patterns.length
        return if j == values.length then matched else null
      else if j == values.length
        # all many()
        while i < patterns.length
          if !isMany(patterns[i])
            return null
          appendMatch matched, []
          i++
        return matched
      else if isMany(patterns[i])
        # many
        # greedy match without backtracking (and always succeed)
        pat = patterns[i].pat
        subMatched = []
        loop
          if j == values.length
            # match to the end of value array
            i++
            break
          else
            m = matchPattern(values[j], pat, subMatched)
            if isNull(m)
              # match failed
              i++
              break
            j++
        matched = appendMatch(matched, subMatched)
      else
        matched = matchPattern(values[j], patterns[i], matched)
        if isNull(matched)
          return null
        i++
        j++

  {_, many, guard, match}

{_, many, match} = PM


# Tranlation ------------------------------------------------------------------

O.stmtTags =
  'program': true
  'classDecl': true
  'methodDecl': true
  'varDecls': true
  'return': true
  'setVar': true
  'setInstVar': true

O.isStmt = (ast) ->
  O.stmtTags.hasOwnProperty ast[0]

O.transAST = (ast) ->
  """
  OO.initializeCT();
  #{O.translate ast}
  """

O.translate = (ast) ->
  match ast,
    ['program', many _],                      O.translateStmts
    ['classDecl', _, _, [many _]],            O.translateClassDecl
    ['methodDecl', _, _, [many _], [many _]], O.translateMethodDecl
    ['varDecls', many([_, _])],               O.translateVarDecls
    ['return', _],                            O.translateReturn
    ['setVar', _, _],                         O.translateSetVar
    ['setInstVar', _, _],                     O.translateSetInstVar
    ['exprStmt', _],                          O.translateExprStmt
    ['null'],                                 O.translateNull
    ['true'],                                 O.translateTrue
    ['false'],                                O.translateFalse
    ['number', _],                            O.translateNumber
    ['getVar', _],                            O.translateGetVar
    ['getInstVar', _],                        O.translateGetInstVar
    ["new", _, many _],                       O.translateNew
    ['send', _, _, many _],                   O.translateSend
    ['super', _, many _],                     O.translateSuperSend
    ['block', [many _], [many _]],            O.translateBlock
    ['this'],                                 O.translateThis

O.translateStmts = (stmts) ->
  stmts.map((s) -> "#{O.translate(s)};").join('\n')

O.translateClassDecl = (name, superName, instVars) ->
  instVars = instVars.map((v) -> "\"#{v}\"").join(', ')
  "OO.declareClass('#{name}', '#{superName}', [#{instVars}])"

O.translateMethodDecl = (cls, sel, params, body) ->
  body = O.translateStmts(body)
  params = ['_this'].concat(params).join(', ')
  """
  OO.declareMethod("#{cls}", "#{sel}", function (#{params}) {
    var __return__ = new Error();
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
  })
  """

O.translateVarDecls = (bindings) ->
  decls = []
  i = 0
  while i < bindings.length
    lhs = bindings[i]
    rhs = O.translate(bindings[i + 1])
    decls.push "#{lhs} = #{rhs}"
    i += 2
  "var #{decls.join(',\n')}"

O.translateReturn = (ret) ->
  """
  __rr__ = #{O.translate ret}
  throw __return__
  """

O.translateSetVar = (lhs, rhs) ->
  "#{lhs} = #{O.translate rhs}"

O.translateSetInstVar = (sel, rhs) ->
  "OO.setInstVar(_this, \"#{sel}\", #{O.translate rhs})"

O.translateExprStmt = (expr) ->
  O.translate expr

O.translateNull = -> 'OO.singletons.Null'
O.translateTrue = -> 'OO.singletons.True'
O.translateFalse = -> 'OO.singletons.False'
O.translateNumber = (num) -> num

O.translateGetVar = (sel) -> sel
O.translateGetInstVar = (sel) -> "OO.getInstVar(_this, \"#{sel}\")"
O.translateThis = -> '_this'

O.translateNew = (name, args) ->
  args = args.map (a) -> O.translate a
  args = ["\"#{name}\""].concat(args).join(', ')
  "OO.instantiate(#{args})"

O.translateSend = (recv, sel, args) ->
  recv = O.translate recv
  args = args.map (a) -> O.translate a
  args = ["\"#{sel}\""].concat(args).join(', ')
  "OO.send(#{recv}, #{args})"

O.translateSuperSend = (sel, args) ->
  args = args.map (a) -> O.translate a
  args = ["\"#{sel}\""].concat(args).join(', ')
  "OO.send(OO.getSuper(_this), #{args})"

O.translateBlock = (params, body) ->
  block = []
  if body.length > 0
    i = 0
    while i < body.length - 1
      block.push O.translate(body[i]) + ';'
      i++
    last = body[body.length - 1]
    if O.isStmt(last)
      block.push "#{O.translate(last)};"
    else
      block.push "return #{O.translate last};"
  params = params.join(', ')
  body = block.join('\n')
  """
  OO.instantiate('Block', function (#{params}) {
    #{body}
  })
  """
