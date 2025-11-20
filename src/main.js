import "./style.css";
import { QuadRenderer, Texture } from "./QuadRenderer.js";

let mainPass;
let textureTest;
let uTime = 0;
let uMouse = [0.5, 0.5];

async function main() {
  mainPass = new QuadRenderer({
    shader: {
      vertexShader: "/shaders/shader.vert",
      fragmentShader: "/shaders/shader_main.frag",
    },
    uniforms: {
      textureTest: { value: null },
      uTime: { uTime },
      uMouse: { value: uMouse },
    },
  });

  await Promise.all([mainPass.init()]);

  textureTest = new Texture(mainPass.gl, {
    src: "../images/cuphead.webp",
    minFilter: mainPass.gl.LINEAR,
    magFilter: mainPass.gl.LINEAR,
  });
  await textureTest.init();
  mainPass.uniforms.textureTest.value = textureTest;

  animate();
  window.addEventListener(
    "resize",
    debounce(() => resize(), 24)
  );
}

function update() {
  uTime += 0.01;
  mainPass.uniforms.uTime.value = uTime;
  // mouse =
}

function render() {
  mainPass.render(true);
}

function animate() {
  update();
  render();
  requestAnimationFrame(animate);
}

function resize() {
  mainPass.resize();
}

main();

//실행을 지연시켜 리사이징 최적화
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
