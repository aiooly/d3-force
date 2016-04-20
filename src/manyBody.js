import {quadtree} from "d3-quadtree";
import constant from "./constant";

var tau = 2 * Math.PI;

export default function() {
  var nodes,
      charge = constant(-100),
      charges,
      distanceMin2 = 1,
      distanceMax2 = Infinity,
      theta2 = 0.64,
      target,
      targetAlpha;

  function force(alpha) {
    var tree = quadtree(), n = nodes.length, i;
    targetAlpha = alpha;
    for (i = 0; i < n; ++i) tree.add(nodes[i].x, nodes[i].y).index = i;
    tree.visitAfter(accumulate);
    for (i = 0; i < n; ++i) target = nodes[i], tree.visit(apply);
  }

  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length;
    charges = new Array(n);
    for (i = 0; i < n; ++i) charges[i] = +charge(nodes[i], i, nodes);
  }

  function accumulate(quad) {
    if (!quad.length) return quad.charge = charges[quad.index]; // TODO sum charges of coincident nodes

    for (var x = 0, y = 0, charge = 0, child, i = 0; i < 4; ++i) {
      if (child = quad[i]) {
        charge += child.charge;
        x += child.charge * child.x;
        y += child.charge * child.y;
      }
    }

    quad.x = x / charge;
    quad.y = y / charge;
    quad.charge = charge;
  }

  function apply(quad, x1, _, x2) {
    if (quad.length || quad.index !== target.index) {
      var dx = quad.x - target.x,
          dy = quad.y - target.y,
          dw = x2 - x1,
          l = dx * dx + dy * dy;

      // Randomize direction for exactly-coincident nodes.
      if (!l) l = Math.random() * tau, dx = Math.cos(l), dy = Math.sin(l), l = 1;

      // Limit forces for very close nodes.
      if (l < distanceMin2) l = Math.sqrt(l / distanceMin2), dx /= l, dy /= l, l = distanceMin2;

      if (dw * dw / theta2 < l) { // Barnes-Hut criterion
        if (l < distanceMax2) {
          l = quad.charge * targetAlpha / l;
          target.vx += dx * l;
          target.vy += dy * l;
        }
        return true;
      }

      if (!quad.length && l < distanceMax2) { // TODO handle coincident nodes
        l = charges[quad.index] * targetAlpha / l;
        target.vx += dx * l;
        target.vy += dy * l;
      }
    }

    return !quad.charge;
  }

  force.nodes = function(_) {
    return arguments.length ? (nodes = _, initialize(), force) : nodes;
  };

  force.charge = function(_) {
    return arguments.length ? (charge = typeof _ === "function" ? _ : constant(+_), initialize(), force) : charge;
  };

  force.distanceMin = function(_) {
    return arguments.length ? (distanceMin2 = _ * _, force) : Math.sqrt(distanceMin2);
  };

  force.distanceMax = function(_) {
    return arguments.length ? (distanceMax2 = _ * _, force) : Math.sqrt(distanceMax2);
  };

  force.theta = function(_) {
    return arguments.length ? (theta2 = _ * _, force) : Math.sqrt(theta2);
  };

  return force;
}
