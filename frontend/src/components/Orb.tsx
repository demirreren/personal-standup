import { Mesh, Program, Renderer, Triangle, Vec3 } from "ogl";
import { useEffect, useRef } from "react";

interface OrbProps {
  hue?: number;
  hoverIntensity?: number;
  rotateOnHover?: boolean;
  forceHoverState?: boolean;
  backgroundColor?: string;
}

function hexToVec3(color: string) {
  if (color.startsWith("#")) {
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;
    return new Vec3(r, g, b);
  }
  return new Vec3(0, 0, 0);
}

const VERT = `
  precision highp float;
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAG = `
  precision highp float;
  uniform float iTime;
  uniform vec3 iResolution;
  uniform float hue;
  uniform float hover;
  uniform float rot;
  uniform float hoverIntensity;
  uniform vec3 backgroundColor;
  varying vec2 vUv;

  vec3 rgb2yiq(vec3 c) { return vec3(dot(c,vec3(.299,.587,.114)),dot(c,vec3(.596,-.274,-.322)),dot(c,vec3(.211,-.523,.312))); }
  vec3 yiq2rgb(vec3 c) { return vec3(c.x+.956*c.y+.621*c.z,c.x-.272*c.y-.647*c.z,c.x-1.106*c.y+1.703*c.z); }
  vec3 adjustHue(vec3 color, float hueDeg) {
    float hr = hueDeg*3.14159265/180.0;
    vec3 yiq = rgb2yiq(color);
    float i2 = yiq.y*cos(hr)-yiq.z*sin(hr);
    float q2 = yiq.y*sin(hr)+yiq.z*cos(hr);
    return yiq2rgb(vec3(yiq.x,i2,q2));
  }
  vec3 hash33(vec3 p3) {
    p3 = fract(p3*vec3(.1031,.11369,.13787));
    p3 += dot(p3,p3.yxz+19.19);
    return -1.0+2.0*fract(vec3(p3.x+p3.y,p3.x+p3.z,p3.y+p3.z)*p3.zyx);
  }
  float snoise3(vec3 p) {
    const float K1=.333333333; const float K2=.166666667;
    vec3 i=floor(p+(p.x+p.y+p.z)*K1);
    vec3 d0=p-(i-(i.x+i.y+i.z)*K2);
    vec3 e=step(vec3(0.0),d0-d0.yzx);
    vec3 i1=e*(1.0-e.zxy); vec3 i2=1.0-e.zxy*(1.0-e);
    vec3 d1=d0-(i1-K2); vec3 d2=d0-(i2-K1); vec3 d3=d0-0.5;
    vec4 h=max(0.6-vec4(dot(d0,d0),dot(d1,d1),dot(d2,d2),dot(d3,d3)),0.0);
    vec4 n=h*h*h*h*vec4(dot(d0,hash33(i)),dot(d1,hash33(i+i1)),dot(d2,hash33(i+i2)),dot(d3,hash33(i+1.0)));
    return dot(vec4(31.316),n);
  }
  vec4 extractAlpha(vec3 c) { float a=max(max(c.r,c.g),c.b); return vec4(c/(a+1e-5),a); }

  const vec3 bc1=vec3(.611765,.262745,.996078);
  const vec3 bc2=vec3(.298039,.760784,.913725);
  const vec3 bc3=vec3(.062745,.078431,.600000);
  const float ir=0.6; const float ns=0.65;

  float light1(float i,float a,float d){return i/(1.0+d*a);}
  float light2(float i,float a,float d){return i/(1.0+d*d*a);}

  vec4 draw(vec2 uv) {
    vec3 c1=adjustHue(bc1,hue); vec3 c2=adjustHue(bc2,hue); vec3 c3=adjustHue(bc3,hue);
    float ang=atan(uv.y,uv.x); float len=length(uv); float il=len>0.0?1.0/len:0.0;
    float bl=dot(backgroundColor,vec3(.299,.587,.114));
    float n0=snoise3(vec3(uv*ns,iTime*0.5))*0.5+0.5;
    float r0=mix(mix(ir,1.0,0.4),mix(ir,1.0,0.6),n0);
    float d0=distance(uv,(r0*il)*uv);
    float v0=light1(1.0,10.0,d0);
    v0*=smoothstep(r0*1.05,r0,len);
    float inf=smoothstep(r0*0.8,r0*0.95,len);
    v0*=mix(inf,1.0,bl*0.7);
    float cl=cos(ang+iTime*2.0)*0.5+0.5;
    float a=iTime*-1.0; vec2 pos=vec2(cos(a),sin(a))*r0;
    float d=distance(uv,pos);
    float v1=light2(1.5,5.0,d); v1*=light1(1.0,50.0,d0);
    float v2=smoothstep(1.0,mix(ir,1.0,n0*0.5),len);
    float v3=smoothstep(ir,mix(ir,1.0,0.5),len);
    vec3 cb=mix(c1,c2,cl);
    float fa=mix(1.0,0.1,bl);
    vec3 dk=mix(c3,cb,v0); dk=(dk+v1)*v2*v3; dk=clamp(dk,0.0,1.0);
    vec3 lk=(cb+v1)*mix(1.0,v2*v3,fa); lk=mix(backgroundColor,lk,v0); lk=clamp(lk,0.0,1.0);
    return extractAlpha(mix(dk,lk,bl));
  }

  vec4 mainImage(vec2 fc) {
    vec2 ctr=iResolution.xy*0.5; float sz=min(iResolution.x,iResolution.y);
    vec2 uv=(fc-ctr)/sz*2.0;
    float s=sin(rot),c=cos(rot); uv=vec2(c*uv.x-s*uv.y,s*uv.x+c*uv.y);
    uv.x+=hover*hoverIntensity*0.1*sin(uv.y*10.0+iTime);
    uv.y+=hover*hoverIntensity*0.1*sin(uv.x*10.0+iTime);
    return draw(uv);
  }

  void main() {
    vec4 col=mainImage(vUv*iResolution.xy);
    gl_FragColor=vec4(col.rgb*col.a,col.a);
  }
