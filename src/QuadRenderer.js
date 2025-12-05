export class QuadRenderer {
  constructor(params = {}) {
    this.params = params;
    this.dpr = devicePixelRatio || 1;
    this.canvas = this.params.canvas || this.createCanvas();
    this.gl = this.canvas.getContext("webgl2");
    if (!this.gl) {
      console.error("webgl 호환 문제 발생");
    }

    this.shaderProgram = this.params.shader;
    this.uniforms = this.params.uniforms;
    this.uniformLocations = {};

    this.textureUnit = 0;

    this.buffer = new FrameBuffer(this.gl);

    this.params.uniforms.resolution = {
      value: [window.innerWidth * this.dpr, window.innerHeight * this.dpr],
    };

    this.isReady = false;
    this.init();
  }

  async init() {
    const gl = this.gl;
    gl.clearColor(1.0, 1.0, 0.5, 1.0);

    //셰이더프로그램 초기화
    if (this.shaderProgram) {
      const vsrc = this.shaderProgram.vertexShader;
      const fsrc = this.shaderProgram.fragmentShader;
      this.shaderProgram = await this.createShaderProgram(vsrc, fsrc);
      gl.useProgram(this.shaderProgram);

      for (const name in this.uniforms) {
        this.uniformLocations[name] = gl.getUniformLocation(
          this.shaderProgram,
          name
        );
      }
    }

    //정점좌표 정보 전달
    const vertices = new Float32Array([
      -1, 1, -1, -1, 1, -1, 1, -1, 1, 1, -1, 1,
    ]);
    const vertexBuffer = gl.createBuffer();
    const posLoc = gl.getAttribLocation(this.shaderProgram, "aPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    //초기 유니폼 전달
    this.setUniforms(this.uniforms);

    //준비끝
    this.isReady = true;

    //화면 크기 초기화
    this.resize();
  }

  render(renderToScreen = true) {
    if (!this.isReady) return;
    const gl = this.gl;

    gl.useProgram(this.shaderProgram);
    this.setUniforms(this.uniforms);

    if (renderToScreen) {
      this.buffer.unbind();
    } else {
      this.buffer.bind();
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  resize() {
    if (!this.isReady) return;
    const gl = this.gl;
    this.canvas.width = window.innerWidth * this.dpr;
    this.canvas.height = window.innerHeight * this.dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;

    this.params.uniforms.resolution = {
      value: [window.innerWidth * this.dpr, window.innerHeight * this.dpr],
    };

    gl.useProgram(this.shaderProgram);
    this.setUniforms(this.uniforms);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    this.buffer.resize(gl.canvas.width, gl.canvas.height);
  }

  setUniforms(uniforms) {
    const gl = this.gl;
    this.textureUnit = 0;

    for (const name in uniforms) {
      const uniform = uniforms[name];
      const location = this.uniformLocations[name];

      if (!location) continue;

      const value = uniform.value;

      if (value instanceof Texture) {
        gl.activeTexture(gl.TEXTURE0 + this.textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, value.texture);
        gl.uniform1i(location, this.textureUnit);
        this.textureUnit++;
      } else if (Array.isArray(value)) {
        const isFloat = !(value instanceof Int32Array);
        switch (value.length) {
          case 2:
            isFloat
              ? gl.uniform2fv(location, value)
              : gl.uniform2iv(location, value);
            break;
          case 3:
            isFloat
              ? gl.uniform3fv(location, value)
              : gl.uniform3iv(location, value);
            break;
          case 4:
            isFloat
              ? gl.uniform4fv(location, value)
              : gl.uniform4iv(location, value);
            break;
        }
      } else if (typeof value === "number") {
        if (Number.isInteger(value)) {
          gl.uniform1i(location, value);
        } else {
          gl.uniform1f(location, value);
        }
      }
    }
  }

  async createShaderProgram(vsrc, fsrc) {
    const gl = this.gl;
    const vShaderSrc = await fetch(vsrc).then((data) => data.text());
    const fShaderSrc = await fetch(fsrc).then((data) => data.text());

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vShaderSrc);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      throw new Error("정점 셰이더 오류:" + gl.getShaderInfoLog(vertexShader));
    }
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fShaderSrc);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      throw new Error(
        "픽셀 셰이더 오류:" + gl.getShaderInfoLog(fragmentShader)
      );
    }
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error("셰이더 프로그램 링크 오류:");
    }

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
  }

  createCanvas() {
    const canvas = document.createElement("canvas");
    canvas.id = "gl_canvas";
    canvas.width = window.innerWidth * this.dpr;
    canvas.height = window.innerHeight * this.dpr;
    canvas.style.display = "block";

    const body = document.querySelector("body");
    body.appendChild(canvas);

    return canvas;
  }
}

