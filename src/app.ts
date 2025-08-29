import * as d3 from 'd3';
import type { Step, SortStep } from './core/stepEngine';
import { mulberry32 } from './core/stepEngine';
import { generateStepsBubble } from './algorithms/sorting/bubble';
import { generateStepsInsertion } from './algorithms/sorting/insertion';
import { generateGrid, generateStepsBFS, Grid } from './algorithms/graph/bfs';

const svg = d3.select<SVGSVGElement, unknown>('#viz');
const legend = d3.select<HTMLDivElement, unknown>('#legend');
const W = 1000, H = 520;

type AppState = {
  algorithm: 'bubble'|'insertion'|'bfs',
  steps: Step[],
  stepIndex: number,
  playing: boolean,
  timer: d3.Timer | null,
  speed: number,
  // Sorting
  arr: number[],
  // Grid
  grid: Grid,
  N: number,
  wallProb: number,
  src: {r:number;c:number},
  dst: {r:number;c:number},
};

const state: AppState = {
  algorithm: 'bubble',
  steps: [],
  stepIndex: 0,
  playing: false,
  timer: null,
  speed: +(document.getElementById('speed') as HTMLInputElement).value,
  arr: [],
  grid: [],
  N: +(document.getElementById('gridSize') as HTMLInputElement).value,
  wallProb: +(document.getElementById('wallProb') as HTMLInputElement).value,
  src: {r:0,c:0},
  dst: {r:0,c:0}
};

// ------------- Controls
const algoSelect = document.getElementById('algorithm') as HTMLSelectElement;
const speedInput = document.getElementById('speed') as HTMLInputElement;
const speedVal = document.getElementById('speedVal') as HTMLSpanElement;
const playBtn = document.getElementById('play') as HTMLButtonElement;
const pauseBtn = document.getElementById('pause') as HTMLButtonElement;
const stepBtn = document.getElementById('step') as HTMLButtonElement;
const resetBtn = document.getElementById('reset') as HTMLButtonElement;
const shuffleBtn = document.getElementById('shuffle') as HTMLButtonElement;

const arrSize = document.getElementById('arrSize') as HTMLInputElement;
const arrSizeVal = document.getElementById('arrSizeVal') as HTMLSpanElement;
const arrSeed = document.getElementById('arrSeed') as HTMLInputElement;

const gridSize = document.getElementById('gridSize') as HTMLInputElement;
const gridSizeVal = document.getElementById('gridSizeVal') as HTMLSpanElement;
const wallProb = document.getElementById('wallProb') as HTMLInputElement;
const wallProbVal = document.getElementById('wallProbVal') as HTMLSpanElement;

algoSelect.addEventListener('change', () => {
  state.algorithm = algoSelect.value as AppState['algorithm'];
  toggleAlgoControls();
  build();
});

function toggleAlgoControls(){
  const showSorting = state.algorithm === 'bubble' || state.algorithm === 'insertion';
  document.querySelectorAll('.sorting-only').forEach(el => (el as HTMLElement).style.display = showSorting ? 'grid' : 'none');
  const showBFS = state.algorithm === 'bfs';
  document.querySelectorAll('.bfs-only').forEach(el => (el as HTMLElement).style.display = showBFS ? 'grid' : 'none');
  renderLegend();
}

speedInput.addEventListener('input', () => {
  state.speed = +speedInput.value; speedVal.textContent = String(state.speed); restartIfPlaying();
});

arrSize.addEventListener('input', ()=>{ arrSizeVal.textContent = arrSize.value; build(); });
gridSize.addEventListener('input', ()=>{ gridSizeVal.textContent = gridSize.value; build(); });
wallProb.addEventListener('input', ()=>{ wallProbVal.textContent = wallProb.value; build(); });

playBtn.addEventListener('click', play);
pauseBtn.addEventListener('click', pause);
stepBtn.addEventListener('click', () => { pause(); tick(); });
resetBtn.addEventListener('click', () => { pause(); build(); });
shuffleBtn.addEventListener('click', () => { pause(); build(true); });

function restartIfPlaying(){ if(state.playing){ pause(); play(); } }

