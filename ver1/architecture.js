// Shared construction geometry for SVG drafting and the final Three.js scene.
// Room dimensions are measured; both fillet radii are visual estimates.
export function createStudio(T, room) {
  const meshes=[], pickables=[], lines=[], annotations=[];
  const R=.72, C=.42;
  let currentId=null;
  function line(points,kind='outline',start=.24,duration=.15) { lines.push({points,kind,start,duration,id:currentId || (["surface","outline"].includes(kind)?"floor":null)}); }
  function text(point,label,start=.25) {annotations.push({point,label,start});}
  function mesh(g,id,color=0x263236,edges=false) {
    const m=new T.Mesh(g,new T.MeshStandardMaterial({color,roughness:.82,side:T.DoubleSide}));
    m.userData.id=id; room.add(m);meshes.push(m);if(id)pickables.push(m);
    if(edges)m.add(new T.LineSegments(new T.EdgesGeometry(g),new T.LineBasicMaterial({color:0xb9c8bf,transparent:true,opacity:.35})));
    return m;
  }
  function box(size,pos,id,start=.5,color=0x52615c) {
    const previousId=currentId;currentId=id;
    const g=new T.BoxGeometry(...size),m=mesh(g,id,color,true);m.position.set(...pos);
    const a=new T.EdgesGeometry(g).attributes.position;
    for(let i=0;i<a.count;i+=2)line([0,1].map(j=>[a.getX(i+j)+pos[0],a.getY(i+j)+pos[1],a.getZ(i+j)+pos[2]]),'equipment',start+(i%8)*.004,.075);
    currentId=previousId;return m;
  }
  function circle(center,r,plane,kind,start,duration=.13){const pts=[];for(let i=0;i<=64;i++){const a=i/64*Math.PI*2,u=Math.cos(a)*r,v=Math.sin(a)*r;pts.push(plane==='xz'?[center[0]+u,center[1],center[2]+v]:plane==='xy'?[center[0]+u,center[1]+v,center[2]]:[center[0],center[1]+u,center[2]+v]);}line(pts,kind,start,duration);}
  // Continuous U-shaped wall with tangent quarter-circle corners.
  const contour=[];
  function point(x,z,nx,nz){contour.push({x,z,nx,nz});}
  for(let i=0;i<=18;i++)point(-3.6,2-(4-R)*i/18,1,0);
  for(let i=1;i<=24;i++){const a=Math.PI+i/24*Math.PI/2;point(-3.6+R+R*Math.cos(a),-2+R+R*Math.sin(a),-Math.cos(a),-Math.sin(a));}
  for(let i=1;i<=32;i++)point(-3.6+R+(7.2-2*R)*i/32,-2,0,1);
  for(let i=1;i<=24;i++){const a=-Math.PI/2+i/24*Math.PI/2;point(3.6-R+R*Math.cos(a),-2+R+R*Math.sin(a),-Math.cos(a),-Math.sin(a));}
  for(let i=1;i<=18;i++)point(3.6,-2+R+(4-R)*i/18,-1,0);
  const surface=(q,y)=>{const offset=y<C?C-Math.sqrt(Math.max(0,C*C-(y-C)**2)):0;return[q.x+q.nx*offset,y,q.z+q.nz*offset];};
  const heights=Array.from({length:17},(_,i)=>C*(1-Math.cos(i/16*Math.PI/2))).concat([.7,1,1.4,1.8,2.2,2.6,3,3.4,3.7,4]);
  const vertices=[],indices=[];
  for(const y of heights)for(const q of contour)vertices.push(...surface(q,y));
  const n=contour.length;
  for(let j=0;j<heights.length-1;j++)for(let i=0;i<n-1;i++){const a=j*n+i,b=a+n;indices.push(a,b,a+1,b,b+1,a+1);}
  const shell=new T.BufferGeometry();shell.setAttribute('position',new T.Float32BufferAttribute(vertices,3));shell.setIndex(indices);shell.computeVertexNormals();mesh(shell,'floor',0x243035);
  const floorPts=contour.map(q=>new T.Vector2(...[surface(q,0)[0],surface(q,0)[2]]));
  const faces=T.ShapeUtils.triangulateShape(floorPts,[]),floorG=new T.BufferGeometry();floorG.setAttribute('position',new T.Float32BufferAttribute(floorPts.flatMap(q=>[q.x,0,q.y]),3));floorG.setIndex(faces.flat());floorG.computeVertexNormals();mesh(floorG,'floor',0x1e292d);
  // Faint external drafting lattice establishes the isometric volume first.
  for(let i=0;i<=24;i++){const x=-4.8+i*.4;line([[x,-.025,-3.2],[x,-.025,3.2]],'grid',.01+i*.003,.11);}
  for(let i=0;i<=16;i++){const z=-3.2+i*.4;line([[-4.8,-.025,z],[4.8,-.025,z]],'grid',.055+i*.003,.11);}
  line([[-4.9,0,0],[4.9,0,0]],'axis',.02,.18);line([[0,0,3.3],[0,0,-3.3]],'axis',.04,.18);line([[0,0,-2],[0,4.5,-2]],'axis',.06,.18);
  // Circular construction guides, center marks and tangent witness lines.
  for(const sign of [-1,1]){
    const x=sign*(3.6-R),z=-2+R;
    for(const y of [0,4]){
      circle([x,y,z],R,'xz','guide',.13,.16);
      circle([x,y,z],R-C,'xz','guide',.16,.16);
      line([[x-R-.22,y,z],[x+R+.22,y,z]],'guide',.14,.13);
      line([[x,y,z-R-.22],[x,y,z+R+.22]],'guide',.15,.13);
      line([[x,y,z],[sign*3.6,y,z]],'dimension',.19,.12);
    }
    // Circular floor-wall fillet construction seen from the open side.
    circle([sign*(3.6-C),C,1.7],C,'xy','guide',.19,.16);
    text([x,4.2,z],'TANGENT / R*',.27);
  }
  for(const [j,y] of [0,.06,.16,.3,C,.8,1.2,1.6,2,2.4,2.8,3.2,3.6,4].entries())line(contour.map(q=>surface(q,y)),y===0||y===4?'outline':'surface',.25+j*.005,.19);
  for(let i=0;i<n;i+=4)line(heights.map(y=>surface(contour[i],y)),i===0||i>=n-4?'outline':'surface',.3+i/n*.09,.15);
  line([surface(contour[0],0),surface(contour[n-1],0)],'outline',.28,.18);
  // Dimension strings and registration ticks remain distinct from the geometry.
  function dimension(a,b,label,anchor){line([a,b],'dimension',.34,.14);for(const q of [a,b])line([[q[0]-.08,q[1]-.08,q[2]-.08],[q[0]+.08,q[1]+.08,q[2]+.08]],'dimension',.36,.08);text(anchor,label,.38);}
  dimension([-3.6,0,2.7],[3.6,0,2.7],'7 200 mm',[0,0,2.9]);
  dimension([-4.1,0,2],[-4.1,0,-2],'4 000 mm',[-4.3,0,0]);
  dimension([-4.1,0,-2],[-4.1,4,-2],'4 000 mm',[-4.3,2,-2]);
  for(const x of [-3.6,3.6])line([[x,0,2],[x,0,2.9]],'guide',.32,.13);
  for(const y of [0,4])line([[-3.6,y,-2],[-4.35,y,-2]],'guide',.32,.13);
  text([0,4.42,-2],'HORIZON / CYCLORAMA',.46);
  text([0,0,3.2],'R*  CURVATURE STUDY',.38);
  // Ceiling tube grid, collars, suspension stems and barn-door panel lights.
  for(const [i,z] of [-1.3,0,1.3].entries())box([7.1,.045,.045],[0,3.94,z],null,.43+i*.012);
  for(const [i,x] of [-2.7,-.9,.9,2.7].entries()){
    box([.045,.045,3.7],[x,3.97,0],null,.45+i*.012);
    for(const z of [-1.3,0,1.3])box([.1,.085,.1],[x,3.94,z],null,.49);
    for(const z of [-1.15,.85]){
      currentId="lighting";
      const s=.51+i*.013+(z>0?.015:0);
      box([.03,.3,.03],[x,3.77,z],'lighting',s);
      box([.64,.08,.44],[x,3.56,z],'lighting',s+.02,0x59655d);
      box([.5,.012,.31],[x,3.514,z],'lighting',s+.03,0xc4cabb);
      for(const dx of [-.34,.34])box([.13,.025,.45],[x+dx,3.55,z],'lighting',s+.035,0x3a4847);
      for(const dz of [-.24,.24])box([.62,.025,.12],[x,3.55,z+dz],'lighting',s+.04,0x3a4847);
      // U-shaped mounting yoke and power cable.
      line([[x-.26,3.57,z],[x-.26,3.7,z],[x+.26,3.7,z],[x+.26,3.57,z]],'equipment',s+.035,.09);
      const cable=[];for(let j=0;j<=20;j++)cable.push([x+.08+Math.sin(j/20*Math.PI)*.13,3.58+j/20*.34,z+.1]);line(cable,'detail',s+.04,.1);
    }
  }
  currentId=null;
  for(const [i,[x,z]] of [[-1.7,.25],[1.7,.25],[0,1.15]].entries()){
    currentId="projector";
    const s=.61+i*.014;
    box([.055,.22,.055],[x,3.81,z],'projector',s);
    box([.66,.24,.48],[x,3.62,z],'projector',s+.01,0x45545a);
    box([.48,.02,.3],[x,3.75,z],'projector',s+.02);
    for(const r of [.083,.058,.037])circle([x+.16,3.62,z-.255],r,'xy','equipment',s+.025,.1);
    const lens=mesh(new T.CylinderGeometry(.078,.078,.065,24),'projector',0xd2e1d3,true);lens.rotation.x=Math.PI/2;lens.position.set(x+.16,3.62,z-.26);
    for(let j=0;j<6;j++)line([[x-.25+j*.038,3.55,z-.246],[x-.25+j*.038,3.69,z-.246]],'detail',s+.04+j*.002,.055);
    for(const dx of [-.27,.27])circle([x+dx,3.69,z-.247],.012,'xy','detail',s+.055,.04);
  }
  currentId="kinect";
  box([.46,.11,.12],[0,.9,2.45],'kinect',.68,0x70837b);
  box([.035,.85,.035],[0,.43,2.45],'kinect',.69);
  box([.32,.04,.22],[0,.02,2.45],'kinect',.7);
  for(const x of [-.16,0,.12])circle([x,.9,2.515],.023,'xy','equipment',.7,.07);
  return {meshes,pickables,lines,annotations,contour,surface,radii:{corner:R,cove:C}};
}
