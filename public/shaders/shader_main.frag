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

    float cells = 80.0;
    vec2 iuv = floor(uv*cells);
    vec2 fuv = fract(uv*cells);
    vec2 grid = (iuv+0.5) / cells;

    vec3 tex = texture(textureTest, grid).rgb;

    float ss = fwidth(sdCircle(fuv-0.5, 0.5));
    float circle = smoothstep(0.0-ss, 0.0+ss, sdCircle(fuv-0.5, 0.5));
    vec3 circleColor = vec3(1.0);
    vec3 bgColor = vec3(0.0);
    if(tex.r < 0.5) {
        circleColor = vec3(1.0, 0.0, 0.0);
    }
    vec3 finalColor = mix(circleColor, bgColor, circle);

    // fragColor = vec4(tex, 1.0);
    fragColor = vec4(finalColor, 1.0);
}