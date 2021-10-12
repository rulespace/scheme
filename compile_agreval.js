import { specification as analysis_specification } from './agreval-rsp.js';
import { compileToModuleSrc } from 'rulespace';
import fs from 'fs';

import { lattice_conc as lattice } from './lattice-rsp.js';
import { kalloc_conc as kalloc } from './kalloc-rsp.js';


const evaluatorModuleSrc = compileToModuleSrc(kalloc + lattice + analysis_specification, 
                                              {debug:false, profile:false});
fs.writeFileSync('./compiled/agreval_module.mjs', evaluatorModuleSrc);