// ------------- Legend
function getCss(varName: string){ return getComputedStyle(document.documentElement).getPropertyValue(varName).trim(); }
function renderLegend(){
  legend.selectAll('*').remove();
  if(state.algorithm === 'bubble' || state.algorithm === 'insertion'){
    addChip('#4b6cb7','Bar');
    addChip(getCss('--warn'), 'Compare');
    addChip(getCss('--accent2'), 'Swap / Shift');
    addChip('#1f9fff','Sorted');
  } else if(state.algorithm === 'bfs') {
    addChip('#0e1a34','Free');
    addChip('#263147','Wall');
    addChip('#6c8ad1','Frontier');
    addChip('#405985','Visited');
    addChip('#00b894','Path');
    addChip(getCss('--accent'), 'Source');
    addChip(getCss('--bad'),'Target');
  }
  function addChip(color: string, label: string){
    const g = legend.append('div').attr('class','chip');
    g.append('span').attr('class','dot').style('background', color);
    g.append('span').text(label);
  }
}

// ------------- Sorting render/anim
function makeArray(n: number, seedStr: string){
  let rng = Math.random;
  if(seedStr && seedStr.length){
    let seed = 0; for(const ch of seedStr) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    rng = mulberry32(seed);
  }
  const arr = d3.range(n).map(()=> Math.round(rng()*100)+5);
  return arr;
}

function renderBars(arr: number[]){
  svg.selectAll('*').remove();
  const margin = {top: 24, right: 24, bottom: 48, left: 24};
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand<number>().domain(d3.range(arr.length)).range([0, w]).paddingInner(0.1);
  const y = d3.scaleLinear().domain([0, d3.max(arr)!]).nice().range([0, h-10]);

  const data = arr.map((v,i)=>({v, i}));
  const bars = g.selectAll<SVGRectElement, {v:number;i:number}>('rect').data(data, (d:any)=>d.i);
  bars.enter().append('rect')
    .attr('class','bar')
    .attr('x', d=>x(d.i)!)
    .attr('y', d=>h - y(d.v))
    .attr('width', x.bandwidth())
    .attr('height', d=>y(d.v))
    .attr('fill', '#4b6cb7')
    .attr('rx', 2);

  g.append('text').attr('x', 0).attr('y', h+28).attr('fill', '#9db2cf').attr('font-size', 12).text('Index');
  g.append('text').attr('x', w).attr('y', -8).attr('text-anchor','end').attr('fill', '#9db2cf').attr('font-size', 12).text('Value');

  return {g, x, y, h, w};
}

function animateSortingStep(ctx: any, step: SortStep){
  const {g, x, y, h} = ctx;
  const bars = g.selectAll<SVGRectElement, any>('rect.bar');
  function setClass(i: number, cls: string, on=true){
    bars.filter((d:any)=>d.i === i).classed(cls, on);
  }
  if(step.type === 'compare'){
    setClass(step.i, 'compare', true);
    setClass(step.j, 'compare', true);
  }
  if(step.type === 'swap'){
    const b1 = bars.filter((d:any)=>d.i===step.i);
    const b2 = bars.filter((d:any)=>d.i===step.j);
    const d1 = b1.datum() as any;
    const d2 = b2.datum() as any;
    const tmpIndex = d1.i; d1.i = d2.i; d2.i = tmpIndex;
    const tmpv = d1.v; d1.v = d2.v; d2.v = tmpv;
    b1.transition().duration(state.speed).attr('x', (d:any)=>x(d.i)!).attr('y', (d:any)=>h - y(d.v)).attr('height', (d:any)=>y(d.v));
    b2.transition().duration(state.speed).attr('x', (d:any)=>x(d.i)!).attr('y', (d:any)=>h - y(d.v)).attr('height', (d:any)=>y(d.v));
    setClass(step.i, 'swap', true); setClass(step.j, 'swap', true);
    setTimeout(()=>{ setClass(step.i,'compare', false); setClass(step.j,'compare', false); setClass(step.i,'swap', false); setClass(step.j,'swap', false); }, state.speed*1.05);
  }
  if(step.type === 'overwrite'){
    const bar = bars.filter((d:any)=>d.i===step.index);
    bar.classed('swap', true);
    bar.datum((d:any)=>{ d.v = step.value; return d; });
    bar.transition().duration(state.speed).attr('y', (d:any)=>h - y(d.v)).attr('height', (d:any)=>y(d.v));
    setTimeout(()=> bar.classed('swap', false), state.speed*1.05);
  }
  if(step.type === 'markSorted'){
    setClass(step.index, 'sorted', true);
  }
}