`;

export default function Orb({
  hue = 0,
  hoverIntensity = 0.2,
  rotateOnHover = true,
  forceHoverState = false,
  backgroundColor = "#000000",
}: OrbProps) {
  const ctnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctn = ctnRef.current;
    if (!ctn) return;

    const renderer = new Renderer({ alpha: true, premultipliedAlpha: false });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    ctn.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Vec3(gl.canvas.width, gl.canvas.height, 1) },
        hue: { value: hue },
        hover: { value: 0 },
        rot: { value: 0 },
        hoverIntensity: { value: hoverIntensity },
        backgroundColor: { value: hexToVec3(backgroundColor) },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      if (!ctn) return;
      const dpr = window.devicePixelRatio || 1;
      const w = ctn.clientWidth, h = ctn.clientHeight;
      renderer.setSize(w * dpr, h * dpr);
      gl.canvas.style.width = w + "px";
      gl.canvas.style.height = h + "px";
      program.uniforms.iResolution.value.set(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);
    };
    window.addEventListener("resize", resize);
    resize();

    let targetHover = 0;
    let lastTime = 0;
    let currentRot = 0;

    const onMove = (e: MouseEvent) => {
      const rect = ctn.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      const ux = ((e.clientX - rect.left - rect.width / 2) / size) * 2;
      const uy = ((e.clientY - rect.top - rect.height / 2) / size) * 2;
      targetHover = Math.sqrt(ux * ux + uy * uy) < 0.8 ? 1 : 0;
    };
    const onLeave = () => { targetHover = 0; };
    ctn.addEventListener("mousemove", onMove);
    ctn.addEventListener("mouseleave", onLeave);

    let rafId: number;
    const update = (t: number) => {
      rafId = requestAnimationFrame(update);
      const dt = (t - lastTime) * 0.001;
      lastTime = t;
      program.uniforms.iTime.value = t * 0.001;
      program.uniforms.hue.value = hue;
      program.uniforms.hoverIntensity.value = hoverIntensity;
      const eh = forceHoverState ? 1 : targetHover;
      program.uniforms.hover.value += (eh - program.uniforms.hover.value) * 0.1;
      if (rotateOnHover && eh > 0.5) currentRot += dt * 0.3;
      program.uniforms.rot.value = currentRot;
      program.uniforms.backgroundColor.value = hexToVec3(backgroundColor);
      renderer.render({ scene: mesh });
    };
    rafId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      ctn.removeEventListener("mousemove", onMove);
      ctn.removeEventListener("mouseleave", onLeave);
      if (gl.canvas.parentNode === ctn) ctn.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [hue, hoverIntensity, rotateOnHover, forceHoverState, backgroundColor]);

  return <div ref={ctnRef} className="orb-container" />;
}
