export function refusalEvent(error,subject){return {type:'receipt.refused',subject:subject?.id??null,attributes:{code:error?.code??'unknown',message:String(error?.message??error)}};}
