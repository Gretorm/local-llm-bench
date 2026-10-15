/* mesher.js - turns chunk blocks + light into triangle geometry */
(function () {
  'use strict';

  // corners: [x,y,z, u,v]  - CCW when viewed from outside (normal n)
  var FACES = [
    { d: [0, 1, 0], shade: 1.0, face: 't', c: [[0, 1, 1, 0, 1], [1, 1, 1, 1, 1], [1, 1, 0, 1, 0], [0, 1, 0, 0, 0]] },
    { d: [0, -1, 0], shade: 0.55, face: 'b', c: [[0, 0, 0, 0, 0], [1, 0, 0, 1, 0], [1, 0, 1, 1, 1], [0, 0, 1, 0, 1]] },
    { d: [1, 0, 0], shade: 0.62, face: 's', c: [[1, 0, 0, 0, 0], [1, 1, 0, 0, 1], [1, 1, 1, 1, 1], [1, 0, 1, 1, 0]] },
    { d: [-1, 0, 0], shade: 0.62, face: 's', c: [[0, 0, 1, 1, 0], [0, 1, 1, 1, 1], [0, 1, 0, 0, 1], [0, 0, 0, 0, 0]] },
    { d: [0, 0, 1], shade: 0.8, face: 's', c: [[1, 0, 1, 1, 0], [1, 1, 1, 1, 1], [0, 1, 1, 0, 1], [0, 0, 1, 0, 0]] },
    { d: [0, 0, -1], shade: 0.8, face: 's', c: [[0, 0, 0, 0, 0], [0, 1, 0, 0, 1], [1, 1, 0, 1, 1], [1, 0, 0, 1, 0]] }
  ];

  var AO_LEVELS = [0.5, 0.72, 0.86, 1.0];

  function Mesher(world, atlasRectFn) {
    this.world = world;
    this.uvRect = atlasRectFn;
  }

  Mesher.prototype.build = function (cx, cz) {
    var world = this.world, CHUNK = 16, HEIGHT = 80;
    var ch = world.getChunk(cx, cz);
    if (!ch) return null;
    var x0 = cx * CHUNK, z0 = cz * CHUNK;
    var blocks = ch.blocks;

    var pos = [], uv = [], sh = [], idx = [];
    var wpos = [], wuv = [], wsh = [], widx = [];
    var ppos = [], puuv = [], psh = [], pidx = [];

    function tileFor(b, faceName) {
      var t = b.tex;
      if (faceName === 't') return t.t;
      if (faceName === 'b') return t.b != null ? t.b : t.s;
      return t.s;
    }

    function solidAO(x, y, z) {
      if (y < 0 || y >= HEIGHT) return y < 0;
      var b = world.peek(x, y, z);
      if (b === 0 || b === 7 || b === 14) return false;
      return !Blocks.def[b].plant;
    }

    function emitFace(arr_pos, arr_uv, arr_sh, arr_idx, cell, face, light, u0, v0, u1, v1) {
      var v = arr_idx.length / 3;
      for (var i = 0; i < 4; i++) {
        var cc = face.c[i];
        var vx = cell[0] + cc[0], vy = cell[1] + cc[1], vz = cell[2] + cc[2];
        arr_pos.push(vx, vy, vz);
        arr_uv.push(u0 + cc[3] * (u1 - u0), v0 + cc[4] * (v1 - v0));
        // AO: side1/side2 = blocks adjacent along the two tangent axes, sc = diagonal corner
        var ax = cc[0] < 0.5 ? -1 : 1, az = cc[2] < 0.5 ? -1 : 1, ay = cc[1] < 0.5 ? -1 : 1;
        var s1o = [0, 0, 0], s2o = [0, 0, 0];
        if (face.d[1] !== 0) { s1o = [ax, 0, 0]; s2o = [0, 0, az]; }
        else if (face.d[0] !== 0) { s1o = [0, ay, 0]; s2o = [0, 0, az]; }
        else { s1o = [ax, 0, 0]; s2o = [0, ay, 0]; }
        var wx = cell[0] + face.d[0], wy = cell[1] + face.d[1], wz = cell[2] + face.d[2];
        var s1 = solidAO(wx + s1o[0], wy + s1o[1], wz + s1o[2]);
        var s2 = solidAO(wx + s2o[0], wy + s2o[1], wz + s2o[2]);
        var sc = solidAO(wx + s1o[0] + s2o[0], wy + s1o[1] + s2o[1], wz + s1o[2] + s2o[2]);
        var ao = (s1 && s2) ? 0 : 3 - (s1 ? 1 : 0) - (s2 ? 1 : 0) - (sc ? 1 : 0);
        arr_sh.push(light * face.shade * AO_LEVELS[ao]);
      }
      arr_idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
    }

    for (var y = 0; y < HEIGHT; y++) for (var lz = 0; lz < CHUNK; lz++) for (var lx = 0; lx < CHUNK; lx++) {
      var i = lx + lz * CHUNK + y * CHUNK * 16;
      var b = blocks[i];
      if (b === 0) continue;
      var x = x0 + lx, z = z0 + lz, y2 = y;
      var def = Blocks.def[b];

      if (def.plant) {
        // cross quads
        var L = world.lightAt(x, y2, z) / 15;
        var rec = this.uvRect(def.tex.s);
        var quads = [
          [[0, 0, 0], [0, 1, 0], [1, 1, 1], [1, 0, 1]],
          [[0, 0, 1], [0, 1, 1], [1, 1, 0], [1, 0, 0]]
        ];
        for (var q = 0; q < 2; q++) {
          var v = pidx.length / 3;
          var cc = quads[q];
          for (var k = 0; k < 4; k++) {
            ppos.push(x + cc[k][0], y2 + cc[k][1], z + cc[k][2]);
            puuv.push(cc[k][0], cc[k][1]);
            psh.push(L * 1.0);
          }
          // remap uv to tile
          var base = puuv.length - 8;
          for (var k2 = 0; k2 < 4; k2++) {
            puuv[base + k2 * 2] = rec.u0 + puuv[base + k2 * 2] * (rec.u1 - rec.u0);
            puuv[base + k2 * 2 + 1] = rec.v0 + puuv[base + k2 * 2 + 1] * (rec.v1 - rec.v0);
          }
          pidx.push(v, v + 1, v + 2, v, v + 2, v + 3);
        }
        continue;
      }

      if (b === 7) { // water
        var wl = world.lightAt(x, y2, z) / 15;
        var wr = this.uvRect(def.tex.t);
        for (var f = 0; f < 6; f++) {
          var fc = FACES[f];
          var nx = x + fc.d[0], ny = y2 + fc.d[1], nz = z + fc.d[2];
          var nb = world.peek(nx, ny, nz);
          if (nb === 7) continue;
          if (nb !== 0 && nb !== 14 && !Blocks.def[nb].plant) continue;
          if (fc.d[1] === -1) continue; // no bottom face
          emitFace(wpos, wuv, wsh, widx, [x, y2, z], fc, wl * 0.95, wr.u0, wr.v0, wr.u1, wr.v1);
        }
        continue;
      }

      // solid blocks (incl. glass, leaves)
      for (var f2 = 0; f2 < 6; f2++) {
        var fc2 = FACES[f2];
        var nx2 = x + fc2.d[0], ny2 = y2 + fc2.d[1], nz2 = z + fc2.d[2];
        var nb2 = world.peek(nx2, ny2, nz2);
        if (nb2 === b && (b === 14 || b === 9 || b === 11)) continue; // same see-through block
        if (!Blocks.def[nb2].seesThrough) continue;
        var L2 = world.lightAt(nx2, ny2, nz2) / 15;
        var rec2 = this.uvRect(tileFor(def, fc2.face));
        emitFace(pos, uv, sh, idx, [x, y2, z], fc2, L2, rec2.u0, rec2.v0, rec2.u1, rec2.v1);
      }
    }

    function makeGeom(pos, uvArr, sh, idx) {
      if (!idx.length) return null;
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
      g.setAttribute('shade', new THREE.Float32BufferAttribute(sh, 1));
      g.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
      g.computeBoundingSphere();
      return g;
    }

    return {
      opaque: makeGeom(pos, uv, sh, idx),
      water: makeGeom(wpos, wuv, wsh, widx),
      plant: makeGeom(ppos, puuv, psh, pidx)
    };
  };

  window.Mesher = Mesher;
})();
