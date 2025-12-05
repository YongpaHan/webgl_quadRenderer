#version 300 es
precision highp float;

uniform vec2 resolution;
uniform sampler2D textureTest;
uniform float uTime;

float sdCircle( vec2 p, float r )
{
    return length(p) - r;
}

out vec4 fragColor;

void main(){
    vec2 rs = resolution.xy;
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    uv.x *= rs.x / rs.y;
    uv.y = 1.0 - uv.y;

    vec3 color = texture(textureTest, uv).rgb;
    fragColor = vec4(color, 1.0);
}