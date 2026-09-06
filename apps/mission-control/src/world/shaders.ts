export const noiseGLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){ float f=0.0; float a=0.5; for(int i=0;i<5;i++){ f+=a*snoise(p); p=p*2.03+vec3(11.7,3.1,7.9); a*=0.5; } return f; }
`;

/** Signature nebula: domain-warped fbm in three palette bands, rendered on the inside of a sky sphere. */
export const nebulaVertex = /* glsl */ `
varying vec3 vDir;
void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;
export const nebulaFragment = /* glsl */ `
precision highp float;
${noiseGLSL}
uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uDust; uniform float uDensity; uniform float uWarp;
varying vec3 vDir;
void main(){
  vec3 d=vDir;
  float t=uTime*0.02;
  vec3 q=vec3(fbm(d*1.6+t), fbm(d*1.6+vec3(5.2,1.3,2.8)-t), fbm(d*1.6+vec3(9.1,4.4,6.3)));
  vec3 warped=d*2.2+uWarp*q;
  float n1=fbm(warped+t*0.5);
  float n2=fbm(warped*1.9-vec3(2.0,7.0,1.0)+t*0.3);
  float band=smoothstep(-0.25,0.6,n1);
  float veil=smoothstep(0.05,0.75,n2);
  vec3 col=mix(uA,uB,band);
  col=mix(col,uC,veil*0.75);
  float dust=smoothstep(0.35,0.95,fbm(d*9.0+q*0.5));
  col+=uDust*dust*0.35;
  float lum=(band*0.55+veil*0.45)*uDensity;
  col*=lum;
  float horizon=smoothstep(-0.9,0.4,d.y);
  col*=0.35+0.65*horizon;
  gl_FragColor=vec4(col,1.0);
}
`;

/** Emissive transit lane: gradient body plus a travelling packet at uProgress. */
export const laneVertex = /* glsl */ `
varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;
export const laneFragment = /* glsl */ `
precision highp float;
uniform vec3 uColor; uniform float uProgress; uniform float uCharge; uniform float uTime; uniform float uPacket;
varying vec2 vUv;
void main(){
  float along=vUv.x;
  float body=0.12+0.25*uCharge;
  float packet=uPacket*exp(-pow((along-uProgress)*22.0,2.0));
  float pulse=0.5+0.5*sin(along*40.0-uTime*3.0);
  float glow=body*(0.75+0.25*pulse*uCharge)+packet*1.8;
  float edge=smoothstep(0.0,0.35,vUv.y)*smoothstep(1.0,0.65,vUv.y);
  gl_FragColor=vec4(uColor*glow,glow*edge);
}
`;

/** Interference lattice between two contested claims. */
export const interferenceFragment = /* glsl */ `
precision highp float;
uniform vec3 uColor; uniform float uTime; varying vec2 vUv;
void main(){
  float a=sin((vUv.x*18.0)+uTime*1.2); float b=sin((vUv.y*18.0)-uTime*0.9);
  float moire=0.5+0.5*a*b;
  float ring=smoothstep(0.02,0.0,abs(fract(vUv.x*6.0)-0.5)-0.45);
  float alpha=(moire*0.65+ring*0.35)*smoothstep(0.0,0.15,vUv.x)*smoothstep(1.0,0.85,vUv.x);
  gl_FragColor=vec4(uColor,alpha*0.85);
}
`;

/** Mind Scan wave: a single expanding ring on a ground plane. */
export const scanFragment = /* glsl */ `
precision highp float;
uniform vec3 uColor; uniform float uRadius; uniform float uActive; varying vec2 vUv;
void main(){
  vec2 p=(vUv-0.5)*2.0; float r=length(p);
  float ring=exp(-pow((r-uRadius)*14.0,2.0));
  float trail=smoothstep(uRadius,uRadius-0.35,r)*0.08;
  float alpha=(ring*0.9+trail)*uActive*smoothstep(1.0,0.9,r);
  gl_FragColor=vec4(uColor,alpha);
}
`;
