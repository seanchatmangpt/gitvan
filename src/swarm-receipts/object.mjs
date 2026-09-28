import {sha256} from './digest.mjs';export function object(type,attributes={}){const body={type,attributes};return {...body,id:sha256(body)};}
