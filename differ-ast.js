import { assertTrue } from './deps.ts';
import { Null, Pair, SchemeParser, Sym } from './sexp-reader.js';

export { nodeStream, nodeMap, diff, diff2edits, coarsifyEdits, applyEdits, tuples2string, tuple2shortString, diff2string };

// TODO: quote is handled as an application

// ast
const $lit = 0;
const $id = 1;
const $param = 2;
const $let = 3;
const $letrec = 4;
const $if = 5;
const $set = 6;
const $lam = 7;
const $app = 8;

// progress
const CHOICES = 0;
const I = 1;
const J = 2
const COST = 3;

// edits
const MATCH = 0;
// const MODIFY = 1;
const LEFT = 1;
const RIGHT = 3;

function editName(e)
{
  if (e === MATCH)
  {
    return 'M'
  };
  if (e === LEFT)
  {
    return 'L';
  }
  if (e === RIGHT)
  {
    return 'R';
  }
  throw new Error();
}

function diff2string(diff)
{
  let sb = "";
  for (const [d, l] of diff)
  {
    switch (d)
    {
      case MATCH: l === 1 ? sb += 'M' : sb += `M(${l})`; break;
      case LEFT: l === 1 ? sb += 'L' : sb += `L(${l})`; break;
      case RIGHT: l === 1 ? sb += 'R' : sb += `R(${l})`; break;
      default: throw new Error(d);
    }
  }
  return sb;
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


function subtreeMatches(t1, n1map, t2, n2map)
{
  if (((t1[0] < 3)) && t1[0] === t2[0])
  {
    if (t1[2] === t2[2])
    {
      return 1;
    }
    return 0;
  }
  else
  {
    if (t1[0] !== t2[0] || t1.length !== t2.length)
    {
      return 0;
    }
    let intermediateN = 1;
    for (let i = 2; i < t1.length; i++)
    {
      const nn = subtreeMatches(n1map[t1[i]], n1map, n2map[t2[i]], n2map);
      if (nn === 0)
      {
        return 0;
      }
      else
      {
        intermediateN += nn;
      }
    }
    return intermediateN;  
  }
}

function nodeMap(ts)
{
  const m = [];
  for (const t of ts)
  {
    m[t[1]] = t;
  }
  return m;
}

function step1(n1s, n2s)
{
  const N = n1s.length; // width, n1, left
  const M = n2s.length; // height, n2, right

  const a = new Uint32Array((N+1)*(M+1));
  // console.log(`N ${N} M ${M} a.length ${a.length}`);

  function cell2string(cellValue)
  {
    return `[${cellValue >> 2}, ${editName(cellValue & 0b11)}]`;
  }
  
  const index = (col, row) => row * (N+1) + col;

  a[index(0, 0)] = 0;

  for (let i = 1; i <= N; i++)
  {
    a[index(i, 0)] = (i << 2) | LEFT;
  }

  for (let j = 1; j <= M; j++)
  {
    a[index(0, j)] = (j << 2) | RIGHT;
  }

  for (let j = 1; j <= M; j++)
  {
    for (let i = 1; i <= N; i++)
    {
      const left = n1s[i-1];
      const right = n2s[j-1];
      
      const match = left[0] === right[0] && (left[0] >= 3 || left[2] === right[2]);
      if (match) 
      {
        a[index(i, j)] = ((a[index(i-1,j-1)] >> 2) << 2) | MATCH; 
      }
      else
      {
        if ((a[index(i-1, j)] >> 2) <= (a[index(i, j-1)] >> 2))
        {
          a[index(i, j)] = (((a[index(i-1,j)] >> 2) + 1) << 2) | LEFT;
        }
        else
        {
          a[index(i, j)] = (((a[index(i,j-1)] >> 2) + 1) << 2) | RIGHT;
        }
      }
      // console.log(`i ${i} j ${j} l ${tuple2shortString(left)} r ${tuple2shortString(right)}: ⬅︎ ${cell2string(a[index(i-1,j)])} ⬉ ${cell2string(a[index(i-1,j-1)])} ⬆︎ ${cell2string(a[index(i,j-1)])}  => ${cell2string(a[index(i,j)])} ${match ? '(match)' : ((a[index(i-1, j)] >> 2) <= (a[index(i, j-1)] >> 2)) ? '(left)' : '(right)'}`); // DEBUG
    }
  }

  // // DEBUG:
  // for (let j = 0; j <= M; j++)
  // {
  //   let line = '';
  //   for (let i = 0; i <= N; i++)
  //   {
  //     line += `${cell2string(a[index(i,j)])}\t`;
  //   }
  //   console.log(line);
  // }

  let i = N;
  let j = M;
  const edits = [];
  while (i !== 0 || j !== 0)
  {
    const edit = a[index(i,j)] & 0b11;
    edits.unshift([edit, 1]);
    if (edit === MATCH)
    {
      i--;
      j--;
    }
    else if (edit === LEFT)
    {
      i--;
    }
    else if (edit === RIGHT)
    {
      j--;
    }
    else
    {
      throw new Error();
    }
  }
  return [edits];
}

function diff2edits(diff, n1s, n2s) // step2
{
  //stack
  const EXP = 0;
  const RPOS = 1;
  const RLEN = 2;
  const WPOS = 3;
  const WLEN = 4;
  const ORIG = 5;

  // ast (TODO: move to top-level)
  const TYPE = 0;
  const TAG = 1;
  const VAL = 2; // $lit $id

  let c = 0;
  let i = 0;
  let j = 0;

  const sc = [];
  const edits = [];

  function consumeChoice()
  {
    return diff[c++];
  }

  function addTuple(el)
  {
    const edit = ['add', el]; 
    // console.log(`\t\tadd tuple ${tuple2shortString(el)}`); // DDD
    edits.push(edit);
  }

  function removeTuple(el)
  {
    const edit = ['remove', el];
    // console.log(`\t\tremove tuple ${tuple2shortString(el)}`); // DDD
    edits.push(edit); 
  }

  function addAttr(tag, pos, insertedTag)
  {
    const edit = ['insertSimple', tag, pos, insertedTag]; 
    // console.log(`\t\tadd attr ${tag} ${pos} ${insertedTag}`); // DDD
    edits.push(edit); 
  }

  function removeAttr(tag, pos)
  {
    const edit = ['removeSimple', tag, pos];
    // console.log(`\t\tremove attr ${tag} ${pos}`); // DDD
    edits.push(edit)
  }

  // function genericEdit(edit)
  // {
  //   console.log(`\t\t${edit}`); // DEBUG
  //   edits.push(edit);
  // }

  function frame2string(frame)
  {
    return `${tuple2shortString(frame[EXP])} R ${frame[RPOS]}/${frame[RLEN]} W ${frame[WPOS]}/${frame[WLEN]} |${frame[ORIG]}|`;
  }

  function stack2string(stack)
  {
    return stack.map(frame2string).toReversed().join(" ");
  }

  function findMRPos()
  {
    for (let s = sc.length - 1; s >= 0; s--)
    {
      // console.log(`\t\tinspecting ${s}/${sc.length - 1}`); // DEBUG
      const pos = sc.at(s)[WPOS];
      const len = sc.at(s)[WLEN];
      if (pos < len)
      {
        const orig = sc.at(s)[ORIG];
        if (orig === 'M' || orig === 'R') // guaranteed? ('L' cannot have open write pos)
        {
          // console.log(`\t\t\tmatch frame ${frame2string(sc.at(s))}`) // DEBUG
          return s;
        }
      }
    }
    return false; // no higher-up match
  }

  function findMLPos()
  {
    for (let s = sc.length - 1; s >= 0; s--)
    {
      // console.log(`\t\tinspecting ${s}/${sc.length - 1}`); // DEBUG
      const pos = sc.at(s)[RPOS];
      const len = sc.at(s)[RLEN];
      if (pos < len)
      {
        const orig = sc.at(s)[ORIG];
        if (orig === 'M' || orig === 'L') // guaranteed? ('R' cannot have open read pos)
        {
          // console.log(`\t\t\tmatch frame ${frame2string(sc.at(s))}`) // DEBUG
          return s;
        }
      }
    }
    return false; // no higher-up match
  }

  while (c < diff.length)
  {
    const choice = consumeChoice();
    // console.log(`\n${n1s[i] && tuple2shortString(n1s[i])} %c${['MATCH', 'MODIFY', 'LEFT', 'RIGHT'][choice[0]] + (choice[1] === 1 ? '' : `(${choice[1]})`)}%c ${n2s[j] && tuple2shortString(n2s[j])}`, 'color:blue', 'color:default'); // DDD
    // console.log(`\tstack ${stack2string(sc)}`);

    if (choice[0] === MATCH) // with a match TYPE n1s[i] === n2s[j] always
    {
      removeTuple(n2s[j]);
      if (sc.length > 0)
      {
        const MRPos = findMRPos();
        if (MRPos !== false)
        {
          if (sc.at(MRPos)[ORIG] === 'M')
          {
            addAttr(sc.at(MRPos)[EXP][TAG], sc.at(MRPos)[WPOS], n1s[i][TAG]);
            sc.at(MRPos)[WPOS]++;  
          }
          else if (sc.at(MRPos)[ORIG] === 'R')
          {
            // console.log(`\t\toverwrite ${tuple2shortString(sc.at(MRPos)[EXP])} ${sc.at(MRPos)[WPOS]} ${n1s[i][TAG]}`); // DDD
            sc.at(MRPos)[EXP][sc.at(MRPos)[WPOS]+2] = n1s[i][TAG]; // overwrite    
            sc.at(MRPos)[WPOS]++;  
          }
          else
          {
            throw new Error();
          }
        }

        const MLPos = findMLPos();
        if (MLPos !== false)
        {
          if (sc.at(MLPos)[ORIG] === 'M')
          {
            removeAttr(sc.at(MLPos)[EXP][TAG], sc.at(MLPos)[WPOS]);
            sc.at(MLPos)[RPOS]++;
          }
          else if (sc.at(MLPos)[ORIG] === 'L')
          {
            sc.at(MLPos)[RPOS]++;
          }
          else
          {
            throw new Error();
          }
        }
      }
      
      if (n1s[i][TYPE] < 3) // if not compound exp
      {
        // nothing
      }
      else if (choice[1] > 1) // subexpression match: no push, treat it as atomic match
      {
        // nothing
      }
      else
      {
        sc.push([n1s[i], 0, n1s[i].length - 2, 0, n2s[j].length - 2, 'M']); 
      }
      i += choice[1];
      j += choice[1];
    }
    else if (choice[0] === LEFT)
    {
      removeTuple(n1s[i]);
      if (sc.length > 0)
      {
        const MLPos = findMLPos();
        if (MLPos !== false)
        {
          if (sc.at(MLPos)[ORIG] === 'M')
          {
            removeAttr(sc.at(MLPos)[EXP][TAG], sc.at(MLPos)[WPOS]);
            sc.at(MLPos)[RPOS]++;
          }
          else if (sc.at(MLPos)[ORIG] === 'L')
          {
            sc.at(MLPos)[RPOS]++;
          }
          else
          {
            throw new Error();
          }
        }
      }

      if (n1s[i][TYPE] < 3)
      {
        // nothing
      }
      else
      {
        sc.push([n1s[i], 0, n1s[i].length - 2, -99, -99, 'L']); 
      }
      i++;
    }
    else if (choice[0] === RIGHT)
    {
      // add happens on pop for compound exps (due to possible overwrites) 
      if (sc.length > 0)
      {
        const MRPos = findMRPos();
        if (MRPos !== false)
        {
          if (sc.at(MRPos)[ORIG] === 'M')
          {
            addAttr(sc.at(MRPos)[EXP][TAG], sc.at(MRPos)[WPOS], n2s[j][TAG]); // insert attr
            sc.at(MRPos)[WPOS]++;  
          }
          else if (sc.at(MRPos)[ORIG] === 'R')
          {
            sc.at(MRPos)[WPOS]++;  
          }
          else
          {
            throw new Error();
          }
        }
      }

      if (n2s[j][TYPE] < 3)
      {
        addTuple(n2s[j]);
      }
      else
      {
        sc.push([n2s[j].slice(0), -99, -99, 0, n2s[j].length - 2, 'R']);
      }
      j++;      
    }
    else
    {
      throw new Error(choice[0]);
    }

    // console.log(`\t=> stack ${stack2string(sc)}`); // DDD

    while (sc.length > 0)
    {
      const rpos = sc.at(-1)[RPOS];
      const rlen = sc.at(-1)[RLEN];
      const wpos = sc.at(-1)[WPOS];
      const wlen = sc.at(-1)[WLEN];
      const orig = sc.at(-1)[ORIG];
      
      if (rpos === rlen && wpos === wlen)
      {    
        const topr = sc.pop();
        // console.log(`\t\t\tpopping ${frame2string(topr)}`); // DDD
        if (orig === 'R')
        {
          addTuple(topr[EXP]);
        }
      }
      else
      {
        break;
      }
    }
  }
  // console.log(`\nedits:\n${edits.join('\n')}`); // DEBUG
  return edits;
}

function coarsifyEdits(edits, n1s) // step 3: turn modify etc. into add/remove 
{
  const n1map = nodeMap(n1s);

  const modifs = [];
  const edits2 = [];
  for (const edit of edits)
  {
    if (edit[0] === 'insertSimple')
    {
      const [_, tag, pos, newTag] = edit;
      if (modifs[tag] === undefined)
      {
        modifs[tag] = n1map[tag].slice(0);
      }
      modifs[tag].splice(pos + 2, 0, newTag);
    }
    else if (edit[0] === 'removeSimple' || edit[0] === 'removeNonSimple')
    {
      const [_, tag, pos] = edit;
      if (modifs[tag] === undefined)
      {
        modifs[tag] = n1map[tag].slice(0);
      }
      modifs[tag].splice([pos + 2], 1);
    }
    else
    {
      edits2.push(edit);
    }
  }
  for (const modif of modifs)
  {
    if (modif)
    {
      edits2.push(['replace', n1map[modif[1]], modif]); 
    }
  }

  // console.log(`\nedits2:\n${edits2.join('\n')}`);  // DEBUG
  return edits2;
}

function nodeStream(src, parser)
{
  const p = parser.parse(src).car;
  const ns = ast2tuples(p);
  return ns;
}

function diff(n1s, n2s, options = {})
{
  const maxSolutions = options.maxSolutions || 1000;
  const returnAllSolutions = options?.returnAllSolutions;
  const keepGlobalSuboptimalSolutions = options?.keepGlobalSuboptimalSolutions;
  const keepLocalSuboptimalSolutions = options?.keepLocalSuboptimalSolutions;

  const solutions = step1(n1s, n2s, maxSolutions, returnAllSolutions, keepLocalSuboptimalSolutions, keepGlobalSuboptimalSolutions);
  return solutions;
}

function applyEdits(ts, edits)
{
  ts = ts.map(t => t.slice(0));
  const m = nodeMap(ts);
  for (const edit of edits)
  {
    switch (edit[0])
    {
      case 'replace':
        {
          m[edit[1][1]] = edit[2];
          break;
        }
      case 'add':
        {
          m[edit[1][1]] = edit[1];
          break;
        }
      case 'remove':
        {
          m[edit[1][1]] = undefined;
          break;
        }
      default: throw new Error(`cannot handle edit ${edit}`);
    }
  }

  const isSubexp = [];
  for (const t of m)
  {
    if (t === undefined)
    {
      continue;
    }
    if (isSubexp[t[1]] === undefined)
    {
      isSubexp[t[1]] = false;
    }
    for (let i = 2; i < t.length; i++)
    {
      isSubexp[t[i]] = true;
    }
  }

  const rooti = isSubexp.findIndex(x => x === false);
  const root = m[rooti]; 
  m[rooti] = m[0];
  m[0] = root;
  return m.filter(x => x);
}

function tuple2shortString(t)
{
  let str;
  switch (t[0])
  {
    case $lit: str = '$lit'; break;
    case $id: str = '$id'; break;
    case $param: str = '$param'; break;
    case $let: str = '$let'; break;
    case $letrec: str = '$letrec'; break;
    case $if: str = '$if'; break;
    case $set: str = '$set'; break;
    case $lam: str = '$lam'; break;
    case $app: str = '$app'; break;
    default: throw new Error(`cannot handle ${t[0]}`);
  }
  return `(${str}-${t[1]} ${t.slice(2).join(' ')})`;
}

function tuple2string(tuple, tuples)
{

  const m = nodeMap(tuples);

  function lookupTag(tag)
  {
    if (m[tag])
    {
      return m[tag];
    }
    throw new Error(`cannot find tag ${tag} in ${tuples.map(tuple2shortString)}`);
  }

  function stringify(t)
  {
      switch (t[0])
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

function tuples2string(tuples)
{
  return tuple2string(tuples[0], tuples);
}
