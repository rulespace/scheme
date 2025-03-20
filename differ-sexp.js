import { Null, Pair, Sym } from './sexp-reader.js';
import { Differ, nodeMap } from './differ.js';

export { DiffConfig };

// syntax
const TYPE = 0;
const VAL = 2; // atoms

// types
const $atom = 0;
const $list = 1;

function isAtomic(type)
{
  return type === $atom;
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
    const nodes = sexp2tuples(exp);
    return nodes;  
  }

  node2shortString(t)
  {
    let str;
    switch (t[TYPE])
    {
      case $atom: str = '$atom'; break;
      case $list: str = '$list'; break;
      default: throw new Error(`cannot handle ${t[TYPE]}`);
    }
    return `(${str}-${t[1]} ${t.slice(2).join(' ')})`;
  }
  
  nodes2string(nodes)
  {
    return node2string(nodes[0], nodes);
  }
}

function sexp2tuples(exp)
{
  if (exp instanceof String)
  {
    return [[$atom, exp.tag, exp.toString()]];
  }
  if (exp instanceof Number)
  {
    return [[$atom, exp.tag, exp.valueOf()]];
  }
  if (exp instanceof Boolean)
  {
    return [[$atom, exp.tag, exp.valueOf()]];
  }
  if (exp instanceof Null)
  {
    // return [[$atom, ast.tag, new Null().valueOf()]]; // TODO: improve // TODO: atom or list?
    return [[$list, exp.tag]]; // TODO: improve // TODO: atom or list?
  }
  if (exp instanceof Sym)
  {
    return [[$atom, exp.tag, exp.toString()]];
  }
  if (exp instanceof Pair)
  {
    const ratorTuples = sexp2tuples(exp.car);
    const argTuples = [...exp.cdr].map(sexp2tuples);
    return [[$list, exp.tag, exp.car.tag, ...[...exp.cdr].map(t => t.tag)], ...ratorTuples, ...argTuples.flat()];
  }
  throw new Error(`cannot handle expression ${exp} of type ${exp?.constructor?.name}`);
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
        case $atom:
        {
          return t[VAL];
        }
        case $list:
          {
            // return `(${stringify(lookupTag(t[2]))} ${t.slice(3).map(x => stringify(lookupTag(x))).join(' ')})`;
            return `(${t.slice(2).map(x => stringify(lookupTag(x))).join(' ')})`;
          }
        default: throw new Error(`cannot handle ${t}`);
      }
    }
  return stringify(tuple, m);
}





