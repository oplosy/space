/* ------------------------------------------------------------------ *
 *  GLSL library
 * ------------------------------------------------------------------ */
const GLSL_NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
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
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p,int oct){float a=0.5,s=0.0;for(int i=0;i<8;i++){if(i>=oct)break;s+=a*snoise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=0.5;}return s;}
vec3 hash33(vec3 p){p=fract(p*vec3(443.897,441.423,437.195));p+=dot(p,p.yxz+19.19);return fract((p.xxy+p.yxx)*p.zyx);}
// Crater field: returns height (negative bowls, positive rims); fresh = rim/ejecta mask
float craters(vec3 p,float density,out float fresh){
  vec3 ip=floor(p),fp=fract(p);float h=0.0;fresh=0.0;
  for(int k=-1;k<=1;k++)for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
    vec3 o=vec3(float(i),float(j),float(k));vec3 r=hash33(ip+o);
    if(fract(r.z*13.7)>density)continue;
    float rad=0.14+0.32*r.x*r.x;
    float x=length(o+r-fp)/rad;
    if(x<2.2){
      float bowl=x<1.0?(x*x-1.0)*0.55:0.0;
      float rim=exp(-(x-1.0)*(x-1.0)*14.0)*0.28;
      float ej=x>1.0?exp(-(x-1.0)*2.2)*0.05:0.0;
      h+=(bowl+rim+ej)*rad;
      fresh=max(fresh,(1.0-smoothstep(0.9,1.9,x))*step(0.75,r.y));
    }
  }
  return h;
}
`;

const GLSL_SHADOW = /* glsl */`
uniform vec3 uSunPos; uniform float uSunR;
uniform vec4 uOcc[4]; uniform vec3 uOccLeak[4]; uniform int uOccN;
// Fraction of the solar disc (angular radius rs) hidden by a disc of radius ro at separation d: exact lens area
float discCover(float rs,float ro,float d){
  if(d>=rs+ro)return 0.0;
  if(d<=abs(rs-ro))return ro>=rs?1.0:(ro*ro)/(rs*rs);
  float a=(rs*rs-ro*ro)/rs/rs, dd=d/rs, rr=ro/rs;
  float c1=clamp((dd*dd+1.0-rr*rr)/(2.0*dd),-1.0,1.0), c2=clamp((dd*dd+rr*rr-1.0)/(2.0*dd*rr),-1.0,1.0);
  float k=max((-dd+1.0+rr)*(dd+1.0-rr)*(dd-1.0+rr)*(dd+1.0+rr),0.0);
  return clamp((acos(c1)+rr*rr*acos(c2)-0.5*sqrt(k))/3.14159265,0.0,1.0);
}
vec3 sunVis(vec3 p){
  vec3 toS=uSunPos-p; float dS=length(toS); vec3 sd=toS/dS;
  float rs=asin(clamp(uSunR/dS,0.0,1.0));
  vec3 vis=vec3(1.0);
  for(int i=0;i<4;i++){
    if(i>=uOccN)break;
    vec3 toO=uOcc[i].xyz-p; float dO=length(toO);
    if(dO>dS||dO<uOcc[i].w)continue;
    vec3 od=toO/dO; float ca=dot(od,sd); if(ca<=0.0)continue;
    float ro=asin(clamp(uOcc[i].w/dO,0.0,1.0));
    float sep=atan(length(cross(od,sd)),ca);
    vis*=mix(vec3(1.0),uOccLeak[i],discCover(rs,ro,sep));
  }
  return vis;
}
// Tangent-free bump mapping (Mikkelsen, "Bump Mapping Unparametrized Surfaces on the GPU")
vec3 perturbNormal(vec3 pos,vec3 N,float h){
  vec3 dpx=dFdx(pos),dpy=dFdy(pos); float dhx=dFdx(h),dhy=dFdy(h);
  vec3 r1=cross(dpy,N),r2=cross(N,dpx); float det=dot(dpx,r1);
  if(abs(det)<1e-20)return N;
  vec3 g=sign(det)*(dhx*r1+dhy*r2);
  return normalize(abs(det)*N-g);
}
`;

const VERT_BODY = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
uniform vec3 uNormalScale;
uniform vec3 uAxes; uniform float uIrregular; uniform float uSeed;
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vObj;
${GLSL_NOISE}
void main(){
  vUv=uv; vObj=normalize(position);
  vec3 p=position;
  if(uIrregular>0.5){
    float r=1.0+0.16*fbm(vObj*1.1+uSeed,3)+0.05*snoise(vObj*3.7+uSeed);
    p=vObj*r*uAxes;
  }
  vec4 wp=modelMatrix*vec4(p,1.0); vWorld=wp.xyz;
  vN=normalize(mat3(modelMatrix)*(normal*uNormalScale));
  gl_Position=projectionMatrix*viewMatrix*wp;
  #include <logdepthbuf_vertex>
}`;

