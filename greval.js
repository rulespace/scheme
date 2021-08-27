import { specification } from './greval-rsp.js';
import { compileToConstructor, instance2dot } from 'rulespace';
import { SchemeParser, Sym, Pair } from './sexp-reader.js';
import { assertTrue } from 'common';

const evaluatorCtr = compileToConstructor(specification, {debug:false});

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

function getTuples(evaluator, pred)
{
  return [...evaluator.tuples()].filter(t => t.constructor.name === pred);
}

function debug(evaluator)
{
  const tuples = [...evaluator.tuples()];

  console.log(tuples.join('\n'));
  // console.log(instance2dot(evaluator));

  function getAstTuple(tag)
  {
    for (const t of tuples)
    {
      if (t.constructor.name.startsWith('$') || t.constructor.name === 'param' || t.constructor.name === 'arg')
      {
        if (t.t0 === tag)
        {
          return t;
        }
      }
    }
    throw new Error(`tuple with tag ${tag} not found`);
  }

  function expToString(tag)
  {
    const t = getAstTuple(tag);
    switch (t.constructor.name)
    {
      case '$id': return t.t1;
      case '$lit': return t.t1;
      case '$let': return `(let ((${expToString(t.t1)} ${expToString(t.t2)})) ${expToString(t.t3)})`;
      case '$letrec': return `(letrec ((${expToString(t.t1)} ${expToString(t.t2)})) ${expToString(t.t3)})`;
      case '$lam': return `(lambda ... ${expToString(t.t1)})`;
      case '$if': return `(if ${expToString(t.t1)} ${expToString(t.t2)} ${expToString(t.t3)})`;
      case '$set': return `(set! ${expToString(t.t1)} ${expToString(t.t2)})`;
      case '$cons': return `(cons ${expToString(t.t1)} ${expToString(t.t2)})`;
      case '$car': return `(car ${expToString(t.t1)})`;
      case '$cdr': return `(cdr ${expToString(t.t1)})`;
      case '$setcar': return `(set-car! ${expToString(t.t1)} ${expToString(t.t2)})`;
      case '$setcdr': return `(set-cdr! ${expToString(t.t1)} ${expToString(t.t2)})`;
      case '$app': return `(${expToString(t.t1)} ...)`;
      default: throw new Error(t.constructor.name);
    }
  }
  function toString(t)
  {
    const pred = t.constructor.name;
    switch (pred)
    {
      case 'state':
        return `${expToString(t.t0)} ${t.t1}`;
      default: return String(t);
    }
  }

  const seen = new Set();
  assertTrue(getTuples(evaluator, 'initial_state').length === 1);
  const initial = getTuples(evaluator, 'initial_state')[0].t0;
  const todo = [initial];
  while (todo.length > 0)
  {
    const current = todo.pop();
    if (seen.has(current))
    {
      continue;
    }
    seen.add(current);
    console.log(`\n====\n${current} ${toString(current)}`);

    for (const t of tuples)
    {
      if (t.constructor.name === 'env' && t.t1 === current)
      {
        const name = t.t0;
        const addr = t.t2;
        console.log(`env ${name} ${addr}`);
      }
    }

    for (const t of tuples)
    {
      if (t.constructor.name === 'lookup_path_root' && t.t2 === current)
      {
        const exp = t.t0;
        const path = t.t1;
        const addr = t.t3;
        console.log(`lookup_path_root |${expToString(exp)}| ${path} ${addr}`);
      }
    }

    for (const t of tuples)
    {
      if ((t.constructor.name === 'modifies_var' || t.constructor.name === 'modifies_path') && t.t2 === current)
      {
        const e_upd = t.t0;
        const addr = t.t1;
        console.log(`${t.constructor.name} |${expToString(e_upd)}| ${addr}`);
      }
    }

    for (const t of tuples)
    {
      if ((t.constructor.name === 'eval_var_root' || t.constructor.name === 'eval_path_root') && t.t1 === current)
      {
        const addr = t.t0;
        const val = t.t2;
        console.log(`${t.constructor.name} ${addr} ${val}`);
      }
    }

    for (const t of tuples)
    {
      if (t.constructor.name === 'greval' && t.t1 === current)
      {
        const exp = t.t0;
        const val = t.t2;
        console.log(`greval |${expToString(exp)}| ${val}`);
      }
    }

    for (const t_step of tuples)
    {
      if (t_step.constructor.name === 'step' && t_step.t0 === current)
      {
        const succ = t_step.t1;
        todo.push(succ);
        console.log(`-> ${succ}`);
      }
    }
  }
}

