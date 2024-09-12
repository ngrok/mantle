import{a as jt}from"/build/_shared/chunk-D36BACC2.js";import{c as It,d as Vt,e as Tt}from"/build/_shared/chunk-AN5AQZWP.js";import{a as lt}from"/build/_shared/chunk-AFVJBJ7U.js";import{a as rn}from"/build/_shared/chunk-YBB4Z6DW.js";import{b as Et}from"/build/_shared/chunk-5U3QKZBD.js";import{a as gt,b as zt}from"/build/_shared/chunk-SQBGVNFG.js";import{c as G}from"/build/_shared/chunk-QDA5CGMH.js";var W=G(gt(),1);var Yt=["top","right","bottom","left"];var _=Math.min,N=Math.max,ft=Math.round,ut=Math.floor,U=t=>({x:t,y:t}),sn={left:"right",right:"left",bottom:"top",top:"bottom"},cn={start:"end",end:"start"};function wt(t,e,n){return N(t,_(e,n))}function j(t,e){return typeof t=="function"?t(e):t}function Y(t){return t.split("-")[0]}function J(t){return t.split("-")[1]}function xt(t){return t==="x"?"y":"x"}function yt(t){return t==="y"?"height":"width"}function q(t){return["top","bottom"].includes(Y(t))?"y":"x"}function vt(t){return xt(q(t))}function Xt(t,e,n){n===void 0&&(n=!1);let o=J(t),i=vt(t),r=yt(i),s=i==="x"?o===(n?"end":"start")?"right":"left":o==="start"?"bottom":"top";return e.reference[r]>e.floating[r]&&(s=at(s)),[s,at(s)]}function Ut(t){let e=at(t);return[ht(t),e,ht(e)]}function ht(t){return t.replace(/start|end/g,e=>cn[e])}function ln(t,e,n){let o=["left","right"],i=["right","left"],r=["top","bottom"],s=["bottom","top"];switch(t){case"top":case"bottom":return n?e?i:o:e?o:i;case"left":case"right":return e?r:s;default:return[]}}function qt(t,e,n,o){let i=J(t),r=ln(Y(t),n==="start",o);return i&&(r=r.map(s=>s+"-"+i),e&&(r=r.concat(r.map(ht)))),r}function at(t){return t.replace(/left|right|bottom|top/g,e=>sn[e])}function an(t){return{top:0,right:0,bottom:0,left:0,...t}}function Lt(t){return typeof t!="number"?an(t):{top:t,right:t,bottom:t,left:t}}function Q(t){let{x:e,y:n,width:o,height:i}=t;return{width:o,height:i,top:n,left:e,right:e+o,bottom:n+i,x:e,y:n}}function Kt(t,e,n){let{reference:o,floating:i}=t,r=q(e),s=vt(e),l=yt(s),c=Y(e),a=r==="y",d=o.x+o.width/2-i.width/2,u=o.y+o.height/2-i.height/2,p=o[l]/2-i[l]/2,f;switch(c){case"top":f={x:d,y:o.y-i.height};break;case"bottom":f={x:d,y:o.y+o.height};break;case"right":f={x:o.x+o.width,y:u};break;case"left":f={x:o.x-i.width,y:u};break;default:f={x:o.x,y:o.y}}switch(J(e)){case"start":f[s]-=p*(n&&a?-1:1);break;case"end":f[s]+=p*(n&&a?-1:1);break}return f}var Jt=async(t,e,n)=>{let{placement:o="bottom",strategy:i="absolute",middleware:r=[],platform:s}=n,l=r.filter(Boolean),c=await(s.isRTL==null?void 0:s.isRTL(e)),a=await s.getElementRects({reference:t,floating:e,strategy:i}),{x:d,y:u}=Kt(a,o,c),p=o,f={},m=0;for(let g=0;g<l.length;g++){let{name:w,fn:h}=l[g],{x:v,y:R,data:x,reset:y}=await h({x:d,y:u,initialPlacement:o,placement:p,strategy:i,middlewareData:f,rects:a,platform:s,elements:{reference:t,floating:e}});d=v??d,u=R??u,f={...f,[w]:{...f[w],...x}},y&&m<=50&&(m++,typeof y=="object"&&(y.placement&&(p=y.placement),y.rects&&(a=y.rects===!0?await s.getElementRects({reference:t,floating:e,strategy:i}):y.rects),{x:d,y:u}=Kt(a,p,c)),g=-1)}return{x:d,y:u,placement:p,strategy:i,middlewareData:f}};async function it(t,e){var n;e===void 0&&(e={});let{x:o,y:i,platform:r,rects:s,elements:l,strategy:c}=t,{boundary:a="clippingAncestors",rootBoundary:d="viewport",elementContext:u="floating",altBoundary:p=!1,padding:f=0}=j(e,t),m=Lt(f),w=l[p?u==="floating"?"reference":"floating":u],h=Q(await r.getClippingRect({element:(n=await(r.isElement==null?void 0:r.isElement(w)))==null||n?w:w.contextElement||await(r.getDocumentElement==null?void 0:r.getDocumentElement(l.floating)),boundary:a,rootBoundary:d,strategy:c})),v=u==="floating"?{x:o,y:i,width:s.floating.width,height:s.floating.height}:s.reference,R=await(r.getOffsetParent==null?void 0:r.getOffsetParent(l.floating)),x=await(r.isElement==null?void 0:r.isElement(R))?await(r.getScale==null?void 0:r.getScale(R))||{x:1,y:1}:{x:1,y:1},y=Q(r.convertOffsetParentRelativeRectToViewportRelativeRect?await r.convertOffsetParentRelativeRectToViewportRelativeRect({elements:l,rect:v,offsetParent:R,strategy:c}):v);return{top:(h.top-y.top+m.top)/x.y,bottom:(y.bottom-h.bottom+m.bottom)/x.y,left:(h.left-y.left+m.left)/x.x,right:(y.right-h.right+m.right)/x.x}}var Qt=t=>({name:"arrow",options:t,async fn(e){let{x:n,y:o,placement:i,rects:r,platform:s,elements:l,middlewareData:c}=e,{element:a,padding:d=0}=j(t,e)||{};if(a==null)return{};let u=Lt(d),p={x:n,y:o},f=vt(i),m=yt(f),g=await s.getDimensions(a),w=f==="y",h=w?"top":"left",v=w?"bottom":"right",R=w?"clientHeight":"clientWidth",x=r.reference[m]+r.reference[f]-p[f]-r.floating[m],y=p[f]-r.reference[f],b=await(s.getOffsetParent==null?void 0:s.getOffsetParent(a)),S=b?b[R]:0;(!S||!await(s.isElement==null?void 0:s.isElement(b)))&&(S=l.floating[R]||r.floating[m]);let D=x/2-y/2,k=S/2-g[m]/2-1,T=_(u[h],k),M=_(u[v],k),$=T,F=S-g[m]-M,P=S/2-g[m]/2+D,L=wt($,P,F),B=!c.arrow&&J(i)!=null&&P!==L&&r.reference[m]/2-(P<$?T:M)-g[m]/2<0,A=B?P<$?P-$:P-F:0;return{[f]:p[f]+A,data:{[f]:L,centerOffset:P-L-A,...B&&{alignmentOffset:A}},reset:B}}});var te=function(t){return t===void 0&&(t={}),{name:"flip",options:t,async fn(e){var n,o;let{placement:i,middlewareData:r,rects:s,initialPlacement:l,platform:c,elements:a}=e,{mainAxis:d=!0,crossAxis:u=!0,fallbackPlacements:p,fallbackStrategy:f="bestFit",fallbackAxisSideDirection:m="none",flipAlignment:g=!0,...w}=j(t,e);if((n=r.arrow)!=null&&n.alignmentOffset)return{};let h=Y(i),v=q(l),R=Y(l)===l,x=await(c.isRTL==null?void 0:c.isRTL(a.floating)),y=p||(R||!g?[at(l)]:Ut(l)),b=m!=="none";!p&&b&&y.push(...qt(l,g,m,x));let S=[l,...y],D=await it(e,w),k=[],T=((o=r.flip)==null?void 0:o.overflows)||[];if(d&&k.push(D[h]),u){let P=Xt(i,s,x);k.push(D[P[0]],D[P[1]])}if(T=[...T,{placement:i,overflows:k}],!k.every(P=>P<=0)){var M,$;let P=(((M=r.flip)==null?void 0:M.index)||0)+1,L=S[P];if(L)return{data:{index:P,overflows:T},reset:{placement:L}};let B=($=T.filter(A=>A.overflows[0]<=0).sort((A,O)=>A.overflows[1]-O.overflows[1])[0])==null?void 0:$.placement;if(!B)switch(f){case"bestFit":{var F;let A=(F=T.filter(O=>{if(b){let E=q(O.placement);return E===v||E==="y"}return!0}).map(O=>[O.placement,O.overflows.filter(E=>E>0).reduce((E,St)=>E+St,0)]).sort((O,E)=>O[1]-E[1])[0])==null?void 0:F[0];A&&(B=A);break}case"initialPlacement":B=l;break}if(i!==B)return{reset:{placement:B}}}return{}}}};function Zt(t,e){return{top:t.top-e.height,right:t.right-e.width,bottom:t.bottom-e.height,left:t.left-e.width}}function Gt(t){return Yt.some(e=>t[e]>=0)}var ee=function(t){return t===void 0&&(t={}),{name:"hide",options:t,async fn(e){let{rects:n}=e,{strategy:o="referenceHidden",...i}=j(t,e);switch(o){case"referenceHidden":{let r=await it(e,{...i,elementContext:"reference"}),s=Zt(r,n.reference);return{data:{referenceHiddenOffsets:s,referenceHidden:Gt(s)}}}case"escaped":{let r=await it(e,{...i,altBoundary:!0}),s=Zt(r,n.floating);return{data:{escapedOffsets:s,escaped:Gt(s)}}}default:return{}}}}};async function fn(t,e){let{placement:n,platform:o,elements:i}=t,r=await(o.isRTL==null?void 0:o.isRTL(i.floating)),s=Y(n),l=J(n),c=q(n)==="y",a=["left","top"].includes(s)?-1:1,d=r&&c?-1:1,u=j(e,t),{mainAxis:p,crossAxis:f,alignmentAxis:m}=typeof u=="number"?{mainAxis:u,crossAxis:0,alignmentAxis:null}:{mainAxis:0,crossAxis:0,alignmentAxis:null,...u};return l&&typeof m=="number"&&(f=l==="end"?m*-1:m),c?{x:f*d,y:p*a}:{x:p*a,y:f*d}}var ne=function(t){return t===void 0&&(t=0),{name:"offset",options:t,async fn(e){var n,o;let{x:i,y:r,placement:s,middlewareData:l}=e,c=await fn(e,t);return s===((n=l.offset)==null?void 0:n.placement)&&(o=l.arrow)!=null&&o.alignmentOffset?{}:{x:i+c.x,y:r+c.y,data:{...c,placement:s}}}}},oe=function(t){return t===void 0&&(t={}),{name:"shift",options:t,async fn(e){let{x:n,y:o,placement:i}=e,{mainAxis:r=!0,crossAxis:s=!1,limiter:l={fn:w=>{let{x:h,y:v}=w;return{x:h,y:v}}},...c}=j(t,e),a={x:n,y:o},d=await it(e,c),u=q(Y(i)),p=xt(u),f=a[p],m=a[u];if(r){let w=p==="y"?"top":"left",h=p==="y"?"bottom":"right",v=f+d[w],R=f-d[h];f=wt(v,f,R)}if(s){let w=u==="y"?"top":"left",h=u==="y"?"bottom":"right",v=m+d[w],R=m-d[h];m=wt(v,m,R)}let g=l.fn({...e,[p]:f,[u]:m});return{...g,data:{x:g.x-n,y:g.y-o}}}}},ie=function(t){return t===void 0&&(t={}),{options:t,fn(e){let{x:n,y:o,placement:i,rects:r,middlewareData:s}=e,{offset:l=0,mainAxis:c=!0,crossAxis:a=!0}=j(t,e),d={x:n,y:o},u=q(i),p=xt(u),f=d[p],m=d[u],g=j(l,e),w=typeof g=="number"?{mainAxis:g,crossAxis:0}:{mainAxis:0,crossAxis:0,...g};if(c){let R=p==="y"?"height":"width",x=r.reference[p]-r.floating[R]+w.mainAxis,y=r.reference[p]+r.reference[R]-w.mainAxis;f<x?f=x:f>y&&(f=y)}if(a){var h,v;let R=p==="y"?"width":"height",x=["top","left"].includes(Y(i)),y=r.reference[u]-r.floating[R]+(x&&((h=s.offset)==null?void 0:h[u])||0)+(x?0:w.crossAxis),b=r.reference[u]+r.reference[R]+(x?0:((v=s.offset)==null?void 0:v[u])||0)-(x?w.crossAxis:0);m<y?m=y:m>b&&(m=b)}return{[p]:f,[u]:m}}}},re=function(t){return t===void 0&&(t={}),{name:"size",options:t,async fn(e){let{placement:n,rects:o,platform:i,elements:r}=e,{apply:s=()=>{},...l}=j(t,e),c=await it(e,l),a=Y(n),d=J(n),u=q(n)==="y",{width:p,height:f}=o.floating,m,g;a==="top"||a==="bottom"?(m=a,g=d===(await(i.isRTL==null?void 0:i.isRTL(r.floating))?"start":"end")?"left":"right"):(g=a,m=d==="end"?"top":"bottom");let w=f-c.top-c.bottom,h=p-c.left-c.right,v=_(f-c[m],w),R=_(p-c[g],h),x=!e.middlewareData.shift,y=v,b=R;if(u?b=d||x?_(R,h):h:y=d||x?_(v,w):w,x&&!d){let D=N(c.left,0),k=N(c.right,0),T=N(c.top,0),M=N(c.bottom,0);u?b=p-2*(D!==0||k!==0?D+k:N(c.left,c.right)):y=f-2*(T!==0||M!==0?T+M:N(c.top,c.bottom))}await s({...e,availableWidth:b,availableHeight:y});let S=await i.getDimensions(r.floating);return p!==S.width||f!==S.height?{reset:{rects:!0}}:{}}}};function et(t){return ce(t)?(t.nodeName||"").toLowerCase():"#document"}function H(t){var e;return(t==null||(e=t.ownerDocument)==null?void 0:e.defaultView)||window}function X(t){var e;return(e=(ce(t)?t.ownerDocument:t.document)||window.document)==null?void 0:e.documentElement}function ce(t){return t instanceof Node||t instanceof H(t).Node}function z(t){return t instanceof Element||t instanceof H(t).Element}function V(t){return t instanceof HTMLElement||t instanceof H(t).HTMLElement}function se(t){return typeof ShadowRoot>"u"?!1:t instanceof ShadowRoot||t instanceof H(t).ShadowRoot}function rt(t){let{overflow:e,overflowX:n,overflowY:o,display:i}=I(t);return/auto|scroll|overlay|hidden|clip/.test(e+o+n)&&!["inline","contents"].includes(i)}function le(t){return["table","td","th"].includes(et(t))}function dt(t){return[":popover-open",":modal"].some(e=>{try{return t.matches(e)}catch{return!1}})}function Rt(t){let e=At(),n=z(t)?I(t):t;return n.transform!=="none"||n.perspective!=="none"||(n.containerType?n.containerType!=="normal":!1)||!e&&(n.backdropFilter?n.backdropFilter!=="none":!1)||!e&&(n.filter?n.filter!=="none":!1)||["transform","perspective","filter"].some(o=>(n.willChange||"").includes(o))||["paint","layout","strict","content"].some(o=>(n.contain||"").includes(o))}function ae(t){let e=K(t);for(;V(e)&&!nt(e);){if(Rt(e))return e;if(dt(e))return null;e=K(e)}return null}function At(){return typeof CSS>"u"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}function nt(t){return["html","body","#document"].includes(et(t))}function I(t){return H(t).getComputedStyle(t)}function mt(t){return z(t)?{scrollLeft:t.scrollLeft,scrollTop:t.scrollTop}:{scrollLeft:t.scrollX,scrollTop:t.scrollY}}function K(t){if(et(t)==="html")return t;let e=t.assignedSlot||t.parentNode||se(t)&&t.host||X(t);return se(e)?e.host:e}function fe(t){let e=K(t);return nt(e)?t.ownerDocument?t.ownerDocument.body:t.body:V(e)&&rt(e)?e:fe(e)}function tt(t,e,n){var o;e===void 0&&(e=[]),n===void 0&&(n=!0);let i=fe(t),r=i===((o=t.ownerDocument)==null?void 0:o.body),s=H(i);if(r){let l=bt(s);return e.concat(s,s.visualViewport||[],rt(i)?i:[],l&&n?tt(l):[])}return e.concat(i,tt(i,[],n))}function bt(t){return t.parent&&Object.getPrototypeOf(t.parent)?t.frameElement:null}function me(t){let e=I(t),n=parseFloat(e.width)||0,o=parseFloat(e.height)||0,i=V(t),r=i?t.offsetWidth:n,s=i?t.offsetHeight:o,l=ft(n)!==r||ft(o)!==s;return l&&(n=r,o=s),{width:n,height:o,$:l}}function Mt(t){return z(t)?t:t.contextElement}function st(t){let e=Mt(t);if(!V(e))return U(1);let n=e.getBoundingClientRect(),{width:o,height:i,$:r}=me(e),s=(r?ft(n.width):n.width)/o,l=(r?ft(n.height):n.height)/i;return(!s||!Number.isFinite(s))&&(s=1),(!l||!Number.isFinite(l))&&(l=1),{x:s,y:l}}var un=U(0);function pe(t){let e=H(t);return!At()||!e.visualViewport?un:{x:e.visualViewport.offsetLeft,y:e.visualViewport.offsetTop}}function dn(t,e,n){return e===void 0&&(e=!1),!n||e&&n!==H(t)?!1:e}function ot(t,e,n,o){e===void 0&&(e=!1),n===void 0&&(n=!1);let i=t.getBoundingClientRect(),r=Mt(t),s=U(1);e&&(o?z(o)&&(s=st(o)):s=st(t));let l=dn(r,n,o)?pe(r):U(0),c=(i.left+l.x)/s.x,a=(i.top+l.y)/s.y,d=i.width/s.x,u=i.height/s.y;if(r){let p=H(r),f=o&&z(o)?H(o):o,m=p,g=bt(m);for(;g&&o&&f!==m;){let w=st(g),h=g.getBoundingClientRect(),v=I(g),R=h.left+(g.clientLeft+parseFloat(v.paddingLeft))*w.x,x=h.top+(g.clientTop+parseFloat(v.paddingTop))*w.y;c*=w.x,a*=w.y,d*=w.x,u*=w.y,c+=R,a+=x,m=H(g),g=bt(m)}}return Q({width:d,height:u,x:c,y:a})}function mn(t){let{elements:e,rect:n,offsetParent:o,strategy:i}=t,r=i==="fixed",s=X(o),l=e?dt(e.floating):!1;if(o===s||l&&r)return n;let c={scrollLeft:0,scrollTop:0},a=U(1),d=U(0),u=V(o);if((u||!u&&!r)&&((et(o)!=="body"||rt(s))&&(c=mt(o)),V(o))){let p=ot(o);a=st(o),d.x=p.x+o.clientLeft,d.y=p.y+o.clientTop}return{width:n.width*a.x,height:n.height*a.y,x:n.x*a.x-c.scrollLeft*a.x+d.x,y:n.y*a.y-c.scrollTop*a.y+d.y}}function pn(t){return Array.from(t.getClientRects())}function ge(t){return ot(X(t)).left+mt(t).scrollLeft}function gn(t){let e=X(t),n=mt(t),o=t.ownerDocument.body,i=N(e.scrollWidth,e.clientWidth,o.scrollWidth,o.clientWidth),r=N(e.scrollHeight,e.clientHeight,o.scrollHeight,o.clientHeight),s=-n.scrollLeft+ge(t),l=-n.scrollTop;return I(o).direction==="rtl"&&(s+=N(e.clientWidth,o.clientWidth)-i),{width:i,height:r,x:s,y:l}}function hn(t,e){let n=H(t),o=X(t),i=n.visualViewport,r=o.clientWidth,s=o.clientHeight,l=0,c=0;if(i){r=i.width,s=i.height;let a=At();(!a||a&&e==="fixed")&&(l=i.offsetLeft,c=i.offsetTop)}return{width:r,height:s,x:l,y:c}}function wn(t,e){let n=ot(t,!0,e==="fixed"),o=n.top+t.clientTop,i=n.left+t.clientLeft,r=V(t)?st(t):U(1),s=t.clientWidth*r.x,l=t.clientHeight*r.y,c=i*r.x,a=o*r.y;return{width:s,height:l,x:c,y:a}}function ue(t,e,n){let o;if(e==="viewport")o=hn(t,n);else if(e==="document")o=gn(X(t));else if(z(e))o=wn(e,n);else{let i=pe(t);o={...e,x:e.x-i.x,y:e.y-i.y}}return Q(o)}function he(t,e){let n=K(t);return n===e||!z(n)||nt(n)?!1:I(n).position==="fixed"||he(n,e)}function xn(t,e){let n=e.get(t);if(n)return n;let o=tt(t,[],!1).filter(l=>z(l)&&et(l)!=="body"),i=null,r=I(t).position==="fixed",s=r?K(t):t;for(;z(s)&&!nt(s);){let l=I(s),c=Rt(s);!c&&l.position==="fixed"&&(i=null),(r?!c&&!i:!c&&l.position==="static"&&!!i&&["absolute","fixed"].includes(i.position)||rt(s)&&!c&&he(t,s))?o=o.filter(d=>d!==s):i=l,s=K(s)}return e.set(t,o),o}function yn(t){let{element:e,boundary:n,rootBoundary:o,strategy:i}=t,s=[...n==="clippingAncestors"?dt(e)?[]:xn(e,this._c):[].concat(n),o],l=s[0],c=s.reduce((a,d)=>{let u=ue(e,d,i);return a.top=N(u.top,a.top),a.right=_(u.right,a.right),a.bottom=_(u.bottom,a.bottom),a.left=N(u.left,a.left),a},ue(e,l,i));return{width:c.right-c.left,height:c.bottom-c.top,x:c.left,y:c.top}}function vn(t){let{width:e,height:n}=me(t);return{width:e,height:n}}function Rn(t,e,n){let o=V(e),i=X(e),r=n==="fixed",s=ot(t,!0,r,e),l={scrollLeft:0,scrollTop:0},c=U(0);if(o||!o&&!r)if((et(e)!=="body"||rt(i))&&(l=mt(e)),o){let u=ot(e,!0,r,e);c.x=u.x+e.clientLeft,c.y=u.y+e.clientTop}else i&&(c.x=ge(i));let a=s.left+l.scrollLeft-c.x,d=s.top+l.scrollTop-c.y;return{x:a,y:d,width:s.width,height:s.height}}function Dt(t){return I(t).position==="static"}function de(t,e){return!V(t)||I(t).position==="fixed"?null:e?e(t):t.offsetParent}function we(t,e){let n=H(t);if(dt(t))return n;if(!V(t)){let i=K(t);for(;i&&!nt(i);){if(z(i)&&!Dt(i))return i;i=K(i)}return n}let o=de(t,e);for(;o&&le(o)&&Dt(o);)o=de(o,e);return o&&nt(o)&&Dt(o)&&!Rt(o)?n:o||ae(t)||n}var An=async function(t){let e=this.getOffsetParent||we,n=this.getDimensions,o=await n(t.floating);return{reference:Rn(t.reference,await e(t.floating),t.strategy),floating:{x:0,y:0,width:o.width,height:o.height}}};function bn(t){return I(t).direction==="rtl"}var xe={convertOffsetParentRelativeRectToViewportRelativeRect:mn,getDocumentElement:X,getClippingRect:yn,getOffsetParent:we,getElementRects:An,getClientRects:pn,getDimensions:vn,getScale:st,isElement:z,isRTL:bn};function Pn(t,e){let n=null,o,i=X(t);function r(){var l;clearTimeout(o),(l=n)==null||l.disconnect(),n=null}function s(l,c){l===void 0&&(l=!1),c===void 0&&(c=1),r();let{left:a,top:d,width:u,height:p}=t.getBoundingClientRect();if(l||e(),!u||!p)return;let f=ut(d),m=ut(i.clientWidth-(a+u)),g=ut(i.clientHeight-(d+p)),w=ut(a),v={rootMargin:-f+"px "+-m+"px "+-g+"px "+-w+"px",threshold:N(0,_(1,c))||1},R=!0;function x(y){let b=y[0].intersectionRatio;if(b!==c){if(!R)return s();b?s(!1,b):o=setTimeout(()=>{s(!1,1e-7)},1e3)}R=!1}try{n=new IntersectionObserver(x,{...v,root:i.ownerDocument})}catch{n=new IntersectionObserver(x,v)}n.observe(t)}return s(!0),r}function $t(t,e,n,o){o===void 0&&(o={});let{ancestorScroll:i=!0,ancestorResize:r=!0,elementResize:s=typeof ResizeObserver=="function",layoutShift:l=typeof IntersectionObserver=="function",animationFrame:c=!1}=o,a=Mt(t),d=i||r?[...a?tt(a):[],...tt(e)]:[];d.forEach(h=>{i&&h.addEventListener("scroll",n,{passive:!0}),r&&h.addEventListener("resize",n)});let u=a&&l?Pn(a,n):null,p=-1,f=null;s&&(f=new ResizeObserver(h=>{let[v]=h;v&&v.target===a&&f&&(f.unobserve(e),cancelAnimationFrame(p),p=requestAnimationFrame(()=>{var R;(R=f)==null||R.observe(e)})),n()}),a&&!c&&f.observe(a),f.observe(e));let m,g=c?ot(t):null;c&&w();function w(){let h=ot(t);g&&(h.x!==g.x||h.y!==g.y||h.width!==g.width||h.height!==g.height)&&n(),g=h,m=requestAnimationFrame(w)}return n(),()=>{var h;d.forEach(v=>{i&&v.removeEventListener("scroll",n),r&&v.removeEventListener("resize",n)}),u?.(),(h=f)==null||h.disconnect(),f=null,c&&cancelAnimationFrame(m)}}var ye=ne;var ve=oe,Re=te,Ae=re,be=ee,Nt=Qt;var Pe=ie,kt=(t,e,n)=>{let o=new Map,i={platform:xe,...n},r={...i.platform,_c:o};return Jt(t,e,{...i,platform:r})};var C=G(gt(),1),Ct=G(gt(),1),Se=G(rn(),1),Pt=typeof document<"u"?Ct.useLayoutEffect:Ct.useEffect;function Ot(t,e){if(t===e)return!0;if(typeof t!=typeof e)return!1;if(typeof t=="function"&&t.toString()===e.toString())return!0;let n,o,i;if(t&&e&&typeof t=="object"){if(Array.isArray(t)){if(n=t.length,n!==e.length)return!1;for(o=n;o--!==0;)if(!Ot(t[o],e[o]))return!1;return!0}if(i=Object.keys(t),n=i.length,n!==Object.keys(e).length)return!1;for(o=n;o--!==0;)if(!{}.hasOwnProperty.call(e,i[o]))return!1;for(o=n;o--!==0;){let r=i[o];if(!(r==="_owner"&&t.$$typeof)&&!Ot(t[r],e[r]))return!1}return!0}return t!==t&&e!==e}function Ee(t){return typeof window>"u"?1:(t.ownerDocument.defaultView||window).devicePixelRatio||1}function Oe(t,e){let n=Ee(t);return Math.round(e*n)/n}function Ce(t){let e=C.useRef(t);return Pt(()=>{e.current=t}),e}function Te(t){t===void 0&&(t={});let{placement:e="bottom",strategy:n="absolute",middleware:o=[],platform:i,elements:{reference:r,floating:s}={},transform:l=!0,whileElementsMounted:c,open:a}=t,[d,u]=C.useState({x:0,y:0,strategy:n,placement:e,middlewareData:{},isPositioned:!1}),[p,f]=C.useState(o);Ot(p,o)||f(o);let[m,g]=C.useState(null),[w,h]=C.useState(null),v=C.useCallback(A=>{A!==b.current&&(b.current=A,g(A))},[]),R=C.useCallback(A=>{A!==S.current&&(S.current=A,h(A))},[]),x=r||m,y=s||w,b=C.useRef(null),S=C.useRef(null),D=C.useRef(d),k=c!=null,T=Ce(c),M=Ce(i),$=C.useCallback(()=>{if(!b.current||!S.current)return;let A={placement:e,strategy:n,middleware:p};M.current&&(A.platform=M.current),kt(b.current,S.current,A).then(O=>{let E={...O,isPositioned:!0};F.current&&!Ot(D.current,E)&&(D.current=E,Se.flushSync(()=>{u(E)}))})},[p,e,n,M]);Pt(()=>{a===!1&&D.current.isPositioned&&(D.current.isPositioned=!1,u(A=>({...A,isPositioned:!1})))},[a]);let F=C.useRef(!1);Pt(()=>(F.current=!0,()=>{F.current=!1}),[]),Pt(()=>{if(x&&(b.current=x),y&&(S.current=y),x&&y){if(T.current)return T.current(x,y,$);$()}},[x,y,$,T,k]);let P=C.useMemo(()=>({reference:b,floating:S,setReference:v,setFloating:R}),[v,R]),L=C.useMemo(()=>({reference:x,floating:y}),[x,y]),B=C.useMemo(()=>{let A={position:n,left:0,top:0};if(!L.floating)return A;let O=Oe(L.floating,d.x),E=Oe(L.floating,d.y);return l?{...A,transform:"translate("+O+"px, "+E+"px)",...Ee(L.floating)>=1.5&&{willChange:"transform"}}:{position:n,left:O,top:E}},[n,l,L.floating,d.x,d.y]);return C.useMemo(()=>({...d,update:$,refs:P,elements:L,floatingStyles:B}),[d,$,P,L,B])}var On=t=>{function e(n){return{}.hasOwnProperty.call(n,"current")}return{name:"arrow",options:t,fn(n){let{element:o,padding:i}=typeof t=="function"?t(n):t;return o&&e(o)?o.current!=null?Nt({element:o.current,padding:i}).fn(n):{}:o?Nt({element:o,padding:i}).fn(n):{}}}},Le=(t,e)=>({...ye(t),options:[t,e]}),De=(t,e)=>({...ve(t),options:[t,e]}),Me=(t,e)=>({...Pe(t),options:[t,e]}),$e=(t,e)=>({...Re(t),options:[t,e]}),Ne=(t,e)=>({...Ae(t),options:[t,e]});var ke=(t,e)=>({...be(t),options:[t,e]});var Fe=(t,e)=>({...On(t),options:[t,e]});var Be=G(gt(),1);var Ft=G(zt(),1),Cn="Arrow",He=Be.forwardRef((t,e)=>{let{children:n,width:o=10,height:i=5,...r}=t;return(0,Ft.jsx)(lt.svg,{...r,ref:e,width:o,height:i,viewBox:"0 0 30 10",preserveAspectRatio:"none",children:t.asChild?n:(0,Ft.jsx)("polygon",{points:"0,0 30,0 15,10"})})});He.displayName=Cn;var We=He;var Z=G(zt(),1);var Bt="Popper",[_e,so]=It(Bt),[En,ze]=_e(Bt),Ie=t=>{let{__scopePopper:e,children:n}=t,[o,i]=W.useState(null);return(0,Z.jsx)(En,{scope:e,anchor:o,onAnchorChange:i,children:n})};Ie.displayName=Bt;var Ve="PopperAnchor",je=W.forwardRef((t,e)=>{let{__scopePopper:n,virtualRef:o,...i}=t,r=ze(Ve,n),s=W.useRef(null),l=Et(e,s);return W.useEffect(()=>{r.onAnchorChange(o?.current||s.current)}),o?null:(0,Z.jsx)(lt.div,{...i,ref:l})});je.displayName=Ve;var Ht="PopperContent",[Tn,Ln]=_e(Ht),Ye=W.forwardRef((t,e)=>{let{__scopePopper:n,side:o="bottom",sideOffset:i=0,align:r="center",alignOffset:s=0,arrowPadding:l=0,avoidCollisions:c=!0,collisionBoundary:a=[],collisionPadding:d=0,sticky:u="partial",hideWhenDetached:p=!1,updatePositionStrategy:f="optimized",onPlaced:m,...g}=t,w=ze(Ht,n),[h,v]=W.useState(null),R=Et(e,ct=>v(ct)),[x,y]=W.useState(null),b=jt(x),S=b?.width??0,D=b?.height??0,k=o+(r!=="center"?"-"+r:""),T=typeof d=="number"?d:{top:0,right:0,bottom:0,left:0,...d},M=Array.isArray(a)?a:[a],$=M.length>0,F={padding:T,boundary:M.filter(Mn),altBoundary:$},{refs:P,floatingStyles:L,placement:B,isPositioned:A,middlewareData:O}=Te({strategy:"fixed",placement:k,whileElementsMounted:(...ct)=>$t(...ct,{animationFrame:f==="always"}),elements:{reference:w.anchor},middleware:[Le({mainAxis:i+D,alignmentAxis:s}),c&&De({mainAxis:!0,crossAxis:!1,limiter:u==="partial"?Me():void 0,...F}),c&&$e({...F}),Ne({...F,apply:({elements:ct,rects:_t,availableWidth:tn,availableHeight:en})=>{let{width:nn,height:on}=_t.reference,pt=ct.floating.style;pt.setProperty("--radix-popper-available-width",`${tn}px`),pt.setProperty("--radix-popper-available-height",`${en}px`),pt.setProperty("--radix-popper-anchor-width",`${nn}px`),pt.setProperty("--radix-popper-anchor-height",`${on}px`)}}),x&&Fe({element:x,padding:l}),$n({arrowWidth:S,arrowHeight:D}),p&&ke({strategy:"referenceHidden",...F})]}),[E,St]=qe(B),Wt=Vt(m);Tt(()=>{A&&Wt?.()},[A,Wt]);let Ke=O.arrow?.x,Ze=O.arrow?.y,Ge=O.arrow?.centerOffset!==0,[Je,Qe]=W.useState();return Tt(()=>{h&&Qe(window.getComputedStyle(h).zIndex)},[h]),(0,Z.jsx)("div",{ref:P.setFloating,"data-radix-popper-content-wrapper":"",style:{...L,transform:A?L.transform:"translate(0, -200%)",minWidth:"max-content",zIndex:Je,["--radix-popper-transform-origin"]:[O.transformOrigin?.x,O.transformOrigin?.y].join(" "),...O.hide?.referenceHidden&&{visibility:"hidden",pointerEvents:"none"}},dir:t.dir,children:(0,Z.jsx)(Tn,{scope:n,placedSide:E,onArrowChange:y,arrowX:Ke,arrowY:Ze,shouldHideArrow:Ge,children:(0,Z.jsx)(lt.div,{"data-side":E,"data-align":St,...g,ref:R,style:{...g.style,animation:A?void 0:"none"}})})})});Ye.displayName=Ht;var Xe="PopperArrow",Dn={top:"bottom",right:"left",bottom:"top",left:"right"},Ue=W.forwardRef(function(e,n){let{__scopePopper:o,...i}=e,r=Ln(Xe,o),s=Dn[r.placedSide];return(0,Z.jsx)("span",{ref:r.onArrowChange,style:{position:"absolute",left:r.arrowX,top:r.arrowY,[s]:0,transformOrigin:{top:"",right:"0 0",bottom:"center 0",left:"100% 0"}[r.placedSide],transform:{top:"translateY(100%)",right:"translateY(50%) rotate(90deg) translateX(-50%)",bottom:"rotate(180deg)",left:"translateY(50%) rotate(-90deg) translateX(50%)"}[r.placedSide],visibility:r.shouldHideArrow?"hidden":void 0},children:(0,Z.jsx)(We,{...i,ref:n,style:{...i.style,display:"block"}})})});Ue.displayName=Xe;function Mn(t){return t!==null}var $n=t=>({name:"transformOrigin",options:t,fn(e){let{placement:n,rects:o,middlewareData:i}=e,s=i.arrow?.centerOffset!==0,l=s?0:t.arrowWidth,c=s?0:t.arrowHeight,[a,d]=qe(n),u={start:"0%",center:"50%",end:"100%"}[d],p=(i.arrow?.x??0)+l/2,f=(i.arrow?.y??0)+c/2,m="",g="";return a==="bottom"?(m=s?u:`${p}px`,g=`${-c}px`):a==="top"?(m=s?u:`${p}px`,g=`${o.floating.height+c}px`):a==="right"?(m=`${-c}px`,g=s?u:`${f}px`):a==="left"&&(m=`${o.floating.width+c}px`,g=s?u:`${f}px`),{data:{x:m,y:g}}}});function qe(t){let[e,n="center"]=t.split("-");return[e,n]}var co=Ie,lo=je,ao=Ye,fo=Ue;export{so as a,co as b,lo as c,ao as d,fo as e};