const FRAG_HEAD = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uSunI; uniform vec3 uSunColor; uniform float uAmbient;
uniform vec3 uShineDir; uniform float uShineI; uniform vec3 uPole;
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vObj;
float lum(vec3 c){return dot(c,vec3(0.2126,0.7152,0.0722));}
vec3 safe(vec3 c){return (any(isnan(c))||any(isinf(c)))?vec3(0.0):max(c,vec3(0.0));}
`;

/* Lighting models: 0 Lambert, 1 regolith (Lommel–Seeliger/Lambert blend), 2 Minnaert (giants), 3 cloud deck */
const GLSL_LIGHT = /* glsl */`
float brdf(int model,float mu0,float mu){
  if(model==1){ return 0.72*2.0*mu0/(mu0+max(mu,0.05))+0.28*mu0; }
  if(model==2){ return pow(mu0,1.05)*pow(max(mu,1e-3),0.05); }
  if(model==3){ return pow(mu0,0.9); }
  return mu0;
}
`;

const FRAG_TEX = /* glsl */`
${FRAG_HEAD}
${GLSL_NOISE}
${GLSL_SHADOW}
${GLSL_LIGHT}
uniform sampler2D uMap; uniform float uBump; uniform int uModel; uniform vec3 uTint; uniform float uRadius;
uniform vec3 uRim; uniform float uBands;
uniform float uHasRing; uniform sampler2D uRingTex; uniform vec3 uCenter; uniform float uRingIn; uniform float uRingOut;
void main(){
  #include <logdepthbuf_fragment>
  vec3 Ng=normalize(vN);
  vec3 alb=texture2D(uMap,vUv).rgb*uTint;
  if(uBands>0.0){
    float lat=asin(clamp(dot(vObj,vec3(0.0,1.0,0.0)),-1.0,1.0));
    alb*=1.0+uBands*(sin(lat*23.0+fbm(vObj*vec3(2.0,30.0,2.0),3)*1.5)*0.6+fbm(vObj*vec3(6.0,40.0,6.0),2)*0.5);
  }
  vec3 N=Ng;
  if(uBump>0.0){
    vec3 E=cross(uPole,Ng); E=dot(E,E)>1e-10?normalize(E):vec3(1.0,0.0,0.0); vec3 Nn=cross(Ng,E);
    vec2 du=vec2(1.0/2048.0,0.0), dv=vec2(0.0,1.0/1024.0);
    float hx=lum(texture2D(uMap,vUv+du).rgb)-lum(texture2D(uMap,vUv-du).rgb);
    float hy=lum(texture2D(uMap,vUv+dv).rgb)-lum(texture2D(uMap,vUv-dv).rgb);
    float cl=max(length(Ng-uPole*dot(Ng,uPole)),0.15);
    N=normalize(Ng-uBump*0.09*(hx/cl*E+hy*Nn));
  }
  vec3 L=normalize(uSunPos-vWorld), V=normalize(cameraPosition-vWorld);
  float mu0=max(dot(N,L),0.0), mu=max(dot(N,V),0.0);
  float term=smoothstep(-0.02,0.04,dot(Ng,L));
  vec3 vis=sunVis(vWorld);
  if(uHasRing>0.5){
    float dn=dot(L,uPole);
    if(abs(dn)>1e-4){
      float t=dot(uCenter-vWorld,uPole)/dn;
      if(t>0.0){
        float r=length(vWorld+L*t-uCenter);
        float u=(r-uRingIn)/(uRingOut-uRingIn);
        if(u>0.0&&u<1.0) vis*=1.0-0.88*texture2D(uRingTex,vec2(u,0.5)).a;
      }
    }
  }
  vec3 col=alb*brdf(uModel,mu0,mu)*term*vis*uSunI*uSunColor;
  float rimF=pow(1.0-mu,3.0)*smoothstep(-0.1,0.4,dot(Ng,L));
  col+=uRim*rimF*0.35*uSunI*vis;
  col+=alb*uShineI*max(dot(Ng,uShineDir),0.0);
  col+=alb*uAmbient;
  gl_FragColor=vec4(safe(col),1.0);
}`;

const FRAG_EARTH = /* glsl */`
${FRAG_HEAD}
${GLSL_SHADOW}
uniform sampler2D uDay, uNight, uClouds, uSpec; uniform float uCloudShift;
void main(){
  #include <logdepthbuf_fragment>
  vec3 N=normalize(vN);
  vec3 L=normalize(uSunPos-vWorld), V=normalize(cameraPosition-vWorld);
  vec3 E=cross(uPole,N); E=dot(E,E)>1e-10?normalize(E):vec3(1.0,0.0,0.0); vec3 Nn=cross(N,E);
  float mu0=dot(N,L), mu=max(dot(N,V),0.0);
  vec3 vis=sunVis(vWorld);
  float light=lum(vis);
  vec3 day=texture2D(uDay,vUv).rgb;
  float water=texture2D(uSpec,vUv).r;
  day=mix(day,day*vec3(0.5,0.62,0.78),smoothstep(0.3,0.7,water));
  vec2 cuv=vec2(vUv.x+uCloudShift,vUv.y);
  float cloud=smoothstep(0.08,0.95,texture2D(uClouds,cuv).r);
  float coslat=max(length(N-uPole*dot(N,uPole)),0.05);
  vec2 sh=vec2(dot(L,E)/coslat/6.2832,dot(L,Nn)/3.1416)*0.0019/max(mu0,0.12);
  float cshadow=smoothstep(0.08,0.95,texture2D(uClouds,cuv-sh).r);
  float diff=clamp((mu0+0.03)/1.03,0.0,1.0);
  vec3 ground=day*diff*(1.0-0.55*cshadow);
  vec3 H=normalize(L+V);
  float nh=max(dot(N,H),0.0);
  float fres=0.02+0.98*pow(1.0-max(dot(H,V),0.0),5.0);
  float glint=water*(pow(nh,220.0)*3.2+pow(nh,28.0)*0.18)*fres*8.0*step(0.0,mu0)*diff;
  ground+=vec3(1.0,0.93,0.82)*glint*(1.0-cloud);
  float cl=clamp(mu0*1.05+0.06,0.0,1.0);
  vec3 cloudTint=mix(vec3(1.0,0.52,0.28),vec3(1.0),smoothstep(0.0,0.3,mu0));
  vec3 surf=mix(ground,vec3(0.96)*cl*cloudTint,cloud*0.96);
  vec3 col=surf*uSunI*uSunColor*vis;
  float darkness=max(1.0-smoothstep(-0.12,0.06,mu0),(1.0-smoothstep(0.0,0.1,light))*step(0.0,mu0));
  vec3 night=texture2D(uNight,vUv).rgb;
  night=pow(night,vec3(1.15))*vec3(1.0,0.8,0.55);
  col+=night*darkness*(1.0-cloud*0.7)*4.5;
  col+=day*uAmbient;
  gl_FragColor=vec4(safe(col),1.0);
}`;

const FRAG_PROC = /* glsl */`
${FRAG_HEAD}
${GLSL_NOISE}
${GLSL_SHADOW}
${GLSL_LIGHT}
uniform vec3 uColA, uColB; uniform float uCrater, uRelief, uSeed, uRadius, uIrregular; uniform int uStyle; uniform int uModel;
vec3 dirLL(float lat,float lon){return vec3(cos(lat)*cos(lon),sin(lat),-cos(lat)*sin(lon));}
void surface(vec3 p,out vec3 alb,out float h){
  vec3 s=p+uSeed;
  float n=fbm(s*2.6,5);
  alb=mix(uColA,uColB,smoothstep(-0.45,0.55,n));
  float fr=0.0, f1, f2, f3;
  float c=0.0;
  if(uCrater>0.0){
    c=craters(s*3.2,0.55*uCrater,f1)+0.55*craters(s*7.5+3.1,0.6*uCrater,f2)+0.3*craters(s*17.0+7.7,0.7*uCrater,f3);
    fr=max(f1,max(f2*0.8,f3*0.6));
  }
  h=c+0.12*n;
  float lat=asin(clamp(p.y,-1.0,1.0)); float lon=atan(-p.z,p.x);
  if(uStyle==0||uStyle==6||uStyle==7){
    alb*=1.0+0.25*fr; alb*=1.0+0.35*c;
    if(uStyle==6){ // Mimas: Herschel
      float d=acos(clamp(dot(p,dirLL(-0.03,radians(-112.0))),-1.0,1.0))/0.35;
      if(d<1.6){ h+=(d<1.0?(d*d-1.0)*0.9+exp(-d*d*60.0)*0.6:0.0)+exp(-(d-1.0)*(d-1.0)*30.0)*0.35; }
    }
    if(uStyle==7){ h=h*1.6+0.2*fbm(s*9.0,3); alb*=0.8+0.4*smoothstep(-0.3,0.5,fbm(s*6.0,3)); }
  } else if(uStyle==1){ // Io
    float n2=fbm(s*2.1+10.0,4);
    alb=mix(alb,vec3(0.78,0.45,0.18),smoothstep(0.05,0.55,n2)*0.75);
    alb=mix(alb,uColB,smoothstep(0.25,0.6,fbm(s*3.3+4.0,4))*0.7);
    float v=snoise(s*8.5);
    alb=mix(alb,vec3(0.72,0.24,0.1),smoothstep(0.5,0.6,v)*(1.0-smoothstep(0.64,0.72,v))*0.6);
    alb=mix(alb,vec3(0.07,0.05,0.04),smoothstep(0.72,0.8,v));
    alb=mix(alb,alb*vec3(0.72,0.55,0.45),smoothstep(0.55,0.95,abs(p.y)));
  } else if(uStyle==2){ // Europa
    alb=mix(uColA,uColA*vec3(0.82,0.74,0.64),smoothstep(-0.2,0.6,fbm(s*3.0,5)));
    for(int k=0;k<3;k++){
      float fk=float(k);
      float ln=abs(snoise(s*(2.2+fk*2.6)+fk*5.3));
      alb=mix(alb,uColB,(1.0-smoothstep(0.0,0.028-fk*0.006,ln))*(0.75-fk*0.18));
    }
    alb=mix(alb,uColB*0.95,smoothstep(0.35,0.6,fbm(s*4.0+2.0,4))*0.55);
  } else if(uStyle==3){ // Ganymede
    float t=smoothstep(-0.12,0.18,fbm(s*1.7,4));
    vec3 light=uColB*(1.0+0.12*sin(dot(p,normalize(vec3(0.3,0.8,0.5)))*140.0+fbm(s*5.0,2)*8.0));
    alb=mix(uColA*(0.9+0.2*n),light,t);
    alb=mix(alb,vec3(0.85,0.86,0.9),smoothstep(0.62,0.85,abs(p.y))*0.6);
    alb+=vec3(0.35)*fr;
  } else if(uStyle==4){ // Callisto
    alb=mix(uColA,uColA*1.25,smoothstep(-0.3,0.5,n));
    alb=mix(alb,uColB,fr*0.85);
    float d=acos(clamp(dot(p,dirLL(0.26,radians(-56.0))),-1.0,1.0));
    alb+=vec3(0.05)*(0.5+0.5*sin(d*55.0))*(1.0-smoothstep(0.1,0.9,d));
  } else if(uStyle==5){ // Pluto
    alb=mix(uColA,uColA*vec3(1.08,0.95,0.85),smoothstep(-0.4,0.5,fbm(s*4.0,5)));
    float edge=0.06*fbm(s*6.0,3);
    float sp=acos(clamp(dot(p,dirLL(radians(22.0),radians(178.0))),-1.0,1.0));
    float el=acos(clamp(dot(p,dirLL(radians(2.0),radians(-148.0))),-1.0,1.0));
    float heart=max(1.0-smoothstep(0.28,0.33,sp+edge),(1.0-smoothstep(0.33,0.4,el+edge))*0.8);
    alb=mix(alb,uColB,heart);
    float cth=smoothstep(radians(-22.0),radians(-14.0),lat)*(1.0-smoothstep(radians(4.0),radians(14.0),lat+edge))
             *smoothstep(radians(10.0),radians(30.0),lon)*(1.0-smoothstep(radians(140.0),radians(160.0),lon+edge*2.0));
    alb=mix(alb,vec3(0.22,0.11,0.08),cth*0.9);
    alb=mix(alb,vec3(0.7,0.66,0.58),smoothstep(radians(55.0),radians(70.0),lat)*0.7);
    h=h*(1.0-heart)+heart*0.02*fbm(s*20.0,2);
  } else if(uStyle==8){ // Enceladus
    alb=uColA*(0.96+0.04*n);
    float south=smoothstep(radians(-55.0),radians(-70.0),lat);
    float stripes=1.0-smoothstep(0.0,0.05,abs(sin((p.x*0.8+p.z*0.6)*18.0+fbm(s*4.0,2)*1.2)));
    alb=mix(alb,uColB*0.85,stripes*south);
    h*=(1.0-south);
  } else if(uStyle==9){ // Titan (haze deck)
    alb=mix(uColA,uColB,smoothstep(-0.8,0.8,sin(lat*3.0)+0.3*fbm(s*vec3(2.0,6.0,2.0),3)));
    alb*=1.0-0.2*smoothstep(radians(50.0),radians(75.0),lat);
    h=0.0;
  } else if(uStyle==10){ // Iapetus: dark leading hemisphere (centred on 90°W → +Z)
    float lead=dot(p,vec3(0.0,0.0,1.0))-0.55*abs(p.y)+0.14*fbm(s*3.0,4);
    alb=mix(uColB,uColA,smoothstep(-0.08,0.1,lead));
    h+=exp(-lat*lat*3000.0)*0.4*smoothstep(-0.2,0.3,lead);
  } else if(uStyle==11){ // Miranda
    float reg=smoothstep(0.1,0.3,fbm(s*1.6,3));
    alb=mix(alb,mix(uColA,uColB,0.5+0.5*sin(dot(p,normalize(vec3(1.0,0.2,0.4)))*70.0)),reg);
    h+=reg*0.15*sin(dot(p,normalize(vec3(1.0,0.2,0.4)))*70.0);
  } else if(uStyle==12){ // Triton
    float cap=1.0-smoothstep(radians(-20.0),radians(-5.0),lat+0.1*n);
    vec3 north=uColB*(0.9+0.2*fbm(s*14.0,3));
    alb=mix(north,uColA,cap);
    float streak=smoothstep(0.55,0.75,snoise(s*vec3(10.0,3.0,10.0)))*cap;
    alb=mix(alb,vec3(0.3,0.26,0.24),streak*0.7);
  } else if(uStyle==13){ // Charon
    alb*=1.0+0.25*c;
    alb=mix(alb,uColB,smoothstep(radians(58.0),radians(72.0),lat+0.05*n));
    float bl=(lat-0.05)*9.0; float belt=exp(-bl*bl);
    alb*=1.0-0.15*belt*smoothstep(0.0,0.4,fbm(s*8.0,3));
  }
}
void main(){
  #include <logdepthbuf_fragment>
  vec3 Ng = uIrregular>0.5 ? normalize(cross(dFdx(vWorld),dFdy(vWorld))) : normalize(vN);
  vec3 alb; float h;
  surface(vObj,alb,h);
  vec3 N=normalize(mix(Ng,perturbNormal(vWorld,Ng,h*uRelief*uRadius),0.8));
  vec3 L=normalize(uSunPos-vWorld), V=normalize(cameraPosition-vWorld);
  float mu0=max(dot(N,L),0.0), mu=max(dot(N,V),0.0);
  float term=smoothstep(-0.03,0.05,dot(Ng,L));
  vec3 vis=sunVis(vWorld);
  vec3 col=alb*brdf(uModel,mu0,mu)*term*vis*uSunI*uSunColor;
  col+=alb*uShineI*max(dot(Ng,uShineDir),0.0);
  col+=alb*uAmbient;
  gl_FragColor=vec4(safe(col),1.0);
}`;

/* Single-scattering atmosphere (Rayleigh + Mie), ray-marched in planet radii */
const VERT_ATMO = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vWorld;
void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vWorld=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp;
  #include <logdepthbuf_vertex>
}`;
const FRAG_ATMO = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
${GLSL_SHADOW}
uniform vec3 uCenter; uniform float uRp; uniform float uTop; uniform vec3 uBetaR; uniform float uBetaM;
uniform float uHR, uHM, uG, uIntensity; uniform vec3 uCamLocal;
varying vec3 vWorld;
vec2 rs(vec3 ro,vec3 rd,float r){float b=dot(ro,rd);float c=dot(ro,ro)-r*r;float h=b*b-c;if(h<0.0)return vec2(1e9,-1e9);h=sqrt(h);return vec2(-b-h,-b+h);}
void main(){
  #include <logdepthbuf_fragment>
  float Ra=1.0+uTop;
  vec3 ro=uCamLocal;
  vec3 rd=normalize(vWorld-cameraPosition);
  vec2 ta=rs(ro,rd,Ra); if(ta.x>ta.y) discard;
  vec2 tp=rs(ro,rd,1.0);
  float t0=max(ta.x,0.0), t1=ta.y;
  if(tp.x<tp.y&&tp.x>0.0) t1=min(t1,tp.x);
  if(t1<=t0) discard;
  vec3 L=normalize(uSunPos-uCenter);
  const int N=14; const int M=6;
  float dt=(t1-t0)/float(N);
  vec3 sR=vec3(0.0), sM=vec3(0.0); float oR=0.0, oM=0.0;
  for(int i=0;i<N;i++){
    vec3 p=ro+rd*(t0+dt*(float(i)+0.5));
    float h=max(length(p)-1.0,0.0);
    float dR=exp(-h/uHR)*dt, dM=exp(-h/uHM)*dt;
    oR+=dR; oM+=dM;
    vec2 tl=rs(p,L,Ra);
    vec2 tpl=rs(p,L,0.998);
    if(tpl.x<tpl.y&&tpl.x>0.0) continue;
    float dl=tl.y/float(M); float lR=0.0,lM=0.0;
    for(int j=0;j<M;j++){ vec3 q=p+L*dl*(float(j)+0.5); float hq=max(length(q)-1.0,0.0); lR+=exp(-hq/uHR)*dl; lM+=exp(-hq/uHM)*dl; }
    vec3 att=exp(-(uBetaR*(oR+lR)+uBetaM*1.1*(oM+lM)))*sunVis(uCenter+p*uRp);
    sR+=dR*att; sM+=dM*att;
  }
  float mu=dot(rd,L);
  float phR=0.0596831*(1.0+mu*mu);
  float g=uG; float phM=0.1193662*((1.0-g*g)*(1.0+mu*mu))/((2.0+g*g)*pow(1.0+g*g-2.0*g*mu,1.5));
  vec3 col=uIntensity*(sR*uBetaR*phR+sM*uBetaM*phM);
  vec3 tr=exp(-(uBetaR*oR+uBetaM*1.1*oM));
  float a=clamp(1.0-dot(tr,vec3(0.3333)),0.0,1.0);
  if(any(isnan(col))||isnan(a)){col=vec3(0.0);a=0.0;}
  gl_FragColor=vec4(col,a);
}`;

const FRAG_RING = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uRingTex; uniform float uRin, uRout; uniform vec3 uCenter; uniform float uPlanetR; uniform vec3 uPole;
uniform vec3 uSunPos; uniform float uSunI;
varying vec3 vLocal; varying vec3 vWorld;
void main(){
  #include <logdepthbuf_fragment>
  float r=length(vLocal.xz); float u=(r-uRin)/(uRout-uRin);
  if(u<0.0||u>1.0) discard;
  vec4 t=texture2D(uRingTex,vec2(u,0.5));
  float a=t.a; if(a<0.003) discard;
  float l=dot(t.rgb,vec3(0.3,0.5,0.2));
  vec3 col=mix(vec3(0.55,0.47,0.38),vec3(1.0,0.92,0.78),smoothstep(0.03,0.32,l))*1.25;
  vec3 L=normalize(uSunPos-vWorld), V=normalize(cameraPosition-vWorld);
  float sl=dot(uPole,L), sv=dot(uPole,V);
  float lit=sl*sv>0.0 ? 0.55+0.45*abs(sl)*2.0 : (1.0-a)*0.9+0.06;
  vec3 oc=vWorld-uCenter; float b=dot(oc,L); float c=dot(oc,oc)-uPlanetR*uPlanetR;
  float dmin=sqrt(max(dot(oc,oc)-b*b,0.0));
  float sh=b<0.0 ? smoothstep(uPlanetR*0.985,uPlanetR*1.015,dmin) : 1.0;
  float ph=0.85+0.8*pow(max(dot(-V,L),0.0),6.0);
  vec3 outc=col*uSunI*min(lit,1.2)*sh*ph;
  gl_FragColor=vec4(outc*a,a);
}`;
const VERT_RING = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vLocal; varying vec3 vWorld;
void main(){ vLocal=position; vec4 wp=modelMatrix*vec4(position,1.0); vWorld=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp;
  #include <logdepthbuf_vertex>
}`;

const FRAG_SUN = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
${GLSL_NOISE}
uniform float uTime, uIntensity;
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vObj;
void main(){
  #include <logdepthbuf_fragment>
  vec3 p=vObj;
  vec3 V=normalize(cameraPosition-vWorld); float mu=max(dot(normalize(vN),V),0.0);
  float t=uTime;
  vec3 q=p*95.0; float fw=length(fwidth(q));
  float fine=1.0-smoothstep(0.35,1.4,fw);
  float g=0.5*snoise(p*16.0+vec3(0.0,t*0.004,0.0));
  float cells=(1.0-abs(snoise(q+vec3(t*0.02))))*0.55+(1.0-abs(snoise(q*2.1-vec3(t*0.03))))*0.3;
  float n=0.45*g+fine*(cells-0.5);
  float lat=abs(p.y);
  float belt=smoothstep(0.08,0.18,lat)*(1.0-smoothstep(0.45,0.6,lat));
  float act=smoothstep(0.45,0.8,snoise(p*2.3+vec3(7.0,3.0,t*0.0002)))*belt;
  float sn=0.75*snoise(p*17.0+vec3(3.1,1.7,0.0))+0.25*snoise(p*45.0);
  float umbra=smoothstep(0.5,0.62,sn)*act, pen=smoothstep(0.28,0.5,sn)*act;
  float fac=smoothstep(0.05,0.4,act)*(1.0-pen)*(1.0-mu);
  vec3 base=vec3(1.0,0.84,0.62);
  vec3 u=vec3(0.42,0.56,0.74);
  vec3 limb=1.0-u*(1.0-pow(mu,0.85));
  vec3 col=base*limb*(1.0+0.14*n);
  col*=1.0-0.4*pen-0.5*umbra;
  col+=vec3(0.25,0.18,0.1)*fac;
  gl_FragColor=vec4(col*uIntensity,1.0);
}`;

