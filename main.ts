// Push-optimal Sokoban: boxes never leave their room, so each room is solved alone by BFS over pushes, then chained.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const L = 'udlr';
const solve = (txt: string): string => {
  const g = txt.split('\n').filter((l) => l.length);
  const H = g.length, W = Math.max(...g.map((l) => l.length));
  const D = [-W, W, -1, 1];
  const ch = (i: number) => g[Math.floor(i / W)][i % W] ?? '#';
  const wall: boolean[] = [], box: boolean[] = [], goal: boolean[] = [];
  let me = 0;
  for (let i = 0; i < W * H; i++) {
    const c = ch(i);
    wall[i] = c === '#';
    box[i] = c === '$' || c === '*';
    goal[i] = c === '.' || c === '*' || c === '+';
    if (c === '@' || c === '+') me = i;
  }
  const row = Math.floor(me / W);
  const seen: boolean[] = [];
  let out = '';
  const walk = (to: number) => {
    const par = new Map<number, number>([[me, -1]]);
    const q = [me];
    for (let h = 0; h < q.length && !par.has(to); h++)
      for (let d = 0; d < 4; d++) {
        const n = q[h] + D[d];
        if (!wall[n] && !box[n] && !par.has(n)) (par.set(n, q[h]), q.push(n));
      }
    let s = '';
    for (let c = to; c !== me; c = par.get(c)!) s = L[D.indexOf(c - par.get(c)!)] + s;
    out += s;
    me = to;
  };
  for (let s = 0; s < W * H; s++) {
    if (wall[s] || seen[s] || Math.floor(s / W) === row) continue;
    const cells = [s];
    seen[s] = true;
    for (let h = 0; h < cells.length; h++)
      for (const d of D) {
        const n = cells[h] + d;
        if (!wall[n] && !seen[n] && Math.floor(n / W) !== row) (seen[n] = true, cells.push(n));
      }
    const door = cells.find((c) => Math.abs(Math.floor(c / W) - row) === 1 && !wall[Math.floor(c / W) < row ? c + W : c - W])!;
    const out0 = Math.floor(door / W) < row ? door + W : door - W;
    const loc = [...cells, out0];
    const n = loc.length, O0 = n - 1;
    const idx = new Map(loc.map((c, i) => [c, i]));
    const nb = loc.map((c) => D.map((d) => idx.get(c + d) ?? -1));
    const gl = loc.map((c) => goal[c]);
    const region = (bs: number[], p: number) => {
      const v: boolean[] = [];
      v[p] = true;
      const q = [p];
      for (let h = 0; h < q.length; h++)
        for (const m of nb[q[h]]) if (m >= 0 && !v[m] && !bs.includes(m)) (v[m] = true, q.push(m));
      return v;
    };
    const key = (bs: number[], p: number) => bs.reduce((a, b) => a * 64 + b, p);
    const canon = (bs: number[], p: number) => {
      const v = region(bs, p);
      return [v, v.findIndex((x) => x)] as const;
    };
    const b0 = cells.filter((c) => box[c]).map((c) => idx.get(c)!);
    const st: { b: number[]; p: number; par: number; mv: number }[] = [];
    const vis = new Set<number>();
    st.push({ b: b0, p: canon(b0, O0)[1], par: -1, mv: -1 });
    vis.add(key(b0, st[0].p));
    let end = -1;
    for (let h = 0; h < st.length && end < 0; h++) {
      const { b, p } = st[h];
      const [v] = canon(b, p);
      if (v[O0] && b.every((x) => gl[x])) { end = h; break; }
      for (const x of b)
        for (let d = 0; d < 4; d++) {
          const behind = nb[x][d ^ 1], to = nb[x][d];
          if (behind < 0 || to < 0 || to === O0 || !v[behind] || b.includes(to)) continue;
          const nbx = b.map((y) => (y === x ? to : y)).sort((a, c) => a - c);
          const np = canon(nbx, x)[1];
          const k = key(nbx, np);
          if (vis.has(k)) continue;
          vis.add(k);
          st.push({ b: nbx, p: np, par: h, mv: x * 4 + d });
        }
    }
    const pushes: number[] = [];
    for (let h = end; st[h].par >= 0; h = st[h].par) pushes.unshift(st[h].mv);
    for (const m of pushes) {
      const c = loc[m >> 2], d = m & 3;
      walk(c - D[d]);
      box[c] = false;
      box[c + D[d]] = true;
      out += L[d].toUpperCase();
      me = c;
    }
  }
  return out;
};
for (const id of readdirSync(I).sort()) {
  const moves = solve(readFileSync(join(I, id, 'level.txt'), 'utf8'));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'solution.txt'), `${moves}\n`);
}
