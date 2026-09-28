import {sha256} from './digest.mjs';export function event(type,subject,attributes={}){const body={type,subject:subject.id??subject,attributes};return {...body,id:sha256(body)};}