const VERT_BILLBOARD = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uSize; varying vec2 vUv;
void main(){ vUv=position.xy; vec4 mv=modelViewMatrix*vec4(0.0,0.0,0.0,1.0); mv.xy+=position.xy*uSize; gl_Position=projectionMatrix*mv;
  #include <logdepthbuf_vertex>
}`;
const FRAG_CORONA = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
${GLSL_NOISE}
uniform float uK, uTime, uI; uniform vec3 uColor; varying vec2 vUv;
void main(){
  #include <logdepthbuf_fragment>
  float r=max(length(vUv)*uK,1.0);
  float ang=atan(vUv.y,vUv.x);
  float st=0.5+0.5*snoise(vec3(cos(ang)*2.2,sin(ang)*2.2,r*0.12-uTime*0.01));
  st=clamp(st,0.0,1.0); st*=st;
  float g=0.55*pow(r,-3.2)+0.07*pow(r,-1.7)*(0.45+0.9*st);
  g*=1.0-smoothstep(uK*0.55,uK,r);
  gl_FragColor=vec4(uColor*g*uI,1.0);
}`;
const VERT_GLARE = /* glsl */`
uniform vec3 uCenter; uniform vec2 uRes; uniform float uSizePx; varying vec2 vUv;
void main(){
  vUv=position.xy;
  vec4 c=projectionMatrix*viewMatrix*vec4(uCenter,1.0);
  if(c.w<=0.0){ gl_Position=vec4(2.0,2.0,2.0,1.0); return; }
  gl_Position=vec4(c.xy/c.w+position.xy*uSizePx*2.0/uRes,0.0,1.0);
}`;
const FRAG_GLARE = /* glsl */`
uniform float uI; varying vec2 vUv;
void main(){
  float r=length(vUv); float a=atan(vUv.y,vUv.x);
  float core=exp(-r*r*900.0)*6.0;
  float halo=0.012/(r*r*22.0+0.02)*exp(-r*3.5);
  float sp=pow(abs(cos(a*3.0+0.35)),220.0)+0.6*pow(abs(cos(a*3.0+0.35+1.0472*0.5)),300.0);
  float spikes=sp*exp(-r*5.5)*0.45;
  float rr=(r-0.42)*28.0; float ring=exp(-rr*rr)*0.012;
  vec3 col=vec3(1.0,0.9,0.76)*(core+halo+spikes)+vec3(0.5,0.7,1.0)*ring;
  col*=uI*(1.0-smoothstep(0.75,1.0,r));
  gl_FragColor=vec4(col,1.0);
}`;

