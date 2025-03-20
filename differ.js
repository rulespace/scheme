import { assertTrue } from "./deps.ts";

export { Differ, nodeMap };

//syntax
// assumption on syntax nodes
//    atoms [TYPE, TAG, VAL+] (optional value)
//    internal [TYPE, TAG, ...CHILDREN] (zero or more children)
const TYPE = 0;
const TAG = 1;
const VAL = 2;

// choices
const MATCH = 0;
// const MODIFY = 1;
const LEFT = 2;
const RIGHT = 3;

// choices from the matrix result in a 'selection'

// edits
const ADD_NODE = 0;
const DELETE_NODE = 1;
const INSERT_CHILD = 2;
const REMOVE_CHILD = 3;

function choice2string(selection)
{
  switch (selection)
  {
    case MATCH: return 'M';
    case LEFT: return 'L';
    case RIGHT: return 'R';
    default: throw new Error(selection);
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

class Differ
{

  constructor(isAtomic, node2string)
  {
    this.isAtomic = isAtomic;
    this.node2string = node2string;
  }

  computeSelection(leftNodes, rightNodes) // step 1
  {
    const N = leftNodes.length; // width
    const M = rightNodes.length; // height
  
    const a = new Uint16Array((N+1)*(M+1));
    // console.log(`N ${N} M ${M} a.length ${a.length}`);
    
    const index = (col, row) => row * (N+1) + col;
  
  
    // step 1a: fill in matrix
  
    a[index(0, 0)] = 0;
  
    for (let i = 1; i <= N; i++)
    {
      a[index(i, 0)] = i;
    }
  
    for (let j = 1; j <= M; j++)
    {
      a[index(0, j)] = j;
    }
  
    for (let j = 1; j <= M; j++)
    {
      for (let i = 1; i <= N; i++)
      {
        const leftNode = leftNodes[i-1];
        const rightNode = rightNodes[j-1];

        const match = leftNode[TYPE] === rightNode[TYPE] && (!this.isAtomic(leftNode[TYPE]) || leftNode[VAL] === rightNode[VAL]);
        if (match) 
        {
          a[index(i, j)] = a[index(i-1,j-1)]; 
        }
        else
        {
          const left = a[index(i-1, j)];
          const up = a[index(i, j-1)];
          if (left <= up)
          {
            a[index(i, j)] = left + 1;
          }
          else
          {
            a[index(i, j)] = up + 1;
          }
        }
        // console.log(`i ${i} j ${j} l ${this.node2string(left)} r ${this.node2string(right)}: ⬅︎ ${a[index(i-1,j)]} ⬉ ${a[index(i-1,j-1)]} ⬆︎ ${a[index(i,j-1)]}  => ${a[index(i,j)]} ${match ? '(match)' : (a[index(i-1, j)] <= a[index(i, j-1)] ) ? '(left)' : '(right)'}`); // DEBUG
      }
    }
    
    // console.log(`distance: ${a[index(N, M)]}`); // DEBUG 
  
    // // DEBUG:
    // for (let j = 0; j <= M; j++)
    // {
    //   let line = '';
    //   for (let i = 0; i <= N; i++)
    //   {
    //     line += `${a[index(i,j)]}\t`;
    //   }
    //   console.log(line);
    // }
  
    // step 1b: trace back optimal path
    let i = N;
    let j = M;
    const selection = [];
    let curr = a[index(i,j)];
    while (i !== 0 || j !== 0)
    {
      const left = a[index(i-1,j)];
      if (left === curr - 1)
      {
        selection.unshift(LEFT);    
        i--;
        curr = left;
        continue;
      }
  
      const up = a[index(i,j-1)];
      if (up === curr - 1)
      {
        selection.unshift(RIGHT);    
        j--;
        curr = up;
        continue;
      }
  
      selection.unshift(MATCH);    
      i--;
      j--;
      curr = a[index(i,j)];
    }
    return selection;
  }  

  selection2string(selection)
  {
    return selection.map(choice2string).join("");
  }

  selectionDistance(selection)
  {
    return selection.filter(selection => selection !== MATCH).length;
  }
  
  selection2edits(selection, leftNodes, rightNodes) // step2
  {
    
    const node2string = this.node2string;

    //stack
    const EXP = 0;
    const RPOS = 1;
    const RLEN = 2;
    const WPOS = 3;
    const WLEN = 4;
    const ORIG = 5;

    let c = 0;
    let i = 0;
    let j = 0;

    const sc = [];
    const edits = [];

    function consumeSelection()
    {
      return selection[c++];
    }

    function addNode(el)
    {
      const edit = [ADD_NODE, el]; 
      console.log(`\t\tadd node ${node2string(el)}`); // DDD
      edits.push(edit);
    }

    function deleteNode(el)
    {
      const edit = [DELETE_NODE, el];
      console.log(`\t\tremove node ${node2string(el)}`); // DDD
      edits.push(edit); 
    }

    function insertChild(tag, pos, insertedTag)
    {
      const edit = [INSERT_CHILD, tag, pos, insertedTag]; 
      console.log(`\t\tinsert child ${tag} ${pos} ${insertedTag}`); // DDD
      edits.push(edit); 
    }

    function removeChild(tag, pos)
    {
      const edit = [REMOVE_CHILD, tag, pos];
      console.log(`\t\tremove child ${tag} ${pos}`); // DDD
      edits.push(edit)
    }

    function frame2string(frame)
    {
      return `${node2string(frame[EXP])} R ${frame[RPOS]}/${frame[RLEN]} W ${frame[WPOS]}/${frame[WLEN]} |${choice2string(frame[ORIG])}|`;
    }

    function stack2string(stack)
    {
      return stack.map(frame2string).toReversed().join(" ");
    }

    function openWriteFrame()
    {
      for (let s = sc.length - 1; s >= 0; s--)
      {
        const frame = sc.at(s);
        // console.log(`\t\tinspecting ${s}/${sc.length - 1}`); // DEBUG
        const pos = frame[WPOS];
        const len = frame[WLEN];
        if (pos < len)
        {
          // console.log(`\t\t\tmatch frame ${frame2string(sc.at(s))}`) // DEBUG
          return frame; // assumption: M or R (L cannot have open write pos)
        }
      }
      return null; // no higher-up match
    }

    function openReadFrame()
    {
      for (let s = sc.length - 1; s >= 0; s--)
      {
        const frame = sc.at(s);
        // console.log(`\t\tinspecting ${s}/${sc.length - 1}`); // DEBUG
        const pos = frame[RPOS];
        const len = frame[RLEN];
        if (pos < len)
        {      
          // console.log(`\t\t\tmatch frame ${frame2string(sc.at(s))}`) // DEBUG
          return frame; // assumption: M or L (R cannot have open read pos)
        }
      }
      return null; // no higher-up match
    }

    function handleRead()
    {
      const readFrame = openReadFrame(); // only LEFT or MATCH orig
      if (readFrame !== null)
      {
        if (readFrame[ORIG] === MATCH)
        {
          removeChild(readFrame[EXP][TAG], readFrame[WPOS]);
        }
        readFrame[RPOS]++;
      }
    }

    function handleWriteMatch(leftNode)
    {
      const writeFrame = openWriteFrame(); // only RIGHT or MATCH orig
      if (writeFrame !== null)
      {
        if (writeFrame[ORIG] === MATCH)
        {
          insertChild(writeFrame[EXP][TAG], writeFrame[WPOS], leftNode[TAG]);
        }
        else if (writeFrame[ORIG] === RIGHT)
        {
          // strategy: instead of adding the 'new' right node and then updating it,
          // we immediately overwrite children in new nodes
          console.log(`\t\toverwrite ${node2string(writeFrame[EXP])} ${writeFrame[WPOS]} ${leftNode[TAG]}`); // DDD
          writeFrame[EXP][writeFrame[WPOS]+2] = leftNode[TAG]; // overwrite    
        }
        writeFrame[WPOS]++;  
      }
    }

    function handleWriteRight(rightNode)
    {
      const writeFrame = openWriteFrame(); // only RIGHT or MATCH orig
      if (writeFrame !== null)
      {
        if (writeFrame[ORIG] === MATCH)
        {
          insertChild(writeFrame[EXP][TAG], writeFrame[WPOS], rightNode[TAG]);
        }
        writeFrame[WPOS]++;  
      }
    }

    while (c < selection.length)
    {
      const choice = consumeSelection();
      const leftNode = leftNodes[i];
      const rightNode = rightNodes[j];
      console.log(`\n${leftNodes[i] && node2string(leftNode)} %c${choice2string(choice)}%c ${rightNode && node2string(rightNode)}`, 'color:blue', 'color:default'); // DDD
      // console.log(`\tstack ${stack2string(sc)}`);

      if (choice === MATCH) // always: leftNode[TYPE] === rightNode[TYPE]
      {
        deleteNode(rightNode); // keep left, remove right copy
        if (sc.length > 0)
        {
          handleWriteMatch(leftNode);
          handleRead();
        }
        if (!this.isAtomic(leftNode[TYPE]))
        {
          sc.push([leftNode, 0, leftNode.length - 2, 0, rightNode.length - 2, MATCH]); 
        }
        i++;
        j++;
      }
      else if (choice === LEFT)
      {
        deleteNode(leftNode);
        if (sc.length > 0)
        {
          handleRead();
        }
        if (!this.isAtomic(leftNode[TYPE]))
        {
          sc.push([leftNode, 0, leftNode.length - 2, -99, -99, LEFT]); 
        }
        i++;
      }
      else if (choice === RIGHT)
      {
        // add happens on pop for compound exps (due to possible overwrites) 
        if (sc.length > 0)
        {
          handleWriteRight(rightNode);
        }
        if (this.isAtomic(rightNode[TYPE]))
        {
          addNode(rightNode);
        }
        else
        {
          sc.push([rightNode.slice(0), -99, -99, 0, rightNode.length - 2, RIGHT]);
        }
        j++;      
      }
      else
      {
        throw new Error(choice);
      }

      console.log(`\t=> stack ${stack2string(sc)}`); // DDD

      while (sc.length > 0)
      {
        const top = sc.at(-1);
        const rpos = top[RPOS];
        const rlen = top[RLEN];
        const wpos = top[WPOS];
        const wlen = top[WLEN];
        const orig = top[ORIG];
        
        if (rpos === rlen && wpos === wlen)
        {    
          sc.pop();
          console.log(`\t\t\tpopping ${frame2string(top)}`); // DDD
          if (orig === RIGHT)
          {
            addNode(top[EXP]);
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

  coarsifyEdits(edits, n1s) // step 3 (optional): turn intra-node modifications etc. into node-level operations
  {
    const n1map = nodeMap(n1s);

    const modifs = [];
    const edits2 = [];
    for (const edit of edits)
    {
      if (edit[0] === INSERT_CHILD)
      {
        const [_, tag, pos, newTag] = edit;
        if (modifs[tag] === undefined)
        {
          modifs[tag] = n1map[tag].slice(0);
        }
        modifs[tag].splice(pos + 2, 0, newTag);
      }
      else if (edit[0] === REMOVE_CHILD)
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
        edits2.push(['replaceNode', n1map[modif[1]], modif]); 
      }
    }

    // console.log(`\nedits2:\n${edits2.join('\n')}`);  // DEBUG
    return edits2;
  }
  
  applyEdits(leftNodes, edits)
  {
    leftNodes = leftNodes.map(t => t.slice(0));
    const m = nodeMap(leftNodes);
    for (const edit of edits)
    {
      switch (edit[0])
      {
        case 'replaceNode':
          {
            m[edit[1][1]] = edit[2];
            break;
          }
        case ADD_NODE:
          {
            m[edit[1][1]] = edit[1];
            break;
          }
        case DELETE_NODE:
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
}
