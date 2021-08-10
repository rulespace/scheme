import { compileToConstructor, instance2dot } from 'rulespace';
import { SchemeParser, Sym, Pair } from './sexp-reader.js';

const spec = `

; ast
(rule [ast e] [$lit e _])
(rule [ast e] [$id e _])
(rule [ast e] [$lam e _])
(rule [ast e] [$let e _ _ _])
(rule [ast e] [$letrec e _ _ _])
(rule [ast e] [$if e _ _ _])
(rule [ast e] [$app e _])
; cons car cdr
(rule [ast e] [$cons e _ _])
(rule [ast e] [$car e _])
(rule [ast e] [$cdr e _])
; set!
(rule [ast e] [$set e _ _])
; set-cxr!
(rule [ast e] [$setcar e _ _])
(rule [ast e] [$setcdr e _ _])

;(rule [parent e p] [$let p e _ _])
(rule [parent e p] [$let p _ e _])
(rule [parent e p] [$let p _ _ e])
;(rule [parent e p] [$letrec p e _ _])
(rule [parent e p] [$letrec p _ e _])
(rule [parent e p] [$letrec p _ _ e])
(rule [parent e p] [$lam p e])
(rule [parent e p] [$app p e])
(rule [parent e p] [arg e p _])
(rule [parent e p] [$if p e _ _])
(rule [parent e p] [$if p _ e _])
(rule [parent e p] [$if p _ _ e])
; cons car cdr
(rule [parent e p] [$cons p e _])
(rule [parent e p] [$cons p _ e])
(rule [parent e p] [$car p e])
(rule [parent e p] [$cdr p e])
; set!
;(rule [parent e p] [$set p e _])
(rule [parent e p] [$set p _ e])
; set-cxr!
(rule [parent e p] [$setcar p e _])
(rule [parent e p] [$setcar p _ e])
(rule [parent e p] [$setcdr p e _])
(rule [parent e p] [$setcdr p _ e])

(rule [hasParent e] [parent e _])
(rule [astroot e] [ast e] (not [hasParent e]))

; state machine
(rule [reachable [state e 0]] [astroot e])
(rule [reachable s’] [reachable s] [step s s’])

(rule [steps s] [step s _])
(rule [final s] [reachable s] (not [steps s]))

; transition relation
(rule [step [state e κ] s’] [$lit e _] [reachable [state e κ]] [cont [state e κ] s’])
(rule [step [state e κ] s’] [$id e _] [reachable [state e κ]] [cont [state e κ] s’])
(rule [step [state e κ] s’] [$lam e _] [reachable [state e κ]] [cont [state e κ] s’])
(rule [step [state e κ] [state e_init κ]] [$let e _ e_init _] [reachable [state e κ]])
(rule [step [state e κ] [state e_init κ]] [$letrec e _ e_init _] [reachable [state e κ]])
(rule [step [state e κ] [state e_body [call e κ]]] [$app e e_rator] [reachable [state e κ]] [greval e_rator [state e κ] [obj e_lam _]] [$lam e_lam e_body])
(rule [step [state e κ] s’] [$app e e_rator] [reachable [state e κ]] [greval e_rator [state e κ] [prim _ _]] [cont [state e κ] s’])
(rule [step [state e κ] [state e_then κ]] [$if e e_cond e_then _] [reachable [state e κ]] [greval e_cond [state e κ] d] (!= d #f))
(rule [step [state e κ] [state e_else κ]] [$if e e_cond _ e_else] [reachable [state e κ]] [greval e_cond [state e κ] d] (= d #f))
; cons car cdr
(rule [step [state e κ] s’] [$cons e _ _] [reachable [state e κ]] [cont [state e κ] s’])
(rule [step [state e κ] s’] [$car e _ ] [reachable [state e κ]] [cont [state e κ] s’])
(rule [step [state e κ] s’] [$cdr e _ ] [reachable [state e κ]] [cont [state e κ] s’])
; set!
(rule [step [state e κ] s’] [$set e _ _] [reachable [state e κ]] [cont [state e κ] s’])
; set-cxr!
(rule [step [state e κ] s’] [$setcar e _ _] [reachable [state e κ]] [cont [state e κ] s’])
(rule [step [state e κ] s’] [$setcdr e _ _] [reachable [state e κ]] [cont [state e κ] s’])

(rule [cont [state e_init κ] [state e_body κ]] [$let p _ e_init e_body] [parent e p] [reachable [state e κ]])
(rule [cont [state e_init κ] [state e_body κ]] [$letrec p _ e_init e_body] [parent e p] [reachable [state e κ]])
(rule [cont [state e_body κ] s’] [$let p _ _ e_body] [parent e_body p] [reachable [state e_body κ]] [cont [state p κ] s’])
(rule [cont [state e_body κ] s’] [$letrec p _ _ e_body] [parent e_body p] [reachable [state e_body κ]] [cont [state p κ] s’])
(rule [cont [state e_then κ] s’] [$if p _ e_then _] [parent e_then p] [reachable [state e_then κ]] [cont [state p κ] s’])
(rule [cont [state e_else κ] s’] [$if p _ _ e_else] [parent e_else p] [reachable [state e_else κ]] [cont [state p κ] s’])
(rule [cont [state e_body κ] s’] [$lam p e_body] [parent e_body p] [step [state e_call κ_call] [state e_body κ]] [cont [state e_call κ_call] s’])
; cons car cdr
;(rule [cont [state e_cons κ] s’] [parent e_body p] [reachable [state e_body κ]] [cont [state p κ] s’])


; var-root lookup
(rule [binds e x] [param _ x e _])

(rule [binding e] [$let e _ _ _])
(rule [binding e] [$letrec e _ _ _])
(rule [binding e] [$app e _])

(rule [lookup_var_root x [state e_body κ] [root e_init [state e_init κ]]] [$let e x e_init e_body] [reachable [state e κ]])
(rule [lookup_var_root x [state e_init κ] r] [lookup_var_root x [state p κ] r] [$let p _ e_init _])
(rule [lookup_var_root x [state e_body κ] r] [lookup_var_root x [state p κ] r] [$let p x’ _ e_body] (!= x x’))
(rule [lookup_var_root x [state e_init κ] [root e_init [state e_init κ]]] [$letrec e x e_init _] [reachable [state e κ]])
(rule [lookup_var_root x [state e_body κ] [root e_init [state e_init κ]]] [$letrec e x e_init e_body] [reachable [state e κ]])
(rule [lookup_var_root x [state e_init κ] r] [lookup_var_root x [state p κ] r] [$letrec p x’ e_init _] (!= x x’))
(rule [lookup_var_root x [state e_body κ] r] [lookup_var_root x [state p κ] r] [$letrec p x’ _ e_body] (!= x x’))
(rule [lookup_var_root x [state e_body κ’] [root e_rand [state e κ]]] [$app e e_rator] [$lam e_lam e_body] [param e_param x e_lam i] [arg e_rand e i] [step [state e κ] [state e_body κ’]])
(rule [lookup_var_root x [state e_body κ’] r] [$app e e_rator] [greval e_rator [state e κ] [obj e_lam [state e_obj κ_obj]]] [lookup_var_root x [state e_obj κ_obj] r] (not [binds e_lam x]) [step [state e κ] [state e_body κ’]])
(rule [lookup_var_root x [state e κ] r] [lookup_var_root x [state p κ] r] (not [binding p]) [parent e p])

; eval var root (only for set!)
(rule [var_root e] [$let _ _ e _])
(rule [var_root e] [$letrec _ _ e _])
(rule [var_root e] [arg e _ _])

(rule [sets e] [$set e _ _])

(rule [eval_var_root [root e_r s_r] s_r d]
  [greval e_r s_r d] [var_root e_r])
(rule [eval_var_root r [state e κ] d]
  [$set e x e_upd] [greval e_upd [state e κ] d] [lookup_var_root x [state e κ] r])
(rule [eval_var_root r [state e κ] d]
  [eval_var_root r s’ d] [step s’ [state e κ]] [$set e x _] [lookup_var_root x [state e κ] r’] (!= r r’))
(rule [eval_var_root r [state e κ] d]
  [eval_var_root r s’ d] [step s’ [state e κ]] (not [sets e]))
        
        

; path roots
(rule [lookup_path_root e_id "car" s [root e_car s_r]]
          [$id e_id _] [greval e_id s [obj e_cons s_r]] [$cons e_cons e_car _])
(rule [lookup_path_root e_id "cdr" s [root e_cdr s_r]]
          [$id e_id _] [greval e_id s [obj e_cons s_r]] [$cons e_cons _ e_cdr])

; eval path root (only for set-cxr!)
(rule [setcxr e] [$setcar e _ _])
(rule [setcxr e] [$setcdr e _ _])

(rule [path_root e] [$cons _ e _])
(rule [path_root e] [$cons _ _ e])


(rule [eval_path_root [root e_r s_r] s_r d]
  [greval e_r s_r d] [path_root e_r]) 
(rule [eval_path_root r [state e κ] d]
  [$setcar e e_id e_upd] [greval e_upd [state e κ] d] [lookup_path_root e_id "car" [state e κ] r])
(rule [eval_path_root r [state e κ] d]
  [$setcdr e e_id e_upd] [greval e_upd [state e κ] d] [lookup_path_root e_id "cdr" [state e κ] r])  
(rule [eval_path_root r [state e κ] d]
  [eval_path_root r s’ d] [step s’ [state e κ]] [$setcar e e_id _] [lookup_path_root e_id "car" [state e κ] r’] (!= r r’))
(rule [eval_path_root r [state e κ] d]
  [eval_path_root r s’ d] [step s’ [state e κ]] [$setcdr e e_id _] [lookup_path_root e_id "cdr" [state e κ] r’] (!= r r’))
(rule [eval_path_root r [state e κ] d]
  [eval_path_root r s’ d] [step s’ [state e κ]] (not [setcxr e]))

        
; graph evaluator
(rule [evaluated e [state e κ]] [$lit e _] [reachable [state e κ]])
(rule [evaluated e [state e κ]] [$id e _] [reachable [state e κ]])
(rule [evaluated e [state e κ]] [$lam e _] [reachable [state e κ]])
(rule [evaluated e_rator [state e κ]] [$app e e_rator] [reachable [state e κ]])
(rule [evaluated e_rand [state e κ]] [$app e _] [arg e_rand e _] [reachable [state e κ]])
(rule [evaluated e_cond [state e κ]] [$if e e_cond _ _] [reachable [state e κ]])
; cons car cdr
(rule [evaluated e_car [state e κ]] [$cons e e_car _] [reachable [state e κ]])
(rule [evaluated e_cdr [state e κ]] [$cons e _ e_cdr] [reachable [state e κ]])
(rule [evaluated e_id [state e_car κ]] [$car e_car e_id] [reachable [state e_car κ]])
(rule [evaluated e_id [state e_cdr κ]] [$cdr e_cdr e_id] [reachable [state e_cdr κ]])
; set!
(rule [evaluated e_upd [state e_set κ]] [$set e_set _ e_upd] [reachable [state e_set κ]])
; set-cxr!
(rule [evaluated e_id [state e_setcar κ]] [$setcar e_setcar e_id _] [reachable [state e_setcar κ]])
(rule [evaluated e_upd [state e_setcar κ]] [$setcar e_setcar _ e_upd] [reachable [state e_setcar κ]])
(rule [evaluated e_id [state e_setcdr κ]] [$setcdr e_setcdr e_id _] [reachable [state e_setcdr κ]])
(rule [evaluated e_upd [state e_setcdr κ]] [$setcdr e_setcdr _ e_upd] [reachable [state e_setcdr κ]])


(rule [prim2 "+" + 2])
(rule [prim2 "-" - 2])
(rule [prim2 "*" * 2])
(rule [prim2 "=" = 2])
(rule [prim2 "<" < 2])
(rule [prim2 "even?" even? 1])

(rule [greval e’ s d] [$lit e’ d] [evaluated e’ s])
; without set!
; (rule [greval e’ s d] [$id e’ x] [evaluated e’ s] [lookup_var_root x s [root e_r s_r]] [greval e_r s_r d])
; with set!
(rule [greval e’ s d] [$id e’ x] [evaluated e’ s] [lookup_var_root x s [root e_r s_r]] [eval_var_root [root e_r s_r] s d])
(rule [greval e’ s [prim proc arity]] [$id e’ x] [evaluated e’ s] [prim2 x proc arity])
(rule [greval e’ s [obj e’ s]] [$lam e’ _] [evaluated e’ s])
(rule [greval e [state e κ] d] [$let e _ _ e_body] [reachable [state e κ]] [greval e_body [state e_body κ] d])
(rule [greval e [state e κ] d] [$letrec e _ _ e_body] [reachable [state e κ]] [greval e_body [state e_body κ] d])
(rule [greval e [state e κ] d] [$app e _] [step [state e κ] [state e_body κ’]] [$lam _ e_body] [greval e_body [state e_body κ’] d])
(rule [greval e [state e κ] d] [$app e e_rator] [reachable [state e κ]] [greval e_rator [state e κ] [prim proc 1]] [arg e1 e 0] [greval e1 [state e κ] d1] (:= d (proc d1)))
(rule [greval e [state e κ] d] [$app e e_rator] [reachable [state e κ]] [greval e_rator [state e κ] [prim proc 2]] [arg e1 e 0] [greval e1 [state e κ] d1] [arg e2 e 1] [greval e2 [state e κ] d2] (:= d (proc d1 d2)))
(rule [greval e [state e κ] d] [$if e _ _ _] [step [state e κ] [state e_thenelse κ]] [greval e_thenelse [state e_thenelse κ] d])
; cons car cdr
(rule [greval e_cons s [obj e_cons s]] [$cons e_cons _ _] [reachable s])
; without set-cxr!
;(rule [greval e_car [state e_car κ] d]
;        [$car e_car e_id] [reachable [state e_car κ]]
;        [lookup_path_root e_id "car" [state e_car κ] [root e_r s_r]] [greval e_r s_r d])
;(rule [greval e_cdr [state e_cdr κ] d]
;        [$cdr e_cdr e_id] [reachable [state e_cdr κ]]
;        [lookup_path_root e_id "cdr" [state e_cdr κ] [root e_r s_r]] [greval e_r s_r d])
; with set-cxr!
(rule [greval e_car [state e_car κ] d]
  [$car e_car e_id] [reachable [state e_car κ]]
  [lookup_path_root e_id "car" [state e_car κ] r] [eval_path_root r [state e_car κ] d])
(rule [greval e_cdr [state e_cdr κ] d]
  [$cdr e_cdr e_id] [reachable [state e_cdr κ]]
  [lookup_path_root e_id "cdr" [state e_cdr κ] r] [eval_path_root r [state e_cdr κ] d])


; set!
(rule [greval e [state e κ] "unspecified"] [$set e _ _] [reachable [state e κ]]) ; TODO symbol support: 'unspecified iso. "unspecified"

; evaluator
(rule [evaluate e d] [final [state e κ]] [greval e [state e κ] d])
`;

