varying vec2 vUv;

uniform float u_time;

mat2 rotate(in float angle) {
  return mat2(cos(angle), -sin(angle),
              sin(angle), cos(angle));
}

void main() {
  vec3 pos = position;
  pos.xz *= rotate(u_time*0.2);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

  gl_PointSize = 1.2;

  vUv = uv;
}