const VERT_LINE = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aFade; varying float vF;
void main(){ vF=aFade; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  #include <logdepthbuf_vertex>
}`;
const FRAG_LINE = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uColor; uniform float uOpacity; uniform float uDash; varying float vF;
void main(){
  #include <logdepthbuf_fragment>
  float a=uOpacity*(0.1+0.9*pow(clamp(1.0-vF,0.0,1.0),1.5));
  if(uDash>0.0 && fract(vF*uDash)>0.55) discard;
  gl_FragColor=vec4(uColor,a);
}`;

const VERT_STARS = /* glsl */`
attribute vec3 aColor; attribute float aMag;
uniform float uScale, uBright; varying vec3 vC;
void main(){
  vec3 v=mat3(viewMatrix)*position;
  gl_Position=projectionMatrix*vec4(v,1.0);
  float s=pow(10.0,-0.4*(aMag-6.5));
  gl_PointSize=clamp(1.25*pow(s,0.2),1.2,7.5)*uScale;
  vC=aColor*clamp(0.11*pow(s,0.5),0.02,3.5)*uBright;
}`;
const FRAG_STARS = /* glsl */`
varying vec3 vC;
void main(){ vec2 d=gl_PointCoord-0.5; float r2=dot(d,d)*4.0; float a=exp(-r2*4.5); gl_FragColor=vec4(vC*a,1.0); }`;

