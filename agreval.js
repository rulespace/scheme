// import * as evaluator from './compiled/agreval_module.mjs';
import { compileToConstructor, compileToModuleSrc, deltaSource, instance2dot, metaInstance } from 'rulespace';
import { SchemeParser, Sym, Pair } from './sexp-reader.js';
import { assertTrue, MutableMaps, Sets } from 'common';

import { specification } from './agreval-rsp.js';


function param2tuples(lam)
{
  return function (param, i)
  {
    if (param instanceof Sym)
    {
      const paramTuples = ast2tuples(param);
      return [['param', param.tag, lam, i], ...paramTuples]; 
    }
    throw new Error(`cannot handle param ${param}`);
  }
}

function rand2tuples(app)
{
  return function (arg, i)
  {
    const randTuples = ast2tuples(arg);
    return [['rand', arg.tag, app, i], ...randTuples];
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

//@ deprecated
function getTuples2(evaluator, pred)
{
  return [...evaluator.tuples()].filter(t => t.constructor.name === pred);
}

function* filterPred(tuples, pred)
{
  for (const t of tuples)
  {
    if (t.constructor.name === pred)
    {
      yield t;
    }
  }
}

export function create_agreval(configSrc)
{
 
  const evaluatorCtr = compileToConstructor(specification + configSrc);
 
  return function agreval(src, options = {})
  {
    const evaluator = evaluatorCtr();
    // this is badly named, since there's also a 'debug' flag on the rsp compiler
    const FLAG_debug = options.debug ?? false;
    
    const ast = new SchemeParser().parse(src);
    const programTuples = ast2tuples(ast.car); 
    //  console.log(programTuples.join('\n'));
    // console.log(programTuples.map(t => `\\rel{${t[0].substring(1)}}(${t.slice(1).join()})`).join(',\n'));
    evaluator.addTuples(programTuples.map(t => toModuleTuple(evaluator, t)));

    const astrootTuples = getTuples2(evaluator, 'ast_root');
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
    
    return evaluator;
  }
}

function* result(evaluator)
{
  for (const t of filterPred(evaluator.tuples(), 'evaluate'))
  {
    yield t.t1;
  }
}

function initialState(evaluator)
{
  return [...filterPred(evaluator.tuples(), 'initial_state')][0].t0;
}

function successorStates(evaluator, state)
{
  const result = [];
  for (const t of filterPred(evaluator.tuples(), 'step'))
  {
    if (t.t0 === state)
    {
      result.push(t.t1);
    }
  }
  return result;  
}

function astTuple(evaluator, tag)
{
  for (const t of evaluator.tuples())
  {
    if (t.constructor.name.startsWith('$'))
    {
      if (t.t0 === tag)
      {
        return t;
      }
    }
  }
  throw new Error(`tuple with tag ${tag} not found`);
}
   
function expToString(evaluator, tag)
{
  function helper(tag)
  {
    const t = astTuple(tag);
    switch (t.constructor.name)
    {
      case '$id': return t.t1;
      case '$lit': return t.t1;
      case '$let': return `(let ((${helper(t.t1)} ${helper(t.t2)})) ${helper(t.t3)})`;
      case '$letrec': return `(letrec ((${helper(t.t1)} ${helper(t.t2)})) ${helper(t.t3)})`;
      case '$lam': return `(lambda ... ${helper(t.t1)})`;
      case '$if': return `(if ${helper(t.t1)} ${helper(t.t2)} ${helper(t.t3)})`;
      case '$set': return `(set! ${helper(t.t1)} ${helper(t.t2)})`;
      case '$cons': return `(cons ${helper(t.t1)} ${helper(t.t2)})`;
      case '$car': return `(car ${helper(t.t1)})`;
      case '$cdr': return `(cdr ${helper(t.t1)})`;
      case '$setcar': return `(set-car! ${helper(t.t1)} ${helper(t.t2)})`;
      case '$setcdr': return `(set-cdr! ${helper(t.t1)} ${helper(t.t2)})`;
      case '$app':
        {
          const randTuples = [];
          for (const t_rand of filterPred(evaluator.tuples(), 'rand'))
          {
            if (t_rand.t1 === t.t0)
            {
              randTuples.push(t_rand);
            }
          }
          randTuples.sort((ta, tb) => ta.t2 - tb.t2);
          const rands = randTuples.map(t => t.t0);
          return `(${helper(t.t1)} ${rands.map(helper).join(' ')})`;
        }
      default: throw new Error(t.constructor.name);
    }
  }

  return helper(tag);
}

function evaluate(evaluator, exp, state)
{
  const result = [];
  for (const t of filterPred(evaluator.tuples(), 'greval'))
  {
    if (t.t0 === exp && t.t1 === state)
    {
      result.push(t.t2);
    }
  }
  return result;
}

function debug(evaluator)
{
  const tuples = [...evaluator.tuples()];

  console.log(tuples.join('\n'));
  // console.log(instance2dot(evaluator));

  function tupleToString(t)
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
  assertTrue(getTuples2(evaluator, 'initial_state').length === 1);
  const initial = getTuples2(evaluator, 'initial_state')[0].t0;
  const todo = [initial];
  while (todo.length > 0)
  {
    const current = todo.pop();
    if (seen.has(current))
    {
      continue;
    }
    seen.add(current);
    console.log(`\n====\n${current} ${tupleToString(current)}`);

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
        console.log(`greval |${expToString(tuples, exp)}| ${val}`);
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

// function createMetaInstance()
// {
//   const meta = metaInstance(evaluator);
//   deltaSource(evaluator).addDeltaObserver({
//     observe(delta)
//     {
//       meta.addTupleMap(delta.added());
//       meta.removeTupleMap()
//     }
//   })
// }

function dotFlowGraph(evaluator, nodeToString)
{
  const todo = [initialState(evaluator)];
  const nodes = [];
  const transitions = new Map();
  while (todo.length > 0)
  {
    const current = todo.pop();
    let index = nodes.indexOf(current);
    if (index > -1)
    {
      continue;
    }
    nodes.push(current);
    for (const succ of evaluator.successorStates(current))
    {
      MutableMaps.putPushArray(transitions, current, succ);
      todo.push(succ);
    }
  }
  const dotNodes = nodes.map((node, i) => `${i} [label="${nodeToString(node)}"];`);
  const dotTransitions = [];
  for (const [source, dests] of transitions)
  {
    const tagSource = nodes.indexOf(source);
    for (const dest of dests)
    {
      dotTransitions.push(`${tagSource} -> ${nodes.indexOf(dest)}`);
    }
  }

  return `
  digraph G {
    node [style=filled,fontname="Roboto Condensed"];

    ${dotNodes.join('\n')}

    ${dotTransitions.join('\n')}

  }
  `;
}

function dotProvenanceGraph()
{
  return instance2dot(evaluator);
}

import { lattice_conc as lattice } from './lattice-rsp.js';
import { kalloc_0cfa as kalloc } from './kalloc-rsp.js';

const agreval = create_agreval(lattice + kalloc);
const start = Date.now();
const evaluator = agreval(`

(let ((x 1))
  (let ((y 2))
    (let ((u "piano"))
      (let ((z (+ x y)))
        z))))

`, {debug:false});
console.log(`${Date.now() - start} ms`);
console.log([...result(evaluator)]);
// console.log(dotFlowGraph(evaluator, t => `${evaluator.expToString(t.t0)} | ${t.t1} | ${evaluator.evaluate(t.t0, t)}`));
console.log(dotProvenanceGraph());