// ------------- Grid render/anim
function renderGrid(grid: Grid){
  svg.selectAll('*').remove();
  const margin = {top: 24, right: 24, bottom: 24, left: 24};
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const N = grid.length;
  const cellSize = Math.min(Math.floor(w/N), Math.floor(h/N));
  const offsetX = Math.floor((w - cellSize*N)/2);
  const offsetY = Math.floor((h - cellSize*N)/2);

  const cells = g.selectAll<SVGRectElement, any>('rect.cell').data(grid.flat(), (d:any)=>`${d.r}-${d.c}`);
  cells.enter().append('rect')
    .attr('class','cell')
    .attr('x', (d:any)=> offsetX + d.c*cellSize)
    .attr('y', (d:any)=> offsetY + d.r*cellSize)
    .attr('width', cellSize)
    .attr('height', cellSize)
    .attr('rx', 2)
    .attr('fill', (d:any)=> d.wall ? '#263147' : '#0e1a34')
    .on('click', (ev: MouseEvent, d: any)=>{
      if(ev.shiftKey){ state.src = {r:d.r,c:d.c}; }
      else if(ev.altKey){ state.dst = {r:d.r,c:d.c}; }
      else { d.wall = !d.wall; }
      build(false, false);
    });

  g.append('rect').attr('class','cell src').attr('x', offsetX + state.src.c*cellSize).attr('y', offsetY + state.src.r*cellSize).attr('width', cellSize).attr('height', cellSize).attr('rx', 2).attr('fill', getCss('--accent')).attr('opacity', 0.7);
  g.append('rect').attr('class','cell dst').attr('x', offsetX + state.dst.c*cellSize).attr('y', offsetY + state.dst.r*cellSize).attr('width', cellSize).attr('height', cellSize).attr('rx', 2).attr('fill', getCss('--bad')).attr('opacity', 0.7);

  return {g, cellSize, offsetX, offsetY, N};
}

function animateGridStep(ctx: any, step: any){
  const {g} = ctx;
  const key = `${step.r}-${step.c}`;
  const cell = g.selectAll<SVGRectElement, any>('rect.cell').filter((d:any)=>`${d.r}-${d.c}`===key);
  if(step.type==='frontier') cell.transition().duration(state.speed).attr('fill','#6c8ad1');
  if(step.type==='visit') cell.transition().duration(state.speed).attr('fill','#405985');
  if(step.type==='path') cell.transition().duration(state.speed).attr('fill','#00b894');
}

// ------------- Engine
function play(){
  if(state.playing) return;
  state.playing = true;
  state.timer = d3.interval(()=>{ if(!tick()) { pause(); } }, state.speed);
}
function pause(){ if(state.timer){ state.timer.stop(); state.timer = null; } state.playing = false; }

function tick(){
  if(state.stepIndex >= state.steps.length) return false;
  const step = state.steps[state.stepIndex++] as Step;
  if(state.algorithm === 'bubble' || state.algorithm === 'insertion') animateSortingStep(currentCtx, step as SortStep);
  else if(state.algorithm === 'bfs') animateGridStep(currentCtx, step);
  return state.stepIndex < state.steps.length;
}

// ------------- Build / Reset
let currentCtx: any = null;
function build(regenerate=true, newSteps=true){
  if(state.algorithm === 'bubble' || state.algorithm === 'insertion'){
    const n = +arrSize.value;
    if(regenerate){
      state.arr = makeArray(n, arrSeed.value);
    }
    currentCtx = renderBars(state.arr);
    if(newSteps){
      state.steps = (state.algorithm==='bubble' ? generateStepsBubble(state.arr) : generateStepsInsertion(state.arr));
      state.stepIndex = 0;
    }
  } else if(state.algorithm === 'bfs'){
    state.N = +gridSize.value; state.wallProb = +wallProb.value;
    if(regenerate){
      state.grid = generateGrid(state.N, state.wallProb); state.src={r:0,c:0}; state.dst={r:state.N-1, c:state.N-1};
    }
    currentCtx = renderGrid(state.grid);
    if(newSteps){
      state.steps = generateStepsBFS(state.grid, state.src, state.dst); state.stepIndex = 0;
    }
  }
  renderLegend();
}

function init(){
  toggleAlgoControls();
  speedVal.textContent = String(state.speed);
  arrSizeVal.textContent = arrSize.value;
  gridSizeVal.textContent = gridSize.value;
  wallProbVal.textContent = wallProb.value;
  build(true, true);
}

init();

// expose for console debugging (optional)
// @ts-ignore
(window as any).state = state;
// @ts-ignore
(window as any).build = build;
// @ts-ignore
(window as any).play = play;
// @ts-ignore
(window as any).pause = pause;