const VERT_SKYLINE = /* glsl */`
void main(){ vec3 v=mat3(viewMatrix)*position; gl_Position=projectionMatrix*vec4(v,1.0); }`;
const FRAG_SKYLINE = /* glsl */`
uniform vec3 uColor; uniform float uOpacity; void main(){ gl_FragColor=vec4(uColor*uOpacity,1.0); }`;

const VERT_MW = /* glsl */`
varying vec2 vNdc; void main(){ vNdc=position.xy; gl_Position=vec4(position.xy,0.0,1.0); }`;
const FRAG_MW = /* glsl */`
uniform sampler2D uTex; uniform vec2 uTan; uniform mat3 uCamRot; uniform mat3 uGal; uniform float uBright;
varying vec2 vNdc;
void main(){
  vec3 dir=normalize(uCamRot*vec3(vNdc*uTan,-1.0));
  vec3 g=uGal*dir;
  float l=atan(g.y,g.x); float b=asin(clamp(g.z,-1.0,1.0));
  vec2 uv=vec2(fract(0.5-l/6.2831853),0.5-b/3.1415927);
  vec3 c=texture2D(uTex,uv).rgb;
  c=max(c-vec3(0.004),0.0);
  gl_FragColor=vec4(c*uBright,1.0);
}`;

