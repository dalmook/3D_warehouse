import {experiment,summary} from './city-experiments.mjs';
self.onmessage=e=>{try{const {a,b}=e.data;self.postMessage({a:summary(experiment(a)),b:summary(experiment(b)),seeds:[11,22,33,44,55],duration:600});}catch(error){self.postMessage({error:error.message});}};