export function greval(src, options = {})
{

  const FLAG_debug = options.debug ?? false;

  const ast = new SchemeParser().parse(src);
  const programTuples = ast2tuples(ast.car); 
  
//  console.log(programTuples.join('\n'));
  // console.log(programTuples.map(t => `\\rel{${t[0].substring(1)}}(${t.slice(1).join()})`).join(',\n'));

  const evaluator = evaluatorCtr();
  evaluator.addTuples(programTuples.map(t => toModuleTuple(evaluator, t)));

  const astrootTuples = getTuples(evaluator, 'ast_root');
  if (astrootTuples.length !== 1)
  {
    console.log("program:");
    console.log(src);
    console.log("\nevaluator tuples:")
    console.log([...evaluator.tuples()].join('\n'));
    throw new Error(`wrong number of 'astroot' tuples: ${astrootTuples.length}`);
  }

  if (FLAG_debug)
  {
    debug(evaluator);
  }

  const evaluateTuples = getTuples(evaluator, 'evaluate');
  return evaluateTuples.map(t => t.t1);
}


function param2tuples(p)
{
  return function (param, i)
  {
    if (param instanceof Sym)
    {
      const paramTuples = ast2tuples(param);
      return [['param', param.tag, p, i], ...paramTuples]; 
    }
    throw new Error(`cannot handle param ${param}`);
  }
}

function rand2tuples(p)
{
  return function (arg, i)
  {
    const randTuples = ast2tuples(arg);
    return [['rand', arg.tag, p, i], ...randTuples];
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
          const name = binding.car.car;
          const init = binding.car.cdr.car;
          const body = ast.cdr.cdr.car;
          const nameTuples = ast2tuples(name);
          const initTuples = ast2tuples(init);
          const bodyTuples = ast2tuples(body);
          return [['$let', ast.tag, name.tag, init.tag, body.tag], ...nameTuples, ...initTuples, ...bodyTuples];
        }
        case "letrec":
        {
          const binding = ast.cdr.car;
          const name = binding.car.car;
          const init = binding.car.cdr.car;
          const body = ast.cdr.cdr.car;
          const nameTuples = ast2tuples(name);
          const initTuples = ast2tuples(init);
          const bodyTuples = ast2tuples(body);
          return [['$letrec', ast.tag, name.tag, init.tag, body.tag], ...nameTuples, ...initTuples, ...bodyTuples];
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
          const name = ast.cdr.car;
          const update = ast.cdr.cdr.car;
          const nameTuples = ast2tuples(name);
          const updateTuples = ast2tuples(update);
          return [['$set', ast.tag, name.tag, update.tag], ...nameTuples,  ...updateTuples];         
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
          const argTuples = [...ast.cdr].flatMap(rand2tuples(ast.tag));
          return [['$app', ast.tag, car.tag], ...ratorTuples, ...argTuples];
        }
      }
    }
    else // not a special form
    { // TODO: cloned from default (`app`) case above
      const ratorTuples = ast2tuples(car);
      const argTuples = [...ast.cdr].flatMap(rand2tuples(ast.tag));
      return [['$app', ast.tag, car.tag], ...ratorTuples, ...argTuples];
    }
  }
  throw new Error(`cannot handle expression ${ast} of type ${ast.constructor.name}`);
}


console.log(greval(`
;(let ((x (cons 1 2)))
;      (let ((u (set-car! x 9)))
;        (car x)))

(let ((x (cons 1 2))) (car x))

`, {debug:true}));