const VERT_BELT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec4 aOrb1; attribute vec4 aOrb2;
uniform float uDays; uniform vec3 uSunPos; uniform float uSize; uniform float uScale;
varying float vT;
void main(){
  float a=aOrb1.x,e=aOrb1.y,I=aOrb1.z,Om=aOrb1.w,w=aOrb2.x;
  float M=mod(aOrb2.y+aOrb2.z*uDays,6.2831853);
  float E=M+e*sin(M);
  for(int k=0;k<5;k++){ E=E-(E-e*sin(E)-M)/(1.0-e*cos(E)); }
  float xp=a*(cos(E)-e), yp=a*sqrt(1.0-e*e)*sin(E);
  float cw=cos(w),sw=sin(w),cO=cos(Om),sO=sin(Om),cI=cos(I),sI=sin(I);
  float x=(cw*cO-sw*sO*cI)*xp+(-sw*cO-cw*sO*cI)*yp;
  float y=(cw*sO+sw*cO*cI)*xp+(-sw*sO+cw*cO*cI)*yp;
  float z=(sw*sI)*xp+(cw*sI)*yp;
  vec3 wp=uSunPos+vec3(x,z,-y);
  gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.0);
  gl_PointSize=uSize*uScale*(0.7+0.6*aOrb2.w);
  vT=aOrb2.w;
  #include <logdepthbuf_vertex>
}`;
const FRAG_BELT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uColor; uniform vec3 uColor2; uniform float uOpacity; varying float vT;
void main(){
  #include <logdepthbuf_fragment>
  vec2 d=gl_PointCoord-0.5; float a=1.0-smoothstep(0.2,0.5,length(d));
  gl_FragColor=vec4(mix(uColor,uColor2,vT)*uOpacity*a,1.0);
}`;

