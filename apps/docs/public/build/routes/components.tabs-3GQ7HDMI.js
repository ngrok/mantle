import{a as D,b as le,c as ie}from"/build/_shared/chunk-3JYITFQH.js";import{a as T}from"/build/_shared/chunk-XBHCEYFL.js";import{a as k,b as I,c as R,d as H,e as S}from"/build/_shared/chunk-M7TSVJTU.js";import{b as ee}from"/build/_shared/chunk-SMSJSCZJ.js";import"/build/_shared/chunk-URNZPFSF.js";import{a as V,c as Z}from"/build/_shared/chunk-E2EIXG5P.js";import"/build/_shared/chunk-MJO5TXUY.js";import"/build/_shared/chunk-V6NRL2B2.js";import"/build/_shared/chunk-2SMIENYH.js";import{c as P}from"/build/_shared/chunk-3YZGYUY3.js";import"/build/_shared/chunk-LD7P7WUX.js";import"/build/_shared/chunk-AFUBJ33G.js";import"/build/_shared/chunk-UEOFND7X.js";import"/build/_shared/chunk-F4CGZL4B.js";import{a as W,b as X}from"/build/_shared/chunk-B65FA2P7.js";import{a as O,c as Q,f as Y}from"/build/_shared/chunk-AN5AQZWP.js";import{a as M}from"/build/_shared/chunk-AFVJBJ7U.js";import"/build/_shared/chunk-YBB4Z6DW.js";import{a as ne}from"/build/_shared/chunk-FSLJRMMD.js";import{c as ae,d as te,e as re,h as oe,j as se}from"/build/_shared/chunk-U623FORG.js";import"/build/_shared/chunk-WWFNUYL5.js";import"/build/_shared/chunk-UYLQA7CX.js";import"/build/_shared/chunk-5U3QKZBD.js";import{b as j}from"/build/_shared/chunk-3YTQ7E44.js";import{b as J,d as A}from"/build/_shared/chunk-I4CY5NX7.js";import{a as x,b as L}from"/build/_shared/chunk-SQBGVNFG.js";import{c as m}from"/build/_shared/chunk-QDA5CGMH.js";var f=m(x(),1);var v=m(L(),1),G="Tabs",[Pe,ta]=Q(G,[D]),de=D(),[Ve,U]=Pe(G),ce=f.forwardRef((t,a)=>{let{__scopeTabs:r,value:s,onValueChange:i,defaultValue:g,orientation:d="horizontal",dir:h,activationMode:B="automatic",...E}=t,u=ee(h),[c,N]=Y({prop:s,onChange:i,defaultProp:g});return(0,v.jsx)(Ve,{scope:r,baseId:W(),value:c,onValueChange:N,orientation:d,dir:u,activationMode:B,children:(0,v.jsx)(M.div,{dir:u,"data-orientation":d,...E,ref:a})})});ce.displayName=G;var ue="TabsList",me=f.forwardRef((t,a)=>{let{__scopeTabs:r,loop:s=!0,...i}=t,g=U(ue,r),d=de(r);return(0,v.jsx)(le,{asChild:!0,...d,orientation:g.orientation,dir:g.dir,loop:s,children:(0,v.jsx)(M.div,{role:"tablist","aria-orientation":g.orientation,...i,ref:a})})});me.displayName=ue;var be="TabsTrigger",pe=f.forwardRef((t,a)=>{let{__scopeTabs:r,value:s,disabled:i=!1,...g}=t,d=U(be,r),h=de(r),B=ve(d.baseId,s),E=fe(d.baseId,s),u=s===d.value;return(0,v.jsx)(ie,{asChild:!0,...h,focusable:!i,active:u,children:(0,v.jsx)(M.button,{type:"button",role:"tab","aria-selected":u,"aria-controls":E,"data-state":u?"active":"inactive","data-disabled":i?"":void 0,disabled:i,id:B,...g,ref:a,onMouseDown:O(t.onMouseDown,c=>{!i&&c.button===0&&c.ctrlKey===!1?d.onValueChange(s):c.preventDefault()}),onKeyDown:O(t.onKeyDown,c=>{[" ","Enter"].includes(c.key)&&d.onValueChange(s)}),onFocus:O(t.onFocus,()=>{let c=d.activationMode!=="manual";!u&&!i&&c&&d.onValueChange(s)})})})});pe.displayName=be;var ge="TabsContent",Te=f.forwardRef((t,a)=>{let{__scopeTabs:r,value:s,forceMount:i,children:g,...d}=t,h=U(ge,r),B=ve(h.baseId,s),E=fe(h.baseId,s),u=s===h.value,c=f.useRef(u);return f.useEffect(()=>{let N=requestAnimationFrame(()=>c.current=!1);return()=>cancelAnimationFrame(N)},[]),(0,v.jsx)(X,{present:i||u,children:({present:N})=>(0,v.jsx)(M.div,{"data-state":u?"active":"inactive","data-orientation":h.orientation,role:"tabpanel","aria-labelledby":B,hidden:!N,id:E,tabIndex:0,...d,ref:a,style:{...t.style,animationDuration:c.current?"0s":void 0},children:N&&g})})});Te.displayName=ge;function ve(t,a){return`${t}-trigger-${a}`}function fe(t,a){return`${t}-content-${a}`}var Ce=ce,he=me,ye=pe,we=Te;var b=m(x(),1),C=m(L(),1),$=(0,b.createContext)({orientation:"horizontal"}),y=(0,b.forwardRef)(({className:t,children:a,orientation:r="horizontal",...s},i)=>(0,C.jsx)(Ce,{className:A("flex gap-4",r==="horizontal"?"flex-col":"flex-row",t),orientation:r,ref:i,...s,children:(0,C.jsx)($.Provider,{value:{orientation:r},children:a})}));y.displayName="Tabs";var w=(0,b.forwardRef)(({className:t,...a},r)=>{let s=(0,b.useContext)($);return(0,C.jsx)(he,{"aria-orientation":s.orientation,className:A("flex border-gray-200",s.orientation==="horizontal"?"flex-row items-center gap-6 border-b":"flex-col items-end gap-[0.875rem] self-stretch border-r",t),ref:r,...a})});w.displayName="TabsList";var o=(0,b.forwardRef)(({children:t,className:a,...r},s)=>{let i=(0,b.useContext)($);return(0,C.jsxs)(ye,{className:A("group/tab-trigger relative flex cursor-pointer items-center gap-1 whitespace-nowrap py-3 text-sm font-medium text-gray-600",i.orientation==="horizontal"&&"rounded-tl-md rounded-tr-md",i.orientation==="vertical"&&"rounded-bl-md rounded-tl-md pr-3","ring-focus-accent outline-none","disabled:cursor-default disabled:opacity-50","focus-visible:ring-4","[&>svg]:size-6 [&>svg]:shrink-0 [&>svg]:sm:size-5","not-disabled:hover:text-gray-900 not-disabled:hover:data-state-active:text-blue-600","data-state-active:text-blue-600",a),ref:s,...r,children:[(0,C.jsx)("span",{"aria-hidden":!0,className:J("z-1 group-data-state-active/tab-trigger:bg-blue-600 absolute",i.orientation==="horizontal"&&"-bottom-px left-0 right-0 h-[0.1875rem]",i.orientation==="vertical"&&"-right-px bottom-0 top-0 w-[0.1875rem]")}),t]})});o.displayName="TabsTrigger";var p=({className:t,children:a,...r})=>(0,C.jsx)("span",{className:A("rounded-full bg-gray-500/20 px-1.5 text-xs font-medium text-gray-600","group-data-state-active/tab-trigger:bg-blue-500/20 group-data-state-active/tab-trigger:text-blue-700 group-hover/tab-trigger:group-enabled/tab-trigger:group-data-state-active/tab-trigger:text-blue-700","group-hover/tab-trigger:group-enabled/tab-trigger:text-gray-700",t),...r,children:a}),F=(0,b.forwardRef)(({className:t,...a},r)=>(0,C.jsx)(we,{ref:r,className:A("focus-visible:ring-focus-accent outline-none focus-visible:ring-4",t),...a}));F.displayName="TabsContent";var z=m(x(),1);var n=m(x(),1),Ne=new Map([["bold",n.default.createElement(n.default.Fragment,null,n.default.createElement("path",{d:"M208,36H48A20,20,0,0,0,28,56v56c0,54.29,26.32,87.22,48.4,105.29,23.71,19.39,47.44,26,48.44,26.29a12.1,12.1,0,0,0,6.32,0c1-.28,24.73-6.9,48.44-26.29,22.08-18.07,48.4-51,48.4-105.29V56A20,20,0,0,0,208,36Zm-4,76c0,35.71-13.09,64.69-38.91,86.15A126.28,126.28,0,0,1,128,219.38a126.14,126.14,0,0,1-37.09-21.23C65.09,176.69,52,147.71,52,112V60H204ZM79.51,144.49a12,12,0,1,1,17-17L112,143l47.51-47.52a12,12,0,0,1,17,17l-56,56a12,12,0,0,1-17,0Z"}))],["duotone",n.default.createElement(n.default.Fragment,null,n.default.createElement("path",{d:"M216,56v56c0,96-88,120-88,120S40,208,40,112V56a8,8,0,0,1,8-8H208A8,8,0,0,1,216,56Z",opacity:"0.2"}),n.default.createElement("path",{d:"M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.26,47,25.53a8,8,0,0,0,4.2,0c1-.27,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0ZM82.34,141.66a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32l-56,56a8,8,0,0,1-11.32,0Z"}))],["fill",n.default.createElement(n.default.Fragment,null,n.default.createElement("path",{d:"M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.26,47,25.53a8,8,0,0,0,4.2,0c1-.27,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm-34.32,69.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z"}))],["light",n.default.createElement(n.default.Fragment,null,n.default.createElement("path",{d:"M208,42H48A14,14,0,0,0,34,56v56c0,51.94,25.12,83.4,46.2,100.64,22.73,18.6,45.27,24.89,46.22,25.15a6,6,0,0,0,3.16,0c.95-.26,23.49-6.55,46.22-25.15C196.88,195.4,222,163.94,222,112V56A14,14,0,0,0,208,42Zm2,70c0,37.76-13.94,68.39-41.44,91.06A131.17,131.17,0,0,1,128,225.72a130.94,130.94,0,0,1-40.56-22.66C59.94,180.39,46,149.76,46,112V56a2,2,0,0,1,2-2H208a2,2,0,0,1,2,2ZM172.24,99.76a6,6,0,0,1,0,8.48l-56,56a6,6,0,0,1-8.48,0l-24-24a6,6,0,0,1,8.48-8.48L112,151.51l51.76-51.75A6,6,0,0,1,172.24,99.76Z"}))],["regular",n.default.createElement(n.default.Fragment,null,n.default.createElement("path",{d:"M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.26,47,25.53a8,8,0,0,0,4.2,0c1-.27,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0ZM82.34,141.66a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32l-56,56a8,8,0,0,1-11.32,0Z"}))],["thin",n.default.createElement(n.default.Fragment,null,n.default.createElement("path",{d:"M208,44H48A12,12,0,0,0,36,56v56c0,51.16,24.73,82.12,45.47,99.1,22.4,18.32,44.55,24.5,45.48,24.76a4,4,0,0,0,2.1,0c.93-.26,23.08-6.44,45.48-24.76,20.74-17,45.47-47.94,45.47-99.1V56A12,12,0,0,0,208,44Zm4,68c0,38.44-14.23,69.63-42.29,92.71A132.45,132.45,0,0,1,128,227.82a132.23,132.23,0,0,1-41.71-23.11C58.23,181.63,44,150.44,44,112V56a4,4,0,0,1,4-4H208a4,4,0,0,1,4,4Zm-41.17-10.83a4,4,0,0,1,0,5.66l-56,56a4,4,0,0,1-5.66,0l-24-24a4,4,0,0,1,5.66-5.66L112,154.34l53.17-53.17A4,4,0,0,1,170.83,101.17Z"}))]]);var Ze=Object.defineProperty,ke=Object.defineProperties,Ie=Object.getOwnPropertyDescriptors,xe=Object.getOwnPropertySymbols,Re=Object.prototype.hasOwnProperty,He=Object.prototype.propertyIsEnumerable,Ae=(t,a,r)=>a in t?Ze(t,a,{enumerable:!0,configurable:!0,writable:!0,value:r}):t[a]=r,Se=(t,a)=>{for(var r in a||(a={}))Re.call(a,r)&&Ae(t,r,a[r]);if(xe)for(var r of xe(a))He.call(a,r)&&Ae(t,r,a[r]);return t},Le=(t,a)=>ke(t,Ie(a)),K=(0,z.forwardRef)((t,a)=>z.default.createElement(j,Le(Se({ref:a},t),{weights:Ne})));K.displayName="ShieldCheck";var _=m(x(),1);var l=m(x(),1),Fe=new Map([["bold",l.default.createElement(l.default.Fragment,null,l.default.createElement("path",{d:"M234.38,210a123.36,123.36,0,0,0-60.78-53.23,76,76,0,1,0-91.2,0A123.36,123.36,0,0,0,21.62,210a12,12,0,1,0,20.77,12c18.12-31.32,50.12-50,85.61-50s67.49,18.69,85.61,50a12,12,0,0,0,20.77-12ZM76,96a52,52,0,1,1,52,52A52.06,52.06,0,0,1,76,96Z"}))],["duotone",l.default.createElement(l.default.Fragment,null,l.default.createElement("path",{d:"M192,96a64,64,0,1,1-64-64A64,64,0,0,1,192,96Z",opacity:"0.2"}),l.default.createElement("path",{d:"M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"}))],["fill",l.default.createElement(l.default.Fragment,null,l.default.createElement("path",{d:"M230.93,220a8,8,0,0,1-6.93,4H32a8,8,0,0,1-6.92-12c15.23-26.33,38.7-45.21,66.09-54.16a72,72,0,1,1,73.66,0c27.39,8.95,50.86,27.83,66.09,54.16A8,8,0,0,1,230.93,220Z"}))],["light",l.default.createElement(l.default.Fragment,null,l.default.createElement("path",{d:"M229.19,213c-15.81-27.32-40.63-46.49-69.47-54.62a70,70,0,1,0-63.44,0C67.44,166.5,42.62,185.67,26.81,213a6,6,0,1,0,10.38,6C56.4,185.81,90.34,166,128,166s71.6,19.81,90.81,53a6,6,0,1,0,10.38-6ZM70,96a58,58,0,1,1,58,58A58.07,58.07,0,0,1,70,96Z"}))],["regular",l.default.createElement(l.default.Fragment,null,l.default.createElement("path",{d:"M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"}))],["thin",l.default.createElement(l.default.Fragment,null,l.default.createElement("path",{d:"M227.46,214c-16.52-28.56-43-48.06-73.68-55.09a68,68,0,1,0-51.56,0c-30.64,7-57.16,26.53-73.68,55.09a4,4,0,0,0,6.92,4C55,184.19,89.62,164,128,164s73,20.19,92.54,54a4,4,0,0,0,3.46,2,3.93,3.93,0,0,0,2-.54A4,4,0,0,0,227.46,214ZM68,96a60,60,0,1,1,60,60A60.07,60.07,0,0,1,68,96Z"}))]]);var Oe=Object.defineProperty,je=Object.defineProperties,ze=Object.getOwnPropertyDescriptors,Be=Object.getOwnPropertySymbols,_e=Object.prototype.hasOwnProperty,De=Object.prototype.propertyIsEnumerable,Ee=(t,a,r)=>a in t?Oe(t,a,{enumerable:!0,configurable:!0,writable:!0,value:r}):t[a]=r,Ge=(t,a)=>{for(var r in a||(a={}))_e.call(a,r)&&Ee(t,r,a[r]);if(Be)for(var r of Be(a))De.call(a,r)&&Ee(t,r,a[r]);return t},Ue=(t,a)=>je(t,ze(a)),q=(0,_.forwardRef)((t,a)=>_.default.createElement(j,Ue(Ge({ref:a},t),{weights:Fe})));q.displayName="User";var e=m(L(),1),$e=()=>[{title:"@ngrok/mantle \u2014 Tabs"},{name:"description",content:"mantle is ngrok's UI library and design system"}];function Me(){return(0,e.jsx)("div",{className:"space-y-16",children:(0,e.jsxs)("section",{className:"space-y-4",children:[(0,e.jsx)("h1",{className:"text-5xl font-medium",children:"Tabs"}),(0,e.jsx)("p",{className:"font-body text-body text-xl",children:"A set of layered sections of content\u2014known as tab panels\u2014that are displayed one at a time."}),(0,e.jsxs)("div",{children:[(0,e.jsxs)(ne,{className:"mt-4 grid gap-6",children:[(0,e.jsx)(y,{orientation:"horizontal",defaultValue:"tab-1",children:(0,e.jsxs)(w,{children:[(0,e.jsx)(o,{value:"tab-1",children:"Tab Title"}),(0,e.jsx)(o,{value:"tab-2",children:"Tab Title"}),(0,e.jsx)(o,{disabled:!0,value:"tab-3",children:"Tab Title"}),(0,e.jsx)(o,{value:"tab-4",children:"Tab Title"})]})}),(0,e.jsx)(y,{orientation:"horizontal",defaultValue:"tab-1",children:(0,e.jsxs)(w,{children:[(0,e.jsxs)(o,{value:"tab-1",children:[(0,e.jsx)(T,{}),"Tab Title"]}),(0,e.jsxs)(o,{value:"tab-2",children:[(0,e.jsx)(T,{}),"Tab Title"]}),(0,e.jsxs)(o,{disabled:!0,value:"tab-3",children:[(0,e.jsx)(T,{}),"Tab Title"]}),(0,e.jsxs)(o,{value:"tab-4",children:[(0,e.jsx)(T,{}),"Tab Title"]})]})}),(0,e.jsx)(y,{orientation:"horizontal",defaultValue:"tab-1",children:(0,e.jsxs)(w,{children:[(0,e.jsxs)(o,{value:"tab-1",children:["Tab Title",(0,e.jsx)(p,{children:"32"})]}),(0,e.jsxs)(o,{value:"tab-2",children:["Tab Title",(0,e.jsx)(p,{children:"32"})]}),(0,e.jsxs)(o,{disabled:!0,value:"tab-3",children:["Tab Title",(0,e.jsx)(p,{children:"32"})]}),(0,e.jsxs)(o,{value:"tab-4",children:["Tab Title",(0,e.jsx)(p,{children:"32"})]})]})}),(0,e.jsx)(y,{orientation:"horizontal",defaultValue:"tab-1",children:(0,e.jsxs)(w,{children:[(0,e.jsxs)(o,{value:"tab-1",children:[(0,e.jsx)(T,{}),"Tab Title",(0,e.jsx)(p,{children:"32"})]}),(0,e.jsxs)(o,{value:"tab-2",children:[(0,e.jsx)(T,{}),"Tab Title",(0,e.jsx)(p,{children:"32"})]}),(0,e.jsxs)(o,{disabled:!0,value:"tab-3",children:[(0,e.jsx)(T,{}),"Tab Title",(0,e.jsx)(p,{children:"32"})]}),(0,e.jsxs)(o,{value:"tab-4",children:[(0,e.jsx)(T,{}),"Tab Title",(0,e.jsx)(p,{children:"32"})]})]})}),(0,e.jsxs)(y,{orientation:"horizontal",defaultValue:"account",className:"w-[400px]",children:[(0,e.jsxs)(w,{children:[(0,e.jsxs)(o,{value:"account",children:[(0,e.jsx)(q,{}),"Account",(0,e.jsx)(p,{children:"2"})]}),(0,e.jsxs)(o,{value:"password",children:[(0,e.jsx)(K,{}),"Password"]})]}),(0,e.jsx)(F,{value:"account",children:(0,e.jsxs)(k,{children:[(0,e.jsxs)(H,{children:[(0,e.jsx)(S,{children:"Account"}),(0,e.jsx)("p",{className:"text-muted",children:"Make changes to your account here. Click save when you're done."})]}),(0,e.jsxs)(I,{className:"space-y-2",children:[(0,e.jsxs)("div",{className:"space-y-1",children:[(0,e.jsx)("label",{htmlFor:"name",children:"Name"}),(0,e.jsx)(V,{id:"name",defaultValue:"Cody Price"})]}),(0,e.jsxs)("div",{className:"space-y-1",children:[(0,e.jsx)("label",{htmlFor:"username",children:"Username"}),(0,e.jsx)(V,{id:"username",defaultValue:"@cody-dot-js"})]})]}),(0,e.jsx)(R,{children:(0,e.jsx)(P,{type:"button",children:"Save changes"})})]})}),(0,e.jsx)(F,{value:"password",children:(0,e.jsxs)(k,{children:[(0,e.jsxs)(H,{children:[(0,e.jsx)(S,{children:"Password"}),(0,e.jsx)("p",{className:"text-muted",children:"Change your password here. After saving, you'll be logged out."})]}),(0,e.jsxs)(I,{className:"space-y-2",children:[(0,e.jsxs)("div",{className:"space-y-1",children:[(0,e.jsx)("label",{htmlFor:"current",children:"Current password"}),(0,e.jsx)(Z,{id:"current"})]}),(0,e.jsxs)("div",{className:"space-y-1",children:[(0,e.jsx)("label",{htmlFor:"new",children:"New password"}),(0,e.jsx)(Z,{id:"new"})]})]}),(0,e.jsx)(R,{children:(0,e.jsx)(P,{type:"button",children:"Save password"})})]})})]}),(0,e.jsxs)(y,{orientation:"vertical",defaultValue:"account",className:"max-w-xl",children:[(0,e.jsxs)(w,{children:[(0,e.jsx)(o,{value:"account",children:"Account"}),(0,e.jsx)(o,{value:"password",children:"Password"}),(0,e.jsx)(o,{value:"disabled-tab",disabled:!0,children:"Disabled tab"})]}),(0,e.jsx)(F,{value:"account",children:(0,e.jsxs)(k,{children:[(0,e.jsxs)(H,{children:[(0,e.jsx)(S,{children:"Account"}),(0,e.jsx)("p",{className:"text-muted",children:"Make changes to your account here. Click save when you're done."})]}),(0,e.jsxs)(I,{className:"space-y-2",children:[(0,e.jsxs)("div",{className:"space-y-1",children:[(0,e.jsx)("label",{htmlFor:"name",children:"Name"}),(0,e.jsx)(V,{id:"name",defaultValue:"Cody Price"})]}),(0,e.jsxs)("div",{className:"space-y-1",children:[(0,e.jsx)("label",{htmlFor:"username",children:"Username"}),(0,e.jsx)(V,{id:"username",defaultValue:"@cody-dot-js"})]})]}),(0,e.jsx)(R,{children:(0,e.jsx)(P,{type:"button",children:"Save changes"})})]})}),(0,e.jsx)(F,{value:"password",children:(0,e.jsxs)(k,{children:[(0,e.jsxs)(H,{children:[(0,e.jsx)(S,{children:"Password"}),(0,e.jsx)("p",{className:"text-muted",children:"Change your password here. After saving, you'll be logged out."})]}),(0,e.jsxs)(I,{className:"space-y-2",children:[(0,e.jsxs)("div",{className:"space-y-1",children:[(0,e.jsx)("label",{htmlFor:"current",children:"Current password"}),(0,e.jsx)(Z,{id:"current"})]}),(0,e.jsxs)("div",{className:"space-y-1",children:[(0,e.jsx)("label",{htmlFor:"new",children:"New password"}),(0,e.jsx)(Z,{id:"new"})]})]}),(0,e.jsx)(R,{children:(0,e.jsx)(P,{type:"button",children:"Save password"})})]})})]})]}),(0,e.jsx)(ae,{className:"rounded-b-lg rounded-t-none",children:(0,e.jsxs)(te,{children:[(0,e.jsx)(oe,{}),(0,e.jsx)(re,{language:"tsx",value:se`
									import { Button } from "@ngrok/mantle/button";
									import { Card, CardBody, CardFooter, CardHeader, CardTitle } from "@ngrok/mantle/card";
									import { Input, PasswordInput } from "@ngrok/mantle/input";
									import { TabBadge, Tabs, TabsContent, TabsList, TabsTrigger } from "@ngrok/mantle/tabs";

									<Tabs orientation="horizontal" defaultValue="account" className="w-[400px]">
										<TabsList>
											<TabsTrigger value="account">
												<User />
												Account
												<TabBadge>2</TabBadge>
											</TabsTrigger>
											<TabsTrigger value="password">
												<ShieldCheck />
												Password
											</TabsTrigger>
										</TabsList>
										<TabsContent value="account">
											<Card>
												<CardHeader>
													<CardTitle>Account</CardTitle>
													<p className="text-muted">Make changes to your account here. Click save when you're done.</p>
												</CardHeader>
												<CardBody className="space-y-2">
													<div className="space-y-1">
														<label htmlFor="name">Name</label>
														<Input id="name" defaultValue="Cody Price" />
													</div>
													<div className="space-y-1">
														<label htmlFor="username">Username</label>
														<Input id="username" defaultValue="@cody-dot-js" />
													</div>
												</CardBody>
												<CardFooter>
													<Button type="button">Save changes</Button>
												</CardFooter>
											</Card>
										</TabsContent>
										<TabsContent value="password">
											<Card>
												<CardHeader>
													<CardTitle>Password</CardTitle>
													<p className="text-muted">Change your password here. After saving, you'll be logged out.</p>
												</CardHeader>
												<CardBody className="space-y-2">
													<div className="space-y-1">
														<label htmlFor="current">Current password</label>
														<PasswordInput id="current" />
													</div>
													<div className="space-y-1">
														<label htmlFor="new">New password</label>
														<PasswordInput id="new" />
													</div>
												</CardBody>
												<CardFooter>
													<Button type="button">Save password</Button>
												</CardFooter>
											</Card>
										</TabsContent>
									</Tabs>
								`})]})})]})]})})}export{Me as default,$e as meta};