const evaluatorCtr = compileToConstructor(spec, {debug:false});

function toModuleTuple(module, genericTuple)
{
  const pred = genericTuple[0];
  const tupleCtr = module[pred];
  if (!tupleCtr)
  {
    throw new Error(`no constructor for predicate ${pred}`)
  }
  return new tupleCtr(...genericTuple.slice(1));
}

export function greval(src)
{
  const ast = new SchemeParser().parse(src);
  const programTuples = ast2tuples(ast.car); 
  //  console.log(programTuples.join('\n'));

  const evaluator = evaluatorCtr();
  evaluator.addTuples(programTuples.map(t => toModuleTuple(evaluator, t)));

  // console.log([...evaluator.tuples()].join('\n'));
  // console.log(instance2dot(evaluator));

  const astrootTuples = [...evaluator.tuples()].filter(t => t.constructor.name === 'astroot');
  if (astrootTuples.length !== 1)
  {
    console.log("program:");
    console.log(src);
    console.log("\nevaluator tuples:")
    console.log([...evaluator.tuples()].join('\n'));
    throw new Error(`wrong number of 'astroot' tuples: ${astrootTuples.length}`);
  }

  const evaluateTuples = [...evaluator.tuples()].filter(t => t.constructor.name === 'evaluate');
  return evaluateTuples.map(t => t.t1);
}