const VERT_POINTS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aColor; attribute float aAlpha; attribute float aSize;
uniform float uScale; varying vec3 vC; varying float vA;
void main(){ vC=aColor; vA=aAlpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=aSize*uScale;
  #include <logdepthbuf_vertex>
}`;
const FRAG_POINTS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
varying vec3 vC; varying float vA;
void main(){
  #include <logdepthbuf_fragment>
  if(vA<=0.001) discard;
  vec2 d=gl_PointCoord-0.5; float r=length(d)*2.0; float a=exp(-r*r*3.0)*vA;
  gl_FragColor=vec4(vC*a,1.0);
}`;

const VERT_TAIL = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec4 aP;
uniform vec3 uNucleus, uAnti, uVel; uniform float uLen, uAct, uScale, uTime, uPxScale;
varying float vA; varying float vType;
void main(){
  float s=aP.x; float type=aP.w;
  vec3 axis=uAnti;
  vec3 base;
  if(type<0.5){ base=uNucleus+uAnti*s*uLen; }
  else { base=uNucleus+uAnti*s*uLen*0.75-uVel*s*s*uLen*0.32; axis=normalize(uAnti*0.75-uVel*0.64*s+1e-6); }
  vec3 u=normalize(cross(axis,abs(axis.y)<0.9?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0))); vec3 v=cross(axis,u);
  float spread=(type<0.5?0.018:0.075)*s*uLen+uLen*0.002;
  float wob=type<0.5?sin(s*40.0-uTime*0.6+aP.y*3.0)*0.3:0.0;
  vec3 wp=base+(u*(aP.y+wob)+v*aP.z)*spread;
  vec4 mv=viewMatrix*vec4(wp,1.0);
  gl_Position=projectionMatrix*mv;
  float px=spread*1.4/max(-mv.z,1.0)*uPxScale;
  float ps=clamp(px,2.0*uScale,48.0*uScale);
  gl_PointSize=ps;
  vA=uAct*pow(clamp(1.0-s,0.0,1.0),1.4)*(type<0.5?0.30:0.36)*min(1.0,6.0*uScale*uScale/(ps*ps)+0.02);
  vType=type;
  #include <logdepthbuf_vertex>
}`;
const FRAG_TAIL = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
varying float vA; varying float vType;
void main(){
  #include <logdepthbuf_fragment>
  vec2 d=gl_PointCoord-0.5; float a=exp(-dot(d,d)*12.0)*vA;
  vec3 c=vType<0.5?vec3(0.45,0.7,1.0):vec3(1.0,0.93,0.8);
  gl_FragColor=vec4(c*a,1.0);
}`;
