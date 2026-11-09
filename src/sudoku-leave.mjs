let handler=null;
export function registerSudokuLeave(fn){handler=fn;return()=>{if(handler===fn)handler=null;};}
export async function prepareSudokuLeave(){return handler?handler():true;}
