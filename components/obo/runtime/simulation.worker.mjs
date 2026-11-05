import {run} from './index.mjs';
self.onmessage=({data})=>{
  try{self.postMessage({jobId:data.jobId,result:run(data.scenarioId,data.input,{record:data.record!==false})});}
  catch(error){self.postMessage({jobId:data.jobId,error:error instanceof Error?error.message:'계산하지 못했습니다.'});}
};