function param2tuples(p)
{
  return function (param, i)
  {
    if (param instanceof Sym)
    {
      return [['param', param.tag, param.name, p, i]]; // no id in sight (see 'when to name-tuple')
    }
    throw new Error(`cannot handle param ${param}`);
  }
}

function arg2tuples(p)
{
  return function (arg, i)
  {
    const argTuples = ast2tuples(arg);
    return [['arg', arg.tag, p, i], ...argTuples];
  }
}

function ast2tuples(ast)
{
  if (ast instanceof String)
  {
    return [['$lit', ast.tag, ast.toString()]];
  }
  if (ast instanceof Number)
  {
    return [['$lit', ast.tag, ast.valueOf()]];
  }
  if (ast instanceof Boolean)
  {
    return [['$lit', ast.tag, ast.valueOf()]];
  }
  if (ast instanceof Sym)
  {
    return [['$id', ast.tag, ast.toString()]];
  }
  if (ast instanceof Pair)
  {
    const car = ast.car;
    if (car instanceof Sym)
    {
      switch (car.name)
      {
        case "lambda":
        {
          const params = ast.cdr.car;
          const paramTuples = [...params].flatMap(param2tuples(ast.tag));
          const body = ast.cdr.cdr.car; // only one body exp allowed (here, and elsewhere)
          const bodyTuples = ast2tuples(body);
          return [['$lam', ast.tag, body.tag], ...paramTuples, ...bodyTuples];
        }
        case "let":
        {
          const binding = ast.cdr.car;
          const name = binding.car.car.name;
          const init = binding.car.cdr.car;
          const body = ast.cdr.cdr.car;
          // const nameTuples = ast2tuples(name); // TODO: when to name-tuple or not; currently: not for params
          const initTuples = ast2tuples(init);
          const bodyTuples = ast2tuples(body);
          return [['$let', ast.tag, name, init.tag, body.tag], ...initTuples, ...bodyTuples];
        }
        case "letrec":
        {
          const binding = ast.cdr.car;
          const name = binding.car.car.name;
          const init = binding.car.cdr.car;
          const body = ast.cdr.cdr.car;
          // const nameTuples = ast2tuples(name);
          const initTuples = ast2tuples(init);
          const bodyTuples = ast2tuples(body);
          return [['$letrec', ast.tag, name, init.tag, body.tag], ...initTuples, ...bodyTuples];
        }
        case "if":
        {
          const cond = ast.cdr.car;
          const cons = ast.cdr.cdr.car;
          const alt = ast.cdr.cdr.cdr.car;
          const condTuples = ast2tuples(cond);
          const consTuples = ast2tuples(cons);
          const altTuples = ast2tuples(alt);
          return [['$if', ast.tag, cond.tag, cons.tag, alt.tag], ...condTuples, ...consTuples, ...altTuples];
        }

        case "cons":
        {
          const car = ast.cdr.car;
          const cdr = ast.cdr.cdr.car;
          const carTuples = ast2tuples(car);
          const cdrTuples = ast2tuples(cdr);
          return [['$cons', ast.tag, car.tag, cdr.tag], ...carTuples, ...cdrTuples];
        }
        case "car":
        {
          const pair = ast.cdr.car;
          const pairTuples = ast2tuples(pair);
          return [['$car', ast.tag, pair.tag], ...pairTuples];
        }
        case "cdr":
        {
          const pair = ast.cdr.car;
          const pairTuples = ast2tuples(pair);
          return [['$cdr', ast.tag, pair.tag], ...pairTuples];
        }

        case "set!":
        {
          const name = ast.cdr.car.name;
          const update = ast.cdr.cdr.car;
          //  const nameTuples = ast2tuples(name);
          const updateTuples = ast2tuples(update);
          return [['$set', ast.tag, name, update.tag], ...updateTuples];         
        }

        case "set-car!":
        {
          const name = ast.cdr.car;
          const update = ast.cdr.cdr.car;
          const nameTuples = ast2tuples(name);
          const updateTuples = ast2tuples(update);
          return [['$setcar', ast.tag, name.tag, update.tag], ...nameTuples, ...updateTuples];         
        }
        case "set-cdr!":
        {
          const name = ast.cdr.car;
          const update = ast.cdr.cdr.car;
          const nameTuples = ast2tuples(name);
          const updateTuples = ast2tuples(update);
          return [['$setcdr', ast.tag, name.tag, update.tag], ...nameTuples, ...updateTuples];         
        }


        default: // app
        {
          const ratorTuples = ast2tuples(car);
          const argTuples = [...ast.cdr].flatMap(arg2tuples(ast.tag));
          return [['$app', ast.tag, car.tag], ...ratorTuples, ...argTuples];
        }
      }
    }
    else // not a special form
    { // TODO: cloned from default case above
      const ratorTuples = ast2tuples(car);
      const argTuples = [...ast.cdr].flatMap(arg2tuples(ast.tag));
      return [['$app', ast.tag, car.tag], ...ratorTuples, ...argTuples];
    }
  }
  throw new Error(`cannot handle expression ${ast} of type ${ast.constructor.name}`);
}


console.log(greval(`
(let ((x 10)) (let ((y 20)) y))
`));
