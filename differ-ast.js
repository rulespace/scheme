import { Null, Pair, Sym } from './sexp-reader.js';
import { Differ, nodeMap } from './differ.js';

export { DiffConfig };

// syntax
const TYPE = 0;
const VAL = 2; // atoms

// types
const $lit = 0;
const $id = 1;
const $param = 2;
const $let = 3;
const $letrec = 4;
const $if = 5;
const $set = 6;
const $lam = 7;
const $app = 8;

function isAtomic(type)
{
  return type < 3;
}

class DiffConfig
{
  constructor()
  {
  }

  createDiffer()
  {
    return new Differ(isAtomic, this.node2shortString);
  }

  createNodes(src, parser)
  {
    const exp = parser.parse(src).car;
    const nodes = ast2tuples(exp);
    return nodes;  
  }

  node2shortString(t)
  {
    let str;
    switch (t[TYPE])
    {
      case $lit: str = '$lit'; break;
      case $id: str = '$id'; break;
      case $param: str = '$param'; break;
      case $let: str = '$et'; break;
      case $letrec: str = '$letrec'; break;
      case $if: str = '$if'; break;
      case $set: str = '$set'; break;
      case $lam: str = '$lam'; break;
      case $app: str = '$app'; break;
      default: throw new Error(`cannot handle ${t[TYPE]}`);
    }
    return `(${str}-${t[1]} ${t.slice(2).join(' ')})`;
  }
  
  nodes2string(nodes)
  {
    return node2string(nodes[0], nodes);
  }
}

function ast2tuples(ast)
{
  if (ast instanceof String)
  {
    return [[$lit, ast.tag, ast.toString()]];
  }
  if (ast instanceof Number)
  {
    return [[$lit, ast.tag, ast.valueOf()]];
  }
  if (ast instanceof Boolean)
  {
    return [[$lit, ast.tag, ast.valueOf()]];
  }
  if (ast instanceof Null)
  {
    return [[$lit, ast.tag, new Null().valueOf()]]; // TODO: improve
  }
  if (ast instanceof Sym)
  {
    return [[$id, ast.tag, ast.toString()]];
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
          const paramTuples = [...params].map(sym => [$param, sym.tag, sym.toString()]);
          const body = ast.cdr.cdr.car; // only one body exp allowed (here, and elsewhere)
          const bodyTuples = ast2tuples(body);
          return [[$lam, ast.tag, ...[...params].map(t => t.tag), body.tag], ...paramTuples, ...bodyTuples];
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
          return [[$let, ast.tag, name.tag, init.tag, body.tag], ...nameTuples, ...initTuples, ...bodyTuples];
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
          return [[$letrec, ast.tag, name.tag, init.tag, body.tag], ...nameTuples, ...initTuples, ...bodyTuples];
        }
        case "if":
        {
          const cond = ast.cdr.car;
          const cons = ast.cdr.cdr.car;
          const alt = ast.cdr.cdr.cdr.car;
          const condTuples = ast2tuples(cond);
          const consTuples = ast2tuples(cons);
          const altTuples = ast2tuples(alt);
          return [[$if, ast.tag, cond.tag, cons.tag, alt.tag], ...condTuples, ...consTuples, ...altTuples];
        }
        // case "cons":
        // {
        //   const car = ast.cdr.car;
        //   const cdr = ast.cdr.cdr.car;
        //   const carTuples = ast2tuples(car);
        //   const cdrTuples = ast2tuples(cdr);
        //   return [['$cons', ast.tag, car.tag, cdr.tag], ...carTuples, ...cdrTuples];
        // }
        // case "car":
        // {
        //   const pair = ast.cdr.car;
        //   const pairTuples = ast2tuples(pair);
        //   return [['$car', ast.tag, pair.tag], ...pairTuples];
        // }
        // case "cdr":
        // {
        //   const pair = ast.cdr.car;
        //   const pairTuples = ast2tuples(pair);
        //   return [['$cdr', ast.tag, pair.tag], ...pairTuples];
        // }
        case "set!":
        {
          const name = ast.cdr.car;
          const update = ast.cdr.cdr.car;
          const nameTuples = ast2tuples(name);
          const updateTuples = ast2tuples(update);
          return [[$set, ast.tag, name.tag, update.tag], ...nameTuples,  ...updateTuples];         
        }
        // case "set-car!":
        // {
        //   const name = ast.cdr.car;
        //   const update = ast.cdr.cdr.car;
        //   const nameTuples = ast2tuples(name);
        //   const updateTuples = ast2tuples(update);
        //   return [['$setcar', ast.tag, name.tag, update.tag], ...nameTuples, ...updateTuples];         
        // }
        // case "set-cdr!":
        // {
        //   const name = ast.cdr.car;
        //   const update = ast.cdr.cdr.car;
        //   const nameTuples = ast2tuples(name);
        //   const updateTuples = ast2tuples(update);
        //   return [['$setcdr', ast.tag, name.tag, update.tag], ...nameTuples, ...updateTuples];         
        // }

        default: // app
        {
          const ratorTuples = ast2tuples(car);
          const argTuples = [...ast.cdr].map(ast2tuples);
          return [[$app, ast.tag, car.tag, ...[...ast.cdr].map(t => t.tag)], ...ratorTuples, ...argTuples.flat()];
        }
      }
    }
    else // not a special form
    { // TODO: cloned from default (`app`) case above
      const ratorTuples = ast2tuples(car);
      const argTuples = [...ast.cdr].map(ast2tuples);
      return [[$app, ast.tag, car.tag, ...[...ast.cdr].map(t => t.tag)], ...ratorTuples, ...argTuples.flat()];
    }
  }
  throw new Error(`cannot handle expression ${ast} of type ${ast?.constructor?.name}`);
}

function node2string(tuple, tuples)
{
  const m = nodeMap(tuples);

  function lookupTag(tag)
  {
    if (m[tag])
    {
      return m[tag];
    }
    throw new Error(`cannot find tag ${tag} in ${tuples.map(node2shortString)}`);
  }

  function stringify(t)
  {
    switch (t[TYPE])
    {
      case $lit:
      case $id:
      case $param:
        {
          return t[2];
        }
      case $let:
        {
          return `(let ((${stringify(lookupTag(t[2]))} ${stringify(lookupTag(t[3]))})) ${stringify(lookupTag(t[4]))})`;
        }
      case $letrec:
        {
          return `(letrec ((${stringify(lookupTag(t[2]))} ${stringify(lookupTag(t[3]))})) ${stringify(lookupTag(t[4]))})`;
        }
      case $if:
        {
          return `(if ${stringify(lookupTag(t[2]))} ${stringify(lookupTag(t[3]))} ${stringify(lookupTag(t[4]))})`;
        }
      case $set:
        {
          return `(set! ${stringify(m[t[2]])} ${stringify(m[t[3]])})`;
        }
      case $lam:
      {
        return `(lambda (${t.slice(2, -1).map(x => stringify(m[x])).join(' ')}) ${stringify(m[t.at(-1)])})`;
      }
      case $app:
        {
          return `(${stringify(lookupTag(t[2]))} ${t.slice(3).map(x => stringify(lookupTag(x))).join(' ')})`;
        }
      default: throw new Error(`cannot handle ${t}`);
    }
  }
  return stringify(tuple, m);
}