export class Texture {
  constructor(gl, params = {}) {
    this.gl = gl;
    this.src = params.src;
    this.data = params.data;
    this.width = params.width;
    this.height = params.height;
    this.format = params.format || gl.RGBA;
    this.internalFormat = params.internalFormat || this.format;
    this.type = params.type || gl.UNSIGNED_BYTE;
    this.wrapS = params.wrapS || gl.CLAMP_TO_EDGE;
    this.wrapT = params.wrapT || gl.CLAMP_TO_EDGE;
    this.minFilter = params.minFilter || gl.LINEAR;
    this.magFilter = params.magFilter || gl.LINEAR;
    this.generateMipmaps = params.generateMipmaps !== false;

    this.texture = gl.createTexture();
  }

  async loadImage() {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(err);
      image.src = this.src;
    });
  }

  async init() {
    const gl = this.gl;

    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    if (this.data) {
      //데이터텍스처
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        this.internalFormat,
        this.width,
        this.height,
        0,
        this.format,
        this.type,
        this.data
      );
    } else if (this.src) {
      // 이미지텍스처
      const image = await this.loadImage();
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        this.format,
        this.format,
        this.type,
        image
      );
    }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.wrapT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.magFilter);

    const ext = gl.getExtension("EXT_texture_filter_anisotropic");
    if (ext && this.src && this.src.includes("sdf")) {
      // SDF 텍스처인 경우만
      const max = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, max);
    }

    if (this.generateMipmaps && this.type === gl.UNSIGNED_BYTE) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    return this;
  }
}

class FrameBuffer {
  constructor(gl, params = {}) {
    this.gl = gl;
    this.width = params.width || gl.canvas.width;
    this.height = params.height || gl.canvas.height;

    this.colorTexture = new Texture(gl, {
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
      generateMipmaps: false,
    });

    this.framebuffer = null;
    this.depthBuffer = null;

    this.init();
  }

  init() {
    const gl = this.gl;
    if (!this.framebuffer) {
      this.framebuffer = gl.createFramebuffer();
    }

    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      this.colorTexture.format,
      this.width,
      this.height,
      0,
      this.colorTexture.format,
      gl.UNSIGNED_BYTE,
      null
    );

    // 텍스처 파라미터 <- 이거 설정 안 하고 텍스처 전달 안 돼서 정신병 걸릴 뻔
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      this.colorTexture.minFilter
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      this.colorTexture.magFilter
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.colorTexture.wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.colorTexture.wrapT);

    gl.bindTexture(gl.TEXTURE_2D, null);

    if (!this.depthBuffer) {
      this.depthBuffer = gl.createRenderbuffer();
    }
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
    gl.renderbufferStorage(
      gl.RENDERBUFFER,
      gl.DEPTH_COMPONENT16,
      this.width,
      this.height
    );
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    // 프레임버퍼에 텍스처와 뎁스버퍼를 연결하는 작업은 매번 해줘도 안전합니다.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.colorTexture.texture,
      0
    );
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      this.depthBuffer
    );

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.error("프레임버퍼를 생성할 수 없습니다: " + status);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  bind() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.viewport(0, 0, this.width, this.height);
  }

  unbind() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.init();
  }
}